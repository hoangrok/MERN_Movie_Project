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

function corsHeaders(env) {
  const allow = env.ALLOW_ORIGIN || "*";
  return {
    "Access-Control-Allow-Origin": allow,
    "Access-Control-Allow-Methods": "GET,HEAD,OPTIONS",
    "Access-Control-Allow-Headers": "Range,Origin,Accept,Content-Type",
    "Access-Control-Expose-Headers":
      "Content-Length,Content-Range,Accept-Ranges,ETag,Content-Type",
  };
}

function extractVideoId(pathname) {
  const parts = pathname.split("/");
  return parts.length >= 3 ? parts[2] : null;
}

function fileExt(key) {
  const i = key.lastIndexOf(".");
  return i === -1 ? "" : key.slice(i + 1).toLowerCase();
}

function imageContentType(key) {
  if (key.endsWith(".png")) return "image/png";
  if (key.endsWith(".jpg") || key.endsWith(".jpeg")) return "image/jpeg";
  if (key.endsWith(".webp")) return "image/webp";
  if (key.endsWith(".gif")) return "image/gif";
  if (key.endsWith(".svg")) return "image/svg+xml";
  return "application/octet-stream";
}

function baseHeadersForKey(env, key) {
  const h = corsHeaders(env);

  if (key.endsWith(".m3u8")) {
    h["Content-Type"] = "application/vnd.apple.mpegurl";
  } else if (key.endsWith(".ts")) {
    h["Content-Type"] = "video/MP2T";
  } else if (key.endsWith(".m4s")) {
    h["Content-Type"] = "video/iso.segment";
  } else if (key.endsWith(".mp4")) {
    h["Content-Type"] = "video/mp4";
  } else if (
    key.endsWith(".png") ||
    key.endsWith(".jpg") ||
    key.endsWith(".jpeg") ||
    key.endsWith(".webp") ||
    key.endsWith(".gif") ||
    key.endsWith(".svg")
  ) {
    h["Content-Type"] = imageContentType(key);
  } else {
    h["Content-Type"] = "application/octet-stream";
  }

  if (key.endsWith(".m3u8")) {
    h["Cache-Control"] = "public, max-age=30";
  } else if (
    key.endsWith(".ts") ||
    key.endsWith(".m4s") ||
    key.endsWith("init.mp4") ||
    key.endsWith(".png") ||
    key.endsWith(".jpg") ||
    key.endsWith(".jpeg") ||
    key.endsWith(".webp") ||
    key.endsWith(".gif") ||
    key.endsWith(".svg")
  ) {
    h["Cache-Control"] = "public, max-age=31536000, immutable";
  } else {
    h["Cache-Control"] = "public, max-age=3600";
  }

  h["Accept-Ranges"] = "bytes";
  return h;
}

function withCors(resp, env) {
  const h = new Headers(resp.headers);
  const cors = corsHeaders(env);
  for (const [k, v] of Object.entries(cors)) {
    h.set(k, v);
  }
  return new Response(resp.body, { status: resp.status, headers: h });
}

function parseRange(rangeHeader, size) {
  const m = /^bytes=(\d+)-(\d+)?$/.exec(rangeHeader);
  if (!m) return null;

  const start = Number(m[1]);
  let end = m[2] ? Number(m[2]) : size - 1;

  if (start < 0 || start >= size) return null;
  if (end >= size) end = size - 1;
  if (end < start) return null;

  return { start, end };
}

function resolveRelativeUri(basePathname, uri) {
  if (!uri) return uri;

  if (uri.startsWith("http://") || uri.startsWith("https://")) {
    return uri;
  }

  if (uri.startsWith("/")) {
    return uri;
  }

  const baseDir = basePathname.substring(0, basePathname.lastIndexOf("/") + 1);
  return `${baseDir}${uri}`;
}

function rewriteM3U8AppendToken(text, token, basePathname) {
  const lines = text.split("\n");

  return lines
    .map((line) => {
      const trimmed = line.trim();
      if (!trimmed) return line;

      if (trimmed.startsWith("#EXT-X-MAP:")) {
        return line.replace(/URI="([^"]+)"/, (m, uri) => {
          if (uri.includes("token=")) return m;

          const resolved = resolveRelativeUri(basePathname, uri);
          const sep = resolved.includes("?") ? "&" : "?";
          return `URI="${resolved}${sep}token=${encodeURIComponent(token)}"`;
        });
      }

      if (trimmed.startsWith("#")) return line;
      if (trimmed.includes("token=")) return line;

      const resolved = resolveRelativeUri(basePathname, trimmed);
      const sep = resolved.includes("?") ? "&" : "?";
      return `${resolved}${sep}token=${encodeURIComponent(token)}`;
    })
    .join("\n");
}

