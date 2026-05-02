/**
 * watermark.js — Centralized watermark burn-in module
 *
 * Design:
 *   • Text "clipdam18.com" jumps between top-left ↔ top-right every JUMP_SECS
 *   • Neon glow effect: invisible border layer + crisp text on top
 *   • Logo PNG (if exists) fixed at bottom-right — always visible, strong branding
 *   • Ghost text at center-bottom (opacity 0.18) — hardest layer to remove
 *
 * Output label: [v]
 * When logo exists the filter requires 2 ffmpeg inputs: [0:v] video, [1:v] logo PNG
 * When no logo only 1 input needed.
 */

const path = require("path");
const fs   = require("fs");
const { buildGeometryFilter } = require("./videoGeometry");

const SITE_TEXT   = process.env.WATERMARK_TEXT         || "clipdam18.com";
const JUMP_SECS   = Math.max(2, Number(process.env.WATERMARK_JUMP_SECONDS) || 4);
const TEXT_OPACITY= Math.min(1, Math.max(0.1, Number(process.env.WATERMARK_OPACITY) || 0.95));
const LOGO_OPACITY= Math.min(1, Math.max(0.1, Number(process.env.WATERMARK_LOGO_OPACITY) || 0.90));
const GLOW_COLOR  = process.env.WATERMARK_GLOW_COLOR   || "cyan";

// ── Font detection ──────────────────────────────────────────
function getFontFile() {
  const candidates = [
    process.env.WATERMARK_FONT_FILE,
    "C:\\Windows\\Fonts\\arialbd.ttf",
    "C:\\Windows\\Fonts\\verdanab.ttf",
    "C:\\Windows\\Fonts\\tahomabd.ttf",
    "C:\\Windows\\Fonts\\arial.ttf",
  ].filter(Boolean);

  for (const p of candidates) {
    if (fs.existsSync(p)) return p;
  }
  return "";
}

// FFmpeg drawtext requires Windows drive colon to be escaped: C: → C\:
function escapeFontPath(p) {
  return p.replace(/\\/g, "/").replace(/^([A-Za-z]):/, "$1\\:");
}

