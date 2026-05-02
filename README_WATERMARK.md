# 🎬 Watermark Burning System - Complete Guide

Professional video watermarking solution cho MERN Movie Project.

---

## 📦 Files Tạo Ra

| File | Mục đích |
|------|---------|
| `watermark-config.json` | Cấu hình watermark (logo, text, encoding) |
| `watermark-batch.py` | Python script xử lý (khuyến khích) |
| `watermark-batch.bat` | Windows batch script |
| `WATERMARK_SETUP.md` | Hướng dẫn install & cấu hình |
| `FFMPEG_COMMANDS.md` | Reference FFmpeg commands |
| `VSCODE_SETUP.md` | Setup VS Code tasks |
| `.vscode/tasks.json` | VS Code task definitions (manual copy) |

---

## 🚀 QUICK START (5 Phút)

### Step 1: Install FFmpeg
```powershell
# Windows (PowerShell with Admin)
choco install ffmpeg

# macOS
brew install ffmpeg

# Linux
sudo apt install ffmpeg
```

### Step 2: Prepare Watermark Logo
```
📁 assets/
   └── watermark-logo.png (PNG with transparency)
```

### Step 3: Run Watermarking
```bash
# Put videos in:
📁 videos-to-watermark/
   ├── movie1.mp4
   ├── movie2.mkv
   └── ...

# Run:
python watermark-batch.py

# Output:
📁 videos-watermarked/
   ├── movie1_watermarked.mp4
   ├── movie2_watermarked.mp4
   └── ...
```

---

## 🎯 What It Does

✅ **Burn watermark vào video** - Hard watermark, không thể xóa
✅ **Logo + Text** - Hỗ trợ cả hình ảnh và chữ
✅ **Batch processing** - Xử lý hàng loạt video
✅ **Custom position** - Top, bottom, left, right, center
✅ **Transparent PNG** - Support logo trong suốt
✅ **Adjustable opacity** - Điều chỉnh độ mờ
✅ **H.264 encoding** - Compatible mọi device
✅ **Audio preserved** - Giữ nguyên âm thanh

---

## 📊 Quality Settings

```json
{
  "preset": "medium",  // fast, medium, slow
  "crf": 23           // 18=best, 28=fast (lower=better)
}
```

| Setting | Speed | Quality | Output Size |
|---------|-------|---------|-------------|
| `fast` + CRF 28 | ⚡ 10 min/1hr | 70% | 📦 200MB |
| `medium` + CRF 23 | ⚖️ 30 min/1hr | 90% | 📦 300MB |
| `slow` + CRF 18 | 🐢 60 min/1hr | 98% | 📦 500MB |

---

## 🎨 Watermark Positions

```
┌─────────────────────────────┐
│ 🔶 TOP-LEFT    TOP-RIGHT 🔶 │
│                             │
│                             │
│                             │
│ 🔶 BOTTOM-LEFT  BOTTOM-🔶   │
└─────────────────────────────┘
```

Edit `watermark-config.json`:
```json
"position": "bottom-right"  // top-right, bottom-right, etc.
```

---

## 💻 How to Run

### Option 1: VS Code (Recommended)
```
1. Ctrl + Shift + B  (hoặc Ctrl+Shift+P → Run Task)
2. Select: 🎬 Watermark Videos (Python)
3. Watch progress in Terminal
```

### Option 2: Python Script
```bash
python watermark-batch.py
```

### Option 3: Batch File
```cmd
watermark-batch.bat
```

### Option 4: Direct FFmpeg Command
```bash
ffmpeg -i input.mp4 \
  -filter_complex "overlay=x=W-w-20:y=H-h-20" \
  output.mp4
```

---

## 🔧 Configuration

Edit `watermark-config.json`:

```json
{
  "watermark": {
    "logo": {
      "path": "./assets/watermark-logo.png",
      "position": "top-right",
      "scale": 0.15,        // 10-20% recommended
      "opacity": 0.8,       // 0.0-1.0
      "margin": 20          // pixels from edge
    },
    "text": {
      "enabled": true,
      "content": "© 2024 MovieName",
      "position": "bottom-right",
      "font_size": 24,      // 18-32 recommended
      "font_color": "white",
      "opacity": 0.7,       // 0.3-0.9
      "margin": 20
    }
  },
  "encoding": {
    "codec": "libx264",     // H.264 video codec
    "preset": "medium",     // fast, medium, slow
    "crf": 23               // 18-28 recommended
  }
}
```

---

## 📈 Performance

**Estimated Processing Time** (per 1-hour video):

| Preset | Time | Quality |
|--------|------|---------|
| fast | 15-20 min | Good |
| medium | 40-50 min | Very Good |
| slow | 90+ min | Excellent |

---

## ✨ Features

### ✅ Professional Watermarking
- Burn vĩnh viễn vào video
- Người tải về không thể xóa
- Bảo vệ tác quyền

### ✅ Flexible Layout
- Multiple positions
- Adjustable size & opacity
- Logo + text support

### ✅ Batch Processing
- Xử lý hàng loạt video
- Auto-naming output
- Progress tracking

### ✅ Quality Control
- Customizable codec
- CRF/preset tuning
- Audio preservation

### ✅ Easy Integration
- VS Code tasks
- Python/Batch scripts
- FFmpeg commands

---

