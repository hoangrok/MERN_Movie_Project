async function hmacSha256Hex(secret, msg) {
  const enc = new TextEncoder();

  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );

  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(msg));

  return [...new Uint8Array(sig)]
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET,HEAD,OPTIONS",
    "Access-Control-Allow-Headers": "*",
    "Access-Control-Expose-Headers":
      "Content-Length,Content-Range,Accept-Ranges,ETag,Content-Type",
  };
}

async function verifySigned(request, env) {
  const url = new URL(request.url);

  const exp = url.searchParams.get("exp");
  const sig = url.searchParams.get("sig");

  if (!env.STREAM_TOKEN_SECRET) {
    console.log("Missing STREAM_TOKEN_SECRET");
    return false;
  }

  if (!exp || !sig) {
    console.log("Missing exp/sig params");
    return false;
  }

  const now = Math.floor(Date.now() / 1000);
  if (now > Number(exp)) {
    console.log("Token expired", { now, exp });
    return false;
  }

  // payload = pathname_without_leading_slash + ":" + exp
  const key = url.pathname.slice(1);
  const payload = `${key}:${exp}`;
  const expected = await hmacSha256Hex(env.STREAM_TOKEN_SECRET, payload);

  return expected === sig;
}

async function serveR2(key, env) {
  const object = await env.R2_BUCKET.get(key);

  if (!object) {
    return new Response("Not found", {
      status: 404,
      headers: corsHeaders(),
    });
  }

  const headers = new Headers(corsHeaders());
  object.writeHttpMetadata(headers);
  headers.set("etag", object.httpEtag);

  return new Response(object.body, { status: 200, headers });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders() });
    }

    if (!url.pathname.startsWith("/videos/")) {
      return new Response("OK", { status: 200, headers: corsHeaders() });
    }

    const key = url.pathname.slice(1); // "videos/..."

    // Segment files (.ts) are non-guessable paths — serve without re-verifying.
    // The signed manifest URL is the access gate; without it you can't discover segment names.
    if (url.pathname.endsWith(".ts")) {
      return serveR2(key, env);
    }

    // All other /videos/ requests (.m3u8 manifests, thumbnails, etc.) require a valid token.
    const valid = await verifySigned(request, env);

    if (!valid) {
      return new Response("TOKEN_BAD_FROM_WORKER", {
        status: 418,
        headers: corsHeaders(),
      });
    }

    return serveR2(key, env);
  },
};
