const { S3Client } = require("@aws-sdk/client-s3");

// đảm bảo dotenv đã load trước khi vào file này
const requiredEnvs = ["R2_ACCOUNT_ID","R2_ACCESS_KEY_ID","R2_SECRET_ACCESS_KEY","R2_BUCKET"];
for (const k of requiredEnvs) {
  if (!process.env[k]) throw new Error(`Missing env: ${k}. Check backend/.env and dotenv load order.`);
}

const r2 = new S3Client({
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  region: "auto",
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  },
});

module.exports = r2;