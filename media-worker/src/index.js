export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // ===== CORS =====
    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: corsHeaders(env),
      });
    }

    // ===== PUBLIC IMAGES =====
    if (url.pathname.startsWith("/images/")) {
      const key = url.pathname.slice(1);
      const cacheReq = new Request(url.toString(), request);

      const cached = await caches.default.match(cacheReq);
      if (cached) return withCors(cached, env);

      const obj = await env.R2_BUCKET.get(key);
      if (!obj) return new Response("Not found", { status: 404 });

      const resp = new Response(obj.body, {
        headers: {
          ...baseHeaders(env, key),
          "Cache-Control": "public, max-age=31536000, immutable",
          "X-Cache-Status": "MISS",
        },
      });

      ctx.waitUntil(caches.default.put(cacheReq, resp.clone()));
      return resp;
    }

    // ===== ONLY PROTECT VIDEOS =====
    if (!url.pathname.startsWith("/videos/")) {
      return new Response("OK", { status: 200 });
    }

    // ===== VERIFY TOKEN =====
    const token = url.searchParams.get("token");
    const auth = await verifyToken(token, env.STREAM_TOKEN_SECRET);

    if (!auth.ok) {
      return new Response("Unauthorized", { status: 401 });
    }

    const videoId = url.pathname.split("/")[2];
    if (videoId !== auth.videoId) {
      return new Response("Unauthorized", { status: 401 });
    }

    const key = url.pathname.slice(1);

    // ===== CACHE KEY (BỎ TOKEN) =====
    const cacheUrl = new URL(request.url);
    cacheUrl.searchParams.delete("token");
    const cacheReq = new Request(cacheUrl.toString(), request);

    // ===== CACHE HIT =====
    const cached = await caches.default.match(cacheReq);
    if (cached) {
      const headers = new Headers(cached.headers);
      headers.set("X-Cache-Status", "HIT");
      return new Response(cached.body, { status: cached.status, headers });
    }

    // ===== PLAYLIST =====
    if (key.endsWith(".m3u8")) {
      const obj = await env.R2_BUCKET.get(key);
      if (!obj) return new Response("Not found", { status: 404 });

      const text = await obj.text();
      const rewritten = rewritePlaylist(text, token, url.pathname);

      return new Response(rewritten, {
        headers: {
          ...baseHeaders(env, key),
          "Cache-Control": "public, max-age=15",
          "X-Cache-Status": "MISS",
        },
      });
    }

    // ===== RANGE SUPPORT =====
    const head = await env.R2_BUCKET.head(key);
    const range = request.headers.get("Range");

    if (range) {
      const r = parseRange(range, head.size);
      const obj = await env.R2_BUCKET.get(key, {
        range: { offset: r.start, length: r.end - r.start + 1 },
      });

      return new Response(obj.body, {
        status: 206,
        headers: {
          ...baseHeaders(env, key),
          "Content-Range": `bytes ${r.start}-${r.end}/${head.size}`,
        },
      });
    }

    // ===== NORMAL FILE =====
    const obj = await env.R2_BUCKET.get(key);
    if (!obj) return new Response("Not found", { status: 404 });

    const headers = baseHeaders(env, key);

    // ⚡ QUAN TRỌNG: cache mạnh cho segment
    if (
      key.endsWith(".m4s") ||
      key.endsWith(".ts") ||
      key.endsWith("init.mp4")
    ) {
      headers["Cache-Control"] = "public, max-age=31536000, immutable";
    }

    const resp = new Response(obj.body, {
      status: 200,
      headers: {
        ...headers,
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

function baseHeaders(env, key) {
  return {
    "Content-Type": getContentType(key),
    "Access-Control-Allow-Origin": env.ALLOW_ORIGIN || "*",
    "Accept-Ranges": "bytes",
  };
}

function getContentType(key) {
  if (key.endsWith(".m3u8")) return "application/vnd.apple.mpegurl";
  if (key.endsWith(".m4s")) return "video/iso.segment";
  if (key.endsWith(".ts")) return "video/mp2t";
  if (key.endsWith(".mp4")) return "video/mp4";
  return "application/octet-stream";
}

function rewritePlaylist(text, token, basePath) {
  return text
    .split("\n")
    .map((line) => {
      if (!line || line.startsWith("#")) return line;
      const sep = line.includes("?") ? "&" : "?";
      return `${line}${sep}token=${token}`;
    })
    .join("\n");
}

function parseRange(rangeHeader, size) {
  const match = /bytes=(\d+)-(\d*)/.exec(rangeHeader);
  const start = parseInt(match[1]);
  const end = match[2] ? parseInt(match[2]) : size - 1;
  return { start, end };
}

async function verifyToken(token, secret) {
  if (!token) return { ok: false };

  const [videoId, exp, sig] = token.split(".");
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