const crypto = require("crypto");

function signStreamToken({ videoId, expSeconds = 60 * 60 * 6, secret }) {
  if (!videoId) {
    throw new Error("videoId is required");
  }

  if (!secret) {
    throw new Error("STREAM_TOKEN_SECRET is missing");
  }

  const exp = Math.floor(Date.now() / 1000) + expSeconds;
  const payload = `${videoId}.${exp}`;

  const sig = crypto
    .createHmac("sha256", secret)
    .update(payload)
    .digest("hex");

  const token = `${videoId}.${exp}.${sig}`;

  return { token, exp };
}

function makeStreamUrl(hlsUrl, videoId, secret, expSeconds = 60 * 60 * 6) {
  if (!hlsUrl) {
    throw new Error("hlsUrl is required");
  }

  const { token } = signStreamToken({
    videoId,
    expSeconds,
    secret,
  });

  const sep = hlsUrl.includes("?") ? "&" : "?";
  return `${hlsUrl}${sep}token=${encodeURIComponent(token)}`;
}

module.exports = {
  signStreamToken,
  makeStreamUrl,
};