async function verifyToken(token, secret) {
  if (!token || !secret) return { ok: false };

  const parts = token.split(".");
  if (parts.length !== 3) return { ok: false };

  const [videoId, expStr, sigHex] = parts;
  const exp = Number(expStr);

  if (!videoId || !Number.isFinite(exp)) return { ok: false };
  if (Date.now() / 1000 > exp) return { ok: false };

  const payload = `${videoId}.${expStr}`;
  const expected = await hmacHex(payload, secret);

  if (!timingSafeEqualHex(sigHex, expected)) return { ok: false };

  return { ok: true, videoId };
}

function timingSafeEqualHex(a, b) {
  if (a.length !== b.length) return false;
  let out = 0;
  for (let i = 0; i < a.length; i++) {
    out |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return out === 0;
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: corsHeaders(env),
      });
    }

    // ==========================
    // PUBLIC IMAGES
    // /images/...
    // ==========================
    if (url.pathname.startsWith("/images/")) {
      const key = url.pathname.slice(1);

      const cacheReq = new Request(url.toString(), request);

      if (request.method === "GET") {
        const cached = await caches.default.match(cacheReq);
        if (cached) return withCors(cached, env);
      }

      const obj = await env.R2_BUCKET.get(key);
      if (!obj) {
        return new Response("Not found", {
          status: 404,
          headers: corsHeaders(env),
        });
      }

      const resp = new Response(obj.body, {
        status: 200,
        headers: {
          ...baseHeadersForKey(env, key),
          "Content-Type": imageContentType(key),
          "Cache-Control": "public, max-age=31536000, immutable",
        },
      });

      if (request.method === "GET") {
        ctx.waitUntil(caches.default.put(cacheReq, resp.clone()));
      }

      return resp;
    }

    // ==========================
    // ONLY PROTECT /videos/
    // ==========================
    if (!url.pathname.startsWith("/videos/")) {
      return new Response("OK", {
        status: 200,
        headers: corsHeaders(env),
      });
    }

    const token = url.searchParams.get("token");
    const auth = await verifyToken(token, env.STREAM_TOKEN_SECRET);

    if (!auth.ok) {
      return new Response("Unauthorized", {
        status: 401,
        headers: corsHeaders(env),
      });
    }

    const videoIdInPath = extractVideoId(url.pathname);
    if (!videoIdInPath || videoIdInPath !== auth.videoId) {
      return new Response("Unauthorized", {
        status: 401,
        headers: corsHeaders(env),
      });
    }

    const key = url.pathname.slice(1);
    const ext = fileExt(key);

    const head = await env.R2_BUCKET.head(key);
    if (!head) {
      return new Response("Not found", {
        status: 404,
        headers: corsHeaders(env),
      });
    }

    let cacheReq = null;
    if (ext !== "m3u8") {
      const cacheUrl = new URL(request.url);
      cacheUrl.searchParams.delete("token");
      cacheReq = new Request(cacheUrl.toString(), request);
    }

    if (request.method === "GET" && cacheReq) {
      const cached = await caches.default.match(cacheReq);
      if (cached) return withCors(cached, env);
    }

    // ==========================
    // PLAYLIST REWRITE
    // ==========================
    if (ext === "m3u8") {
      const obj = await env.R2_BUCKET.get(key);
      if (!obj) {
        return new Response("Not found", {
          status: 404,
          headers: corsHeaders(env),
        });
      }

      const text = await obj.text();
      const rewritten = rewriteM3U8AppendToken(text, token, url.pathname);

      return new Response(rewritten, {
        status: 200,
        headers: {
          ...baseHeadersForKey(env, key),
          "Content-Type": "application/vnd.apple.mpegurl",
          "Cache-Control": "public, max-age=30",
        },
      });
    }

    // ==========================
    // RANGE SUPPORT
    // ==========================
    const rangeHeader = request.headers.get("Range");
    if (rangeHeader) {
      const r = parseRange(rangeHeader, head.size);
      if (!r) {
        return new Response("Range Not Satisfiable", {
          status: 416,
          headers: corsHeaders(env),
        });
      }

      const obj = await env.R2_BUCKET.get(key, {
        range: { offset: r.start, length: r.end - r.start + 1 },
      });

      if (!obj) {
        return new Response("Not found", {
          status: 404,
          headers: corsHeaders(env),
        });
      }

      return new Response(obj.body, {
        status: 206,
        headers: {
          ...baseHeadersForKey(env, key),
          "Content-Range": `bytes ${r.start}-${r.end}/${head.size}`,
        },
      });
    }

    // ==========================
    // NORMAL GET
    // ==========================
    const obj = await env.R2_BUCKET.get(key);
    if (!obj) {
      return new Response("Not found", {
        status: 404,
        headers: corsHeaders(env),
      });
    }

    const resp = new Response(obj.body, {
      status: 200,
      headers: baseHeadersForKey(env, key),
    });

    if (request.method === "GET" && !rangeHeader && cacheReq) {
      ctx.waitUntil(caches.default.put(cacheReq, resp.clone()));
    }

    return resp;
  },
};