## 🎓 Examples

### Professional Branding
```json
"logo": {
  "position": "top-right",
  "scale": 0.12,
  "opacity": 0.9
},
"text": {
  "content": "© 2024 MyStudio",
  "position": "bottom-right",
  "font_size": 20,
  "opacity": 0.6
}
```

### Subtle Watermark
```json
"logo": {
  "position": "bottom-right",
  "scale": 0.08,
  "opacity": 0.4
},
"text": {
  "enabled": false
}
```

### Large Centered Text
```json
"logo": {
  "enabled": false
},
"text": {
  "content": "CONFIDENTIAL",
  "position": "center",
  "font_size": 48,
  "opacity": 0.3
}
```

---

## 🔍 File Structure

```
MERN_Movie_Project/
│
├── 📄 Files created:
│   ├── watermark-config.json
│   ├── watermark-batch.py
│   ├── watermark-batch.bat
│   ├── WATERMARK_SETUP.md
│   ├── FFMPEG_COMMANDS.md
│   ├── VSCODE_SETUP.md
│   └── README_WATERMARK.md (this file)
│
├── 📁 Thư mục bạn cần tạo:
│   ├── .vscode/
│   │   └── tasks.json (copy from outputs)
│   ├── assets/
│   │   └── watermark-logo.png
│   ├── videos-to-watermark/
│   └── videos-watermarked/
│
└── 📄 Project files:
    ├── package.json
    ├── .env
    └── ... (existing project files)
```

---

## 🆘 Troubleshooting

### FFmpeg Not Found
```
❌ "FFmpeg not found"
✅ Solution: choco install ffmpeg
   hoặc tải từ https://ffmpeg.org/download.html
```

### Watermark Not Showing
```
❌ Watermark không hiện
✅ Check:
   - Logo file exists: assets/watermark-logo.png
   - Path đúng trong config
   - PNG has transparency
```

### Video Output Huge
```
❌ File output quá lớn
✅ Solutions:
   - Giảm CRF: 23 → 25-26
   - Giảm resolution: scale=1280:-1
   - Thay preset: slow → medium
```

### Processing Very Slow
```
❌ Quá chậm
✅ Solutions:
   - Tăng CRF: 23 → 26-28
   - Thay preset: medium → fast
   - Giảm resolution
```

---

## 📚 Documentation Files

1. **WATERMARK_SETUP.md**
   - FFmpeg installation
   - Configuration guide
   - Quality presets
   - Troubleshooting

2. **FFMPEG_COMMANDS.md**
   - Direct FFmpeg commands
   - Position reference
   - Batch processing
   - Advanced options

3. **VSCODE_SETUP.md**
   - VS Code tasks setup
   - Keyboard shortcuts
   - Terminal integration
   - Custom keybindings

---

## 🚀 Next Steps

1. ✅ Copy files từ outputs folder
2. ✅ Install FFmpeg
3. ✅ Chuẩn bị watermark logo
4. ✅ Edit `watermark-config.json`
5. ✅ Put videos in `videos-to-watermark/`
6. ✅ Run `python watermark-batch.py`
7. ✅ Check output in `videos-watermarked/`

---

## 💡 Pro Tips

### Batch Processing Efficiently
```
Đặt `preset: fast` để process nhanh
Chạy lúc không bận (đêm, cuối ngày)
```

### Testing First
```
Test với 1 video nhỏ trước
Xem preview > adjust config > process all
```

### File Organization
```
Gộp cùng loại video vào folder
Xử lý từng batch một
```

### Archiving
```
Backup video gốc
Lưu output watermarked
```

---

## 📞 Support Resources

- **FFmpeg Docs:** https://ffmpeg.org/documentation.html
- **VS Code Tasks:** https://code.visualstudio.com/docs/editor/tasks
- **Python subprocess:** https://docs.python.org/3/library/subprocess.html

---

## 🎬 Example Output

```
============================================================
FFmpeg Batch Watermark Burner v1.0
============================================================

✓ Config loaded: watermark-config.json
✓ FFmpeg available: ffmpeg version 6.0
✓ Input dir: C:\...\videos-to-watermark
✓ Output dir: C:\...\videos-watermarked

Found 3 video(s) to process

[1/3] Processing: movie1.mp4
Input:  C:\...\videos-to-watermark\movie1.mp4
Output: C:\...\videos-watermarked\movie1_watermarked.mp4
Codec: libx264, Preset: medium, CRF: 23
Starting encode...
[00:00:50] ... encoding ...
✓ SUCCESS: movie1
  Output size: 450.25 MB

[2/3] Processing: movie2.mkv
...
✓ SUCCESS: movie2
  Output size: 320.15 MB

============================================================
SUMMARY
============================================================
Total:      3
Successful: 3 ✓
Failed:     0 ✗
Output:     C:\...\videos-watermarked
============================================================
```

---

## 🎉 Done!

Bạn giờ có một **professional video watermarking system** hoàn chỉnh.

**Các tính năng:**
✅ Tự động batch processing
✅ Burn vĩnh viễn vào video
✅ Cấu hình linh hoạt
✅ VS Code integration
✅ Chất lượng cao

**Hạnh phúc làm video!** 🎬✨

---

**Version:** 1.0
**Last Updated:** 2026-04-30
**Created for:** MERN Movie Project
