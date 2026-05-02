#!/usr/bin/env node
/**
 * preview-watermark.js
 * Tạo video preview 10 giây dùng đúng watermark.js production
 * Usage: node preview-watermark.js [input_video.mp4]
 */

const { execSync, spawnSync } = require("child_process");
const path = require("path");
const fs = require("fs");

const { buildWatermarkFilter, getLogoPath } = require("./backend/utils/watermark.js");

const TEST_FILE = "preview_source.mp4";
const OUT_FILE  = "preview_watermarked.mp4";
const DURATION  = 15; // seconds - đủ để thấy text jump

// ── Check FFmpeg ────────────────────────────────────────────
const check = spawnSync("ffmpeg", ["-version"], { encoding: "utf8" });
if (check.status !== 0) {
  console.error("✗ FFmpeg not found. Install: choco install ffmpeg");
  process.exit(1);
}
console.log("✓ FFmpeg OK");

// ── Input video ─────────────────────────────────────────────
let inputFile = process.argv[2];

if (inputFile && !fs.existsSync(inputFile)) {
  console.warn(`⚠ File not found: ${inputFile} — generating test video instead`);
  inputFile = null;
}

if (!inputFile) {
  console.log(`\n📹 Generating ${DURATION}s cinematic test video...`);
  // Dark cinematic gradient background like a movie
  const genCmd = [
    "ffmpeg", "-y",
    "-f", "lavfi",
    "-i", `color=c=0x0d0d0d:s=1920x1080:d=${DURATION}`,
    "-f", "lavfi",
    "-i", `sine=frequency=220:duration=${DURATION}`,
    "-vf", [
      // Add scan-line texture to look like actual content
      "noise=alls=8:allf=t",
      "drawtext=text='PREVIEW CONTENT':fontsize=72:fontcolor=white@0.08:x=(W-text_w)/2:y=(H-text_h)/2",
    ].join(","),
    "-pix_fmt", "yuv420p",
    "-c:v", "libx264", "-preset", "ultrafast", "-crf", "28",
    "-c:a", "aac", "-b:a", "64k",
    TEST_FILE
  ];

  const gen = spawnSync(genCmd[0], genCmd.slice(1), { stdio: "inherit" });
  if (gen.status !== 0) {
    console.error("✗ Failed to generate test video");
    process.exit(1);
  }
  inputFile = TEST_FILE;
  console.log(`✓ Test video created: ${TEST_FILE}`);
}

// ── Build watermark filter (same as production) ──────────────
const { filterComplex, logoPath } = buildWatermarkFilter(1920, 1080);
const hasLogo = !!logoPath;

console.log("\n📊 Watermark Config:");
console.log(`  Logo:     ${hasLogo ? logoPath : "none (text-only mode)"}`);
console.log(`  Text:     ${process.env.WATERMARK_TEXT || "clipdam18.com"}`);
console.log(`  Opacity:  ${process.env.WATERMARK_OPACITY || "0.92"}`);
console.log(`  Jump:     every ${process.env.WATERMARK_JUMP_SECONDS || "9"}s`);

console.log("\n🎬 Applying watermark...");

// ── FFmpeg command ───────────────────────────────────────────
const args = [
  "-y",
  "-i", inputFile,
];

if (hasLogo) {
  args.push("-i", logoPath);
}

args.push(
  "-filter_complex", filterComplex,
  "-map", "[v]",
  "-map", "0:a?",
  "-c:v", "libx264",
  "-preset", "fast",
  "-crf", "20",
  "-c:a", "aac",
  "-b:a", "128k",
  OUT_FILE
);

const result = spawnSync("ffmpeg", args, { stdio: "inherit" });

if (result.status !== 0) {
  console.error("\n✗ Watermark failed");
  process.exit(1);
}

const sizeMB = (fs.statSync(OUT_FILE).size / 1024 / 1024).toFixed(1);
console.log(`\n${"=".repeat(60)}`);
console.log(`✓ PREVIEW READY: ${OUT_FILE} (${sizeMB} MB)`);
console.log(`${"=".repeat(60)}`);
console.log(`\nMở file để xem: ${path.resolve(OUT_FILE)}`);
console.log(`\nTip: Xem từ giây 0→${Math.floor(DURATION/2)} để thấy text nhảy góc`);

// Auto-open on Windows
try {
  execSync(`start "" "${path.resolve(OUT_FILE)}"`, { shell: true });
  console.log("Opening preview...");
} catch (_) {}

// Cleanup test source
if (inputFile === TEST_FILE) {
  fs.unlinkSync(TEST_FILE);
}
