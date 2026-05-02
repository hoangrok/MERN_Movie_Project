# 👁️ Watermark Preview Guide

Hướng dẫn xem preview watermark trước khi process video thật.

---

## 🎯 Why Preview?

✅ Xem watermark thực tế trước khi process tất cả
✅ Điều chỉnh vị trí, kích thước, opacity nhanh
✅ Tiết kiệm thời gian (không phải encode video 1 giờ)
✅ Test cấu hình trước deploy

---

## 🚀 Quick Start

### Option 1: VS Code (Recommended)

```
1. Ctrl + Shift + P
2. Type: "Run Task"
3. Select: "👁️ Preview Watermark (5 sec test)"
4. Wait ~10 seconds
5. Preview video opens automatically
```

### Option 2: Python Script

```bash
python watermark-preview.py
```

### Option 3: With Custom Video

```bash
python watermark-preview.py path/to/your/video.mp4
```

---

## 📊 Visual Preview Examples

### Example 1: Bottom-Right Logo + Text

**Config:**
```json
{
  "logo": {
    "position": "bottom-right",
    "scale": 0.15,
    "opacity": 0.8
  },
  "text": {
    "content": "© 2024 MovieName",
    "position": "bottom-right",
    "font_size": 24,
    "opacity": 0.7
  }
}
```

**Visual:**
```
┌─────────────────────────────────────┐
│                                     │
│                                     │
│                                     │
│                                     │
│                              🎬 Logo│
│                  © 2024 MovieName   │
└─────────────────────────────────────┘
```

---

### Example 2: Top-Right Logo Only

**Config:**
```json
{
  "logo": {
    "position": "top-right",
    "scale": 0.12,
    "opacity": 0.9
  },
  "text": {
    "enabled": false
  }
}
```

**Visual:**
```
┌─────────────────────────────────────┐
│                              🎬 Logo│
│                                     │
│                                     │
│                                     │
│                                     │
└─────────────────────────────────────┘
```

---

### Example 3: Center Text (Subtle)

**Config:**
```json
{
  "logo": {
    "enabled": false
  },
  "text": {
    "content": "CONFIDENTIAL",
    "position": "center",
    "font_size": 48,
    "opacity": 0.3
  }
}
```

**Visual:**
```
┌─────────────────────────────────────┐
│                                     │
│                                     │
│           CONFIDENTIAL              │
│           (mờ mờ)                   │
│                                     │
│                                     │
└─────────────────────────────────────┘
```

---

### Example 4: Professional Branding

**Config:**
```json
{
  "logo": {
    "position": "top-right",
    "scale": 0.1,
    "opacity": 0.95
  },
  "text": {
    "content": "Studio Production",
    "position": "bottom-left",
    "font_size": 18,
    "opacity": 0.8
  }
}
```

**Visual:**
```
┌─────────────────────────────────────┐
│                              🎬 Logo│
│                                     │
│                                     │
│                                     │
│ Studio Production                   │
└─────────────────────────────────────┘
```

---

## 🎨 Opacity Comparison

### What Different Opacity Looks Like:

```
opacity: 0.3 (Very Subtle)
    [Logo/Text nhìn mờ nhạt, hầu như không nhận thấy]

opacity: 0.5 (Subtle)
    [Logo/Text nhìn thấy nhưng không gây phiền]

opacity: 0.7 (Noticeable) ⭐ Recommended
    [Cân bằng giữa visibility và không phiền]

opacity: 0.9 (Strong)
    [Logo/Text rõ ràng, bảo vệ tác quyền tốt]

opacity: 1.0 (Maximum)
    [Logo/Text đặc, có thể che mất content]
```

---

## 📏 Scale Comparison

### Logo Size (scale parameter):

```
scale: 0.08  (Very small, bottom corner)
    ┌──────────────────────┐
    │                      │
    │                      │
    │                   🎬 │ ← Nhìn không rõ
    └──────────────────────┘

scale: 0.15  (Medium, good balance) ⭐
    ┌──────────────────────┐
    │                      │
    │                      │
    │               🎬 Logo│ ← Rõ ràng, đẹp
    └──────────────────────┘

scale: 0.25  (Large, very visible)
    ┌──────────────────────┐
    │                      │
    │          🎬 Logo     │ ← Rất rõ, có thể che
    │                      │
    └──────────────────────┘

scale: 0.35  (Very large, strong branding)
    ┌──────────────────────┐
    │       🎬 Logo        │
    │                      │ ← Có thể che content
    │                      │
    └──────────────────────┘
```

---

## 🔄 Preview Workflow

### Step 1: Create Initial Config

Edit `watermark-config.json`:
```json
{
  "watermark": {
    "logo": {
      "path": "./assets/watermark-logo.png",
      "position": "bottom-right",
      "scale": 0.15,
      "opacity": 0.8
    },
    "text": {
      "enabled": true,
      "content": "© 2024 MyStudio",
      "position": "bottom-right",
      "font_size": 24,
      "opacity": 0.7
    }
  }
}
```

### Step 2: Generate Preview

**VS Code:**
```
Ctrl + Shift + P → Run Task → 👁️ Preview Watermark
```

**CLI:**
```bash
python watermark-preview.py
```

### Step 3: View Preview

File: `preview_watermarked.mp4` (5 seconds)
- Tự động mở video player
- Hoặc: Explorer → Double-click file

### Step 4: Adjust If Needed

Không thích? Edit `watermark-config.json`:

```json
{
  "logo": {
    "scale": 0.12,    // Giảm size
    "opacity": 0.6    // Giảm opacity
  },
  "text": {
    "font_size": 20   // Giảm font size
  }
}
```

### Step 5: Repeat

```
Edit config → Preview → Check → Repeat
```

---

## 🎬 Preview Output

Khi chạy preview, bạn sẽ thấy:

```
============================================================
🎬 Watermark Preview Generator v1.0
============================================================

✓ Config loaded: watermark-config.json
✓ FFmpeg available
📹 Generating 5-second test video...
✓ Test video created: test_input.mp4

============================================================
Creating Preview: preview_watermarked.mp4
============================================================
Input:  test_input.mp4
Output: preview_watermarked.mp4

Watermark Config:
  Logo:     ./assets/watermark-logo.png
  Text:     © 2024 MyStudio
  Position: bottom-right
  Codec:    libx264
  Preset:   medium
  CRF:      23

Encoding preview (5 seconds)...

[ffmpeg encoding output...]

============================================================
✓ PREVIEW CREATED SUCCESSFULLY!
============================================================
File: preview_watermarked.mp4
Size: 2.45 MB
Duration: 5 seconds

👉 Open with: VLC, Windows Media Player, or your browser
============================================================

Opening preview video...
```

Video sẽ tự động open trong media player.

---

## 🎯 Adjustment Tips

### Logo Too Big?
```json
"scale": 0.15 → 0.12 (or 0.10)
```

### Logo Too Small?
```json
"scale": 0.15 → 0.18 (or 0.20)
```

### Logo Too Transparent?
```json
"opacity": 0.6 → 0.8 (or 0.9)
```

### Logo Too Opaque?
```json
"opacity": 0.9 → 0.7 (or 0.6)
```

### Text Too Small?
```json
"font_size": 20 → 24 (or 28)
```

### Text Overlapping Logo?
```json
"text": {
  "position": "bottom-left",  // Move to different corner
  "margin": 40                // Increase spacing
}
```

---

## 💡 Pro Tips

### Test Multiple Configurations

```
1. Config A: Logo top-right, size 0.15
   → Preview → Check

2. Edit config
3. Config B: Logo bottom-right, size 0.12
   → Preview → Check

4. Pick best
5. Process all videos
```

### Quick Iteration

```bash
# Edit config
# Run preview
python watermark-preview.py

# Check result
# Edit again
# Run preview
python watermark-preview.py

# Repeat until happy
```

### Logo Quality

Watermark quality depends on logo:
- ✅ High-res PNG (500x500px+)
- ✅ Transparent background (PNG with alpha)
- ✅ Clean, clear design
- ✅ Vector (SVG → export as PNG)

---

## 🐛 Troubleshooting

### ❌ Preview doesn't open automatically

**Solution:**
- Manually navigate to `preview_watermarked.mp4`
- Right-click → Open with → Media Player

### ❌ Logo not showing in preview

**Check:**
- Logo file exists: `assets/watermark-logo.png` ✓
- Path correct in config ✓
- PNG is valid (not corrupted) ✓

### ❌ Text not showing

**Check:**
- `"enabled": true` in config ✓
- Text content not empty ✓
- Font size reasonable (18-48) ✓

### ❌ Preview takes too long

- Normal: ~10-30 seconds (includes video generation)
- If slower: Check CPU usage, maybe running other heavy apps

---

## 📹 Using Custom Video for Preview

Instead of auto-generated test video, use your own:

### VS Code:
```
1. Open your video file
2. Ctrl + Shift + P → Run Task
3. Select: "👁️ Preview with Custom Video"
```

### CLI:
```bash
python watermark-preview.py path/to/video.mp4
```

This will create preview with **your actual video** + watermark.

---

## ✅ Workflow Summary

```
1. Edit watermark-config.json
   ↓
2. Run: python watermark-preview.py
   ↓
3. Check: preview_watermarked.mp4
   ↓
4. Happy? → Process all videos
   Not happy? → Adjust config → Go to step 2
```

---

## 🎉 Once You're Happy

When preview looks good:

```bash
# Process all videos
python watermark-batch.py
```

Output:
```
videos-watermarked/
├── video1_watermarked.mp4
├── video2_watermarked.mp4
└── ...
```

All videos will have **same watermark** as preview! ✓

---

**Pro Tip:** Keep preview file to show to client/team for approval before processing hundreds of videos! 🎬✨
