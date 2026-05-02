export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // ===== CORS preflight =====
    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: corsHeaders(),
      });
    }

    // ===== PUBLIC IMAGES =====
    if (url.pathname.startsWith("/images/")) {
      const key = url.pathname.slice(1);
      const cacheReq = new Request(url.toString(), request);

      const cached = await caches.default.match(cacheReq);
      if (cached) return withCors(cached);

      const obj = await env.R2_BUCKET.get(key);
      if (!obj) return new Response("Not found", { status: 404, headers: corsHeaders() });

      const resp = new Response(obj.body, {
        headers: {
          ...baseHeaders(key),
          "Cache-Control": "public, max-age=31536000, immutable",
          "X-Cache-Status": "MISS",
        },
      });

      ctx.waitUntil(caches.default.put(cacheReq, resp.clone()));
      return resp;
    }

    // ===== ONLY PROTECT VIDEOS =====
    if (!url.pathname.startsWith("/videos/")) {
      return new Response("OK", { status: 200, headers: corsHeaders() });
    }

    // ===== VERIFY TOKEN =====
    const token = url.searchParams.get("token");
    const auth = await verifyToken(token, env.STREAM_TOKEN_SECRET);

    if (!auth.ok) {
      return new Response("Unauthorized", { status: 401, headers: corsHeaders() });
    }

    const videoId = url.pathname.split("/")[2];
    if (videoId !== auth.videoId) {
      return new Response("Unauthorized", { status: 401, headers: corsHeaders() });
    }

    const key = url.pathname.slice(1);

    // ===== CACHE KEY (strip token) =====
    const cacheUrl = new URL(request.url);
    cacheUrl.searchParams.delete("token");
    const cacheReq = new Request(cacheUrl.toString(), request);

    // ===== CACHE HIT =====
    const cached = await caches.default.match(cacheReq);
    if (cached) {
      const headers = new Headers(cached.headers);
      // Restore CORS headers in case cached response lost them
      for (const [k, v] of Object.entries(corsHeaders())) headers.set(k, v);
      headers.set("X-Cache-Status", "HIT");
      return new Response(cached.body, { status: cached.status, headers });
    }

    // ===== PLAYLIST: rewrite segment URLs to include token =====
    if (key.endsWith(".m3u8")) {
      const obj = await env.R2_BUCKET.get(key);
      if (!obj) return new Response("Not found", { status: 404, headers: corsHeaders() });

      const text = await obj.text();
      const rewritten = rewritePlaylist(text, token);

      const resp = new Response(rewritten, {
        headers: {
          ...baseHeaders(key),
          "Cache-Control": "no-store",
          "X-Cache-Status": "MISS",
        },
      });
      return resp;
    }

    // ===== RANGE SUPPORT (for .ts segments) =====
    const head = await env.R2_BUCKET.head(key);
    if (!head) return new Response("Not found", { status: 404, headers: corsHeaders() });

    const range = request.headers.get("Range");

    if (range) {
      const r = parseRange(range, head.size);
      const obj = await env.R2_BUCKET.get(key, {
        range: { offset: r.start, length: r.end - r.start + 1 },
      });

      const resp = new Response(obj.body, {
        status: 206,
        headers: {
          ...baseHeaders(key),
          "Content-Range": `bytes ${r.start}-${r.end}/${head.size}`,
          "Content-Length": String(r.end - r.start + 1),
        },
      });
      return resp;
    }

    // ===== NORMAL FILE =====
    const obj = await env.R2_BUCKET.get(key);
    if (!obj) return new Response("Not found", { status: 404, headers: corsHeaders() });

    const extraHeaders = {};
    if (key.endsWith(".m4s") || key.endsWith(".ts") || key.endsWith("init.mp4")) {
      extraHeaders["Cache-Control"] = "public, max-age=31536000, immutable";
    }

    const resp = new Response(obj.body, {
      status: 200,
      headers: {
        ...baseHeaders(key),
        ...extraHeaders,
        "X-Cache-Status": "MISS",
      },
    });

    ctx.waitUntil(caches.default.put(cacheReq, resp.clone()));
    return resp;
  },
};

// ==========================
// HELPERS
// ==========================

function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET,HEAD,OPTIONS",
    "Access-Control-Allow-Headers": "Range,Authorization,Content-Type",
    "Access-Control-Expose-Headers":
      "Content-Length,Content-Range,Accept-Ranges,ETag,Content-Type",
  };
}

function baseHeaders(key) {
  return {
    "Content-Type": getContentType(key),
    "Accept-Ranges": "bytes",
    ...corsHeaders(),
  };
}

function withCors(response) {
  const headers = new Headers(response.headers);
  for (const [k, v] of Object.entries(corsHeaders())) headers.set(k, v);
  return new Response(response.body, { status: response.status, headers });
}

function getContentType(key) {
  if (key.endsWith(".m3u8")) return "application/vnd.apple.mpegurl";
  if (key.endsWith(".m4s")) return "video/iso.segment";
  if (key.endsWith(".ts")) return "video/mp2t";
  if (key.endsWith(".mp4")) return "video/mp4";
  return "application/octet-stream";
}

function rewritePlaylist(text, token) {
  return text
    .split("\n")
    .map((line) => {
      // Only rewrite non-comment, non-empty lines that look like segment/playlist references
      if (!line || line.startsWith("#")) return line;
      const sep = line.includes("?") ? "&" : "?";
      return `${line}${sep}token=${token}`;
    })
    .join("\n");
}

function parseRange(rangeHeader, size) {
  const match = /bytes=(\d+)-(\d*)/.exec(rangeHeader);
  if (!match) return { start: 0, end: size - 1 };
  const start = parseInt(match[1]);
  const end = match[2] ? parseInt(match[2]) : size - 1;
  return { start, end };
}

async function verifyToken(token, secret) {
  if (!token || !secret) return { ok: false };

  const parts = token.split(".");
  if (parts.length !== 3) return { ok: false };

  const [videoId, exp, sig] = parts;
  if (!videoId || !exp || !sig) return { ok: false };

  if (Date.now() / 1000 > Number(exp)) return { ok: false };

  const data = `${videoId}.${exp}`;
  const expected = await hmacHex(data, secret);

  return { ok: expected === sig, videoId };
}

async function hmacHex(data, secret) {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );

  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(data));
  return [...new Uint8Array(sig)]
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}
