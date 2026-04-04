const fs = require("fs");
const path = require("path");
const mime = require("mime-types");
const { PutObjectCommand } = require("@aws-sdk/client-s3");
const r2 = require("./r2");

async function uploadDirRecursive(localDir, remotePrefix, bucket) {
  const entries = fs.readdirSync(localDir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(localDir, entry.name);
    const remoteKey = `${remotePrefix}/${entry.name}`.replace(/\\/g, "/");

    if (entry.isDirectory()) {
      await uploadDirRecursive(fullPath, remoteKey, bucket);
      continue;
    }

    const body = fs.readFileSync(fullPath);
    const contentType = mime.lookup(fullPath) || "application/octet-stream";

    await r2.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: remoteKey,
        Body: body,
        ContentType: contentType,
      })
    );

    console.log("Uploaded:", remoteKey);
  }
}

async function uploadHlsFolderToR2({ movieId, localHlsDir, bucket }) {
  if (!movieId) throw new Error("movieId is required");
  if (!localHlsDir) throw new Error("localHlsDir is required");
  if (!bucket) throw new Error("bucket is required");

  const remotePrefix = `videos/${movieId}/hls`;

  await uploadDirRecursive(localHlsDir, remotePrefix, bucket);

  return {
    ok: true,
    prefix: remotePrefix,
    masterKey: `${remotePrefix}/master.m3u8`,
  };
}

module.exports = {
  uploadHlsFolderToR2,
};