// ── Logo detection ──────────────────────────────────────────
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
function buildWatermarkFilter(videoWidth = 1920, videoHeight = 1080, options = {}) {
  const w = videoWidth;
  const h = videoHeight;
  const short = Math.min(w, h);
  const baseVideoFilter = buildGeometryFilter({
    rotation: options.rotation || 0,
  });

  // ── sizes ──────────────────────────────────────────────────
  const logoW = Math.max(80, Math.round(short * 0.145));
  const fs1   = Math.max(22, Math.round(short * 0.042));   // main text
  const fs2   = Math.max(14, Math.round(short * 0.024));   // ghost text

  // ── margins ────────────────────────────────────────────────
  const mx   = Math.max(16, Math.round(w * 0.022));
  const myt  = Math.max(12, Math.round(h * 0.020));
  const myb  = Math.max(14, Math.round(h * 0.016));
  const ghostY = Math.round(h * 0.038);

  // ── font ───────────────────────────────────────────────────
  const rawFont  = getFontFile();
  const fontOpt  = rawFont ? `fontfile='${escapeFontPath(rawFont)}':` : "";

  // ── 2-corner jump expression ────────────────────────────────
  const ci      = `mod(floor(t/${JUMP_SECS}),2)`;
  const txExpr  = `if(eq(${ci},0),${mx},W-tw-${mx})`;
  const tyExpr  = String(myt);

  // ── Layer 1: neon glow halo (drawn first, under main text) ─
  // Invisible fill + thick colored border = halo/glow effect
  const glowLayer = [
    `drawtext=text='${SITE_TEXT}'`,
    `${fontOpt}fontsize=${fs1}`,
    `fontcolor=black@0.0`,           // fully transparent fill
    `bordercolor=${GLOW_COLOR}@0.45`,// neon colored halo
    `borderw=6`,                     // thick border = wide glow spread
    `shadowcolor=${GLOW_COLOR}@0.20`,// extra glow via centered shadow
    `shadowx=0`,
    `shadowy=0`,
    `x='${txExpr}'`,
    `y='${tyExpr}'`,
  ].join(":");

  // ── Layer 2: crisp main text (drawn on top of glow) ────────
  const mainText = [
    `drawtext=text='${SITE_TEXT}'`,
    `${fontOpt}fontsize=${fs1}`,
    `fontcolor=white@${TEXT_OPACITY}`,
    `shadowcolor=black@0.95`,        // strong depth shadow
    `shadowx=3`,
    `shadowy=3`,
    `bordercolor=white@0.22`,        // subtle white crisp outline
    `borderw=1`,
    `x='${txExpr}'`,
    `y='${tyExpr}'`,
  ].join(":");

  // ── Ghost text: center-bottom subtle mark ───────────────────
  const ghostText = [
    `drawtext=text='${SITE_TEXT}'`,
    `${fontOpt}fontsize=${fs2}`,
    `fontcolor=white@0.20`,
    `bordercolor=white@0.06`,
    `borderw=1`,
    `shadowcolor=black@0.12`,
    `shadowx=1`,
    `shadowy=1`,
    `x=(W-tw)/2`,
    `y=H-th-${ghostY}`,
  ].join(":");

  const logoPath = getLogoPath();

  // ── With logo ───────────────────────────────────────────────
  if (logoPath) {
    const logoX = `W-overlay_w-${mx}`;
    const logoY = `H-overlay_h-${myb}`;

    const filterComplex = [
      `[0:v]${baseVideoFilter}[base]`,
      `[1:v]format=rgba,colorchannelmixer=aa=${LOGO_OPACITY},scale=${logoW}:-2[logo]`,
      `[base]${glowLayer},${mainText},${ghostText}[vtxt]`,
      `[vtxt][logo]overlay=x='${logoX}':y='${logoY}'[v]`,
    ].join(";");

    return { filterComplex, logoPath };
  }

  // ── Text-only (no logo) — 4-corner jump for more coverage ──
  const ci4  = `mod(floor(t/${JUMP_SECS})*7+3,4)`;
  const tx4  = `if(eq(${ci4},0),${mx},if(eq(${ci4},1),W-tw-${mx},if(eq(${ci4},2),${mx},W-tw-${mx})))`;
  const ty4  = `if(eq(${ci4},0),${myt},if(eq(${ci4},1),${myt},if(eq(${ci4},2),H-th-${ghostY+16},H-th-${ghostY+16})))`;

  const glowLayer4 = [
    `drawtext=text='${SITE_TEXT}'`,
    `${fontOpt}fontsize=${fs1}`,
    `fontcolor=black@0.0`,
    `bordercolor=${GLOW_COLOR}@0.45`,
    `borderw=6`,
    `shadowcolor=${GLOW_COLOR}@0.20`,
    `shadowx=0`,
    `shadowy=0`,
    `x='${tx4}'`,
    `y='${ty4}'`,
  ].join(":");

  const mainText4 = [
    `drawtext=text='${SITE_TEXT}'`,
    `${fontOpt}fontsize=${fs1}`,
    `fontcolor=white@${TEXT_OPACITY}`,
    `shadowcolor=black@0.95`,
    `shadowx=3`,
    `shadowy=3`,
    `bordercolor=white@0.22`,
    `borderw=1`,
    `x='${tx4}'`,
    `y='${ty4}'`,
  ].join(":");

  const filterComplex = [
    `[0:v]${baseVideoFilter}[base]`,
    `[base]${glowLayer4},${mainText4},${ghostText}[v]`,
  ].join(";");

  return { filterComplex, logoPath: "" };
}

module.exports = { buildWatermarkFilter, getLogoPath };
