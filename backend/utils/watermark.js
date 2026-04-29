/**
 * watermark.js — Centralized watermark burn-in module
 *
 * Design:
 *   • Text "clipdam18.com" jumps between top-left ↔ top-right every JUMP_SECS
 *   • Logo PNG (if exists) fixed at bottom-right — always visible, strong branding
 *   • Ghost text at center-bottom (opacity 0.18) — hardest layer to remove
 *
 * Output label: [v]
 * When logo exists the filter requires 2 ffmpeg inputs: [0:v] video, [1:v] logo PNG
 * When no logo only 1 input needed.
 */

const path = require("path");
const fs = require("fs");

const SITE_TEXT = process.env.WATERMARK_TEXT || "clipdam18.com";
const JUMP_SECS = Math.max(4, Number(process.env.WATERMARK_JUMP_SECONDS) || 9);
const TEXT_OPACITY = Math.min(1, Math.max(0.1, Number(process.env.WATERMARK_OPACITY) || 0.92));
const LOGO_OPACITY = Math.min(1, Math.max(0.1, Number(process.env.WATERMARK_LOGO_OPACITY) || 0.90));

function getLogoPath() {
  const candidates = [
    process.env.WATERMARK_PNG_FILE,
    path.join(__dirname, "..", "assets", "watermark.png"),
    path.join(__dirname, "..", "tools", "local-hls", "watermark.png"),
  ].filter(Boolean);

  for (const p of candidates) {
    if (fs.existsSync(p)) return p;
  }
  return "";
}

/**
 * buildWatermarkFilter(videoWidth, videoHeight)
 *
 * Returns: { filterComplex: string, logoPath: string }
 *
 * filterComplex produces a single output labeled [v].
 * If logoPath is non-empty, the caller must add the PNG as a second input BEFORE
 * the output so it becomes [1:v].
 */
function buildWatermarkFilter(videoWidth = 1920, videoHeight = 1080) {
  const w = videoWidth;
  const h = videoHeight;
  const short = Math.min(w, h);

  // ── sizes ──────────────────────────────────────────────────
  const logoW = Math.max(80, Math.round(short * 0.145));     // logo scaled width
  const fs1   = Math.max(22, Math.round(short * 0.040));     // main text font size
  const fs2   = Math.max(14, Math.round(short * 0.024));     // ghost font size

  // ── margins ────────────────────────────────────────────────
  const mx  = Math.max(16, Math.round(w * 0.022));
  const myt = Math.max(12, Math.round(h * 0.020));
  const myb = Math.max(14, Math.round(h * 0.016));           // bottom margin for logo
  const ghostY = Math.round(h * 0.038);                       // from bottom for ghost

  // ── 2-corner jump expression (top-left ↔ top-right) ────────
  const ci = `mod(floor(t/${JUMP_SECS}),2)`;
  const txExpr = `if(eq(${ci},0),${mx},W-tw-${mx})`;
  const tyExpr = String(myt);

  // ── drawtext: main jumping corner mark ─────────────────────
  const mainText = [
    `drawtext=text='${SITE_TEXT}'`,
    `fontsize=${fs1}`,
    `fontcolor=white@${TEXT_OPACITY}`,
    `shadowcolor=black@0.88`,
    `shadowx=2`,
    `shadowy=2`,
    `boxcolor=black@0.30`,
    `box=1`,
    `boxborderw=6`,
    `x='${txExpr}'`,
    `y='${tyExpr}'`,
  ].join(":");

  // ── drawtext: ghost center-bottom mark ─────────────────────
  const ghostText = [
    `drawtext=text='${SITE_TEXT}'`,
    `fontsize=${fs2}`,
    `fontcolor=white@0.18`,
    `shadowcolor=black@0.10`,
    `shadowx=1`,
    `shadowy=1`,
    `x=(W-tw)/2`,
    `y=H-th-${ghostY}`,
  ].join(":");

  const logoPath = getLogoPath();

  if (logoPath) {
    // Logo fixed at bottom-right
    const logoX = `W-overlay_w-${mx}`;
    const logoY = `H-overlay_h-${myb}`;

    const filterComplex = [
      // Scale + normalize base
      `[0:v]scale=trunc(iw/2)*2:trunc(ih/2)*2,format=yuv420p[base]`,
      // Prepare logo: set opacity + scale to fixed width
      `[1:v]format=rgba,colorchannelmixer=aa=${LOGO_OPACITY},scale=${logoW}:-2[logo]`,
      // Apply text layers to base
      `[base]${mainText},${ghostText}[vtxt]`,
      // Overlay logo on top of text layers
      `[vtxt][logo]overlay=x='${logoX}':y='${logoY}'[v]`,
    ].join(";");

    return { filterComplex, logoPath };
  }

  // ── text-only (no logo file found) ─────────────────────────
  // 4-corner jump for maximum coverage when no logo
  const ci4 = `mod(floor(t/${JUMP_SECS})*7+3,4)`;
  const tx4 = `if(eq(${ci4},0),${mx},if(eq(${ci4},1),W-tw-${mx},if(eq(${ci4},2),${mx},W-tw-${mx})))`;
  const ty4 = `if(eq(${ci4},0),${myt},if(eq(${ci4},1),${myt},if(eq(${ci4},2),H-th-${ghostY+16},H-th-${ghostY+16})))`;

  const mainText4 = [
    `drawtext=text='${SITE_TEXT}'`,
    `fontsize=${fs1}`,
    `fontcolor=white@${TEXT_OPACITY}`,
    `shadowcolor=black@0.88`,
    `shadowx=2`,
    `shadowy=2`,
    `boxcolor=black@0.30`,
    `box=1`,
    `boxborderw=6`,
    `x='${tx4}'`,
    `y='${ty4}'`,
  ].join(":");

  const filterComplex = [
    `[0:v]scale=trunc(iw/2)*2:trunc(ih/2)*2,format=yuv420p[base]`,
    `[base]${mainText4},${ghostText}[v]`,
  ].join(";");

  return { filterComplex, logoPath: "" };
}

module.exports = { buildWatermarkFilter, getLogoPath };
