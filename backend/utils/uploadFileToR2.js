const fs = require("fs");
const path = require("path");
const { PutObjectCommand } = require("@aws-sdk/client-s3");
const r2 = require("./r2");

async function uploadFileToR2(localFilePath, key, contentType) {
  const fileBuffer = fs.readFileSync(localFilePath);

  await r2.send(
    new PutObjectCommand({
      Bucket: process.env.R2_BUCKET,
      Key: key,
      Body: fileBuffer,
      ContentType: contentType,
    })
  );

  const cleanBase = (process.env.R2_PUBLIC_BASE_URL || "").replace(/\/+$/, "");
  return `${cleanBase}/${key}`;
}

module.exports = uploadFileToR2;