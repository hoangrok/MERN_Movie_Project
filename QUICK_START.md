# 🚀 QUICK START - Watermark in 5 Minutes

Hướng dẫn nhanh gọn để bắt đầu ngay.

---

## ⚡ 5-Minute Setup

### 1️⃣ Install FFmpeg (2 min)

**Windows (PowerShell as Admin):**
```powershell
choco install ffmpeg
```

**Or download manually:**
- https://ffmpeg.org/download.html

---

### 2️⃣ Prepare Logo (2 min)

Create folder:
```
📁 assets/
   └── watermark-logo.png
```

**Requirements:**
- ✅ PNG format
- ✅ 500x500px or larger
- ✅ Transparent background (PNG with alpha)

---

### 3️⃣ Copy Config (1 min)

Edit: `watermark-config.json`

Change this line:
```json
"content": "© 2024 MovieName"
```

To your text:
```json
"content": "© 2024 YourStudio"
```

---

## 🎯 Preview Before Processing

```bash
# Run this in VS Code or terminal
python watermark-preview.py
```

Wait 10-20 seconds → Video opens automatically

**Like it?** Move to next step
**Don't like it?** Edit config and preview again

---

## 🎬 Process All Videos

### Step 1: Add Videos

Copy all videos to:
```
📁 videos-to-watermark/
   ├── video1.mp4
   ├── video2.mkv
   └── ...
```

### Step 2: Run in VS Code

**Fastest way:**
```
Ctrl + Shift + B
```

**Or:**
```
Ctrl + Shift + P → Run Task → 🎬 Watermark Videos (Python)
```

### Step 3: Wait for Done

Terminal shows progress:
```
[1/5] Processing: video1.mp4...
[2/5] Processing: video2.mp4...
[3/5] Processing: video3.mp4...
...
✓ All done!
```

### Step 4: Get Results

Check folder:
```
📁 videos-watermarked/
   ├── video1_watermarked.mp4
   ├── video2_watermarked.mp4
   └── ...
```

All videos now have watermark burned in! ✓

---

## 📋 What You Have

| File | Purpose |
|------|---------|
| `watermark-config.json` | Cấu hình (edit this!) |
| `watermark-batch.py` | Main script (chạy cái này) |
| `watermark-preview.py` | Preview generator |
| `WATERMARK_EXAMPLES.md` | Copy-paste configs |
| `WATERMARK_PREVIEW_GUIDE.md` | Preview tutorial |
| `VS_CODE_INTEGRATION.md` | VS Code setup |

---

## 🎨 Popular Configs

**Pick one, copy it:**

### Professional
```json
"logo": { "position": "top-right", "scale": 0.15 },
"text": { "content": "© 2024 YourStudio" }
```

### Minimal
```json
"logo": { "position": "bottom-right", "scale": 0.1 },
"text": { "enabled": false }
```

### Bold
```json
"logo": { "position": "top-left", "scale": 0.2 },
"text": { "content": "YOUR BRAND", "font_size": 28 }
```

More options in: `WATERMARK_EXAMPLES.md`

---

## ⚙️ Speed vs Quality

### ⚡ Fast (10 min per hour)
```json
"preset": "fast",
"crf": 26
```

### ⚖️ Balanced (40 min per hour) ⭐ Recommended
```json
"preset": "medium",
"crf": 23
```

### 🏆 Best Quality (90 min per hour)
```json
"preset": "slow",
"crf": 18
```

---

## 💡 Tips

✅ Test with **preview** first
✅ Start with **medium preset**
✅ Logo should be PNG with transparency
✅ Text position same as logo keeps clean look
✅ Opacity 0.8 for logo, 0.7 for text is balanced

❌ Don't skip preview
❌ Don't use JPEG for logo (no transparency)
❌ Don't set opacity to 1.0 (too bold)

---

## 🆘 Troubleshooting

### Preview doesn't work
```
Check: FFmpeg installed? (ffmpeg -version)
Check: Logo file exists? (assets/watermark-logo.png)
Check: Config JSON valid? (use online JSON validator)
```

### Watermark looks wrong
```
Edit config → Preview again → Repeat
```

### Processing is slow
```
Change: "preset": "fast"
or
Change: "crf": 26
```

### Video quality is bad
```
Change: "crf": 20 (was 23)
or
Change: "preset": "slow"
```

---

## 📊 Typical Timeline

```
FFmpeg Install:      ~5 minutes
Logo Prepare:        ~5 minutes
Config Setup:        ~2 minutes
Preview Test:        ~20 seconds
Fix Config:          ~1 minute (if needed)
Process 5 videos:    ~5 minutes (medium preset)
─────────────────────────────
TOTAL:              ~20 minutes
```

---

## 🎯 Next Steps

1. ✅ Install FFmpeg
2. ✅ Create `assets/watermark-logo.png`
3. ✅ Edit `watermark-config.json`
4. ✅ Run preview: `python watermark-preview.py`
5. ✅ Put videos in `videos-to-watermark/`
6. ✅ Run batch: `Ctrl + Shift + B`
7. ✅ Done! Check `videos-watermarked/`

---

## 📚 Full Guides

- **WATERMARK_SETUP.md** - Complete setup guide
- **FFMPEG_COMMANDS.md** - FFmpeg command reference
- **WATERMARK_EXAMPLES.md** - Ready-to-use configs
- **WATERMARK_PREVIEW_GUIDE.md** - Preview in detail
- **VS_CODE_INTEGRATION.md** - VS Code tasks

---

## ✅ Checklist

Before first run:

- [ ] FFmpeg installed
- [ ] Logo PNG created (500x500+, transparent)
- [ ] `watermark-config.json` edited
- [ ] Tested preview
- [ ] Looks good!

---

## 🎬 Example: Your First Run

```bash
# 1. Copy 1 test video to videos-to-watermark/
#    Example: test.mp4

# 2. Edit watermark-config.json
#    Change: "© 2024 MovieName" → "© 2024 MyStudio"

# 3. Preview (in VS Code)
#    Ctrl + Shift + P → Run Task → 👁️ Preview Watermark

# 4. Check preview_watermarked.mp4 (auto-opens)
#    "Looks perfect!"

# 5. Process (in VS Code)
#    Ctrl + Shift + B

# 6. Wait ~1 minute

# 7. Check videos-watermarked/
#    test_watermarked.mp4 ✓ Has watermark!

# 8. Happy? Copy more videos and repeat step 5-7
```

---

## 🎉 You're Done!

Now you have:
✅ Professional watermarking system
✅ Batch processing
✅ Preview testing
✅ VS Code integration

**Process videos in seconds!** 🚀

---

## 🤔 FAQ

**Q: Can I remove watermark?**
A: No! It's burned into video file permanently ✓

**Q: What video formats work?**
A: MP4, MKV, AVI, MOV, FLV, WMV

**Q: Can I use JPEG logo?**
A: No, must be PNG with transparency

**Q: How long does processing take?**
A: Depends on preset
- Fast: 50% of video duration
- Medium: 100% (1 hour video = 40 min processing)
- Slow: 200% (1 hour video = 90 min processing)

**Q: Can I change text between videos?**
A: Not with batch processor. Edit config for each batch.

**Q: What if video has no audio?**
A: Works fine! Only processes video stream.

---

## 📞 Help

1. Read full guides in this folder
2. Check `WATERMARK_EXAMPLES.md` for config templates
3. Run preview multiple times if unsure
4. Check FFmpeg is working: `ffmpeg -version`

---

**Ready to watermark?** 🎬✨

Start with **Step 1: Install FFmpeg** above!
