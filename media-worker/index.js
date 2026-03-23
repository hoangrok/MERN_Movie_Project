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

  console.log("STREAM_SECRET exists:", !!env.STREAM_SECRET);
  console.log("pathname:", url.pathname);
  console.log("exp:", exp);
  console.log("sig:", sig);

  if (!env.STREAM_SECRET) {
    console.log("Missing STREAM_SECRET");
    return false;
  }

  if (!exp || !sig) {
    console.log("Missing exp/sig");
    return false;
  }

  const now = Math.floor(Date.now() / 1000);
  if (now > Number(exp)) {
    console.log("Expired", { now, exp });
    return false;
  }

  const key = url.pathname.slice(1);
  const payload = `${key}:${exp}`;
  const expected = await hmacSha256Hex(env.STREAM_SECRET, payload);

  console.log("verify key:", key);
  console.log("verify payload:", payload);
  console.log("expected:", expected);
  console.log("sig from url:", sig);

  return expected === sig;
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    console.log("Incoming:", request.method, url.pathname);

    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: corsHeaders(),
      });
    }

    if (!url.pathname.startsWith("/videos/")) {
      return new Response("OK", { status: 200, headers: corsHeaders() });
    }

    const valid = await verifySigned(request, env);

    if (!valid) {
      return new Response("TOKEN_BAD_FROM_WORKER", {
        status: 418,
        headers: corsHeaders(),
      });
    }

    const key = url.pathname.slice(1);

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

    return new Response(object.body, {
      status: 200,
      headers,
    });
  },
};