# 🎬 FFmpeg Batch Watermark Burner Setup

Hướng dẫn thiết lập watermarking tự động cho video project.

## 📋 Yêu cầu

- ✅ FFmpeg (xử lý video)
- ✅ Python 3.7+ (tùy chọn, nhưng khuyến khích)
- ✅ Watermark logo (PNG với nền trong suốt)

---

## 🚀 QUICK START (5 phút)

### 1️⃣ Install FFmpeg

**Windows (Chocolatey):**
```powershell
choco install ffmpeg
```

**Windows (Manual):**
- Tải: https://ffmpeg.org/download.html
- Extract và add vào PATH

**macOS:**
```bash
brew install ffmpeg
```

**Linux (Ubuntu):**
```bash
sudo apt install ffmpeg
```

---

### 2️⃣ Chuẩn bị Watermark Logo

1. Tạo thư mục `assets`:
   ```
   MERN_Movie_Project/
   └── assets/
       └── watermark-logo.png
   ```

2. Logo requirements:
   - ✅ Format: PNG với alpha transparency
   - ✅ Size: 500x500px hoặc lớn hơn
   - ✅ Background: trong suốt
   - ✅ Style: logo của bạn (clear, professional)

---

### 3️⃣ Cấu hình Watermark

Edit file `watermark-config.json`:

```json
{
  "watermark": {
    "logo": {
      "path": "./assets/watermark-logo.png",
      "position": "top-right",          // top-right, bottom-right, top-left, bottom-left
      "scale": 0.15,                    // 0.1 = 10% của video width
      "opacity": 0.8,                   // 0.0 = transparent, 1.0 = opaque
      "margin": 20                      // pixels từ edge
    },
    "text": {
      "enabled": true,
      "content": "© 2024 MovieName",    // Your copyright text
      "position": "bottom-right",
      "font_size": 24,
      "font_color": "white",
      "opacity": 0.7,
      "margin": 20
    }
  },
  "encoding": {
    "codec": "libx264",                 // h264 codec
    "preset": "medium",                 // fast, medium, slow (trade-off speed vs quality)
    "crf": 23                           // 0-51, lower = better quality (18-28 recommended)
  },
  "input_dir": "./videos-to-watermark",
  "output_dir": "./videos-watermarked"
}
```

**Điều chỉnh theo nhu cầu:**

| Setting | Giải thích |
|---------|-----------|
| `position` | Vị trí watermark trên video |
| `scale` | Kích thước (0.1 = 10%, 0.2 = 20%) |
| `opacity` | Độ mờ (0.8 = hơi mờ, 1.0 = đặc) |
| `font_size` | Cỡ chữ text watermark |
| `preset` | `fast` (nhanh, chất lượng thấp), `medium` (cân bằng), `slow` (chậm, tốt nhất) |
| `crf` | 18-28 tốt, 23 cân bằng, <18 siêu chất lượng (file lớn) |

---

## 💻 CHẠY WATERMARKING

### Option 1: Python (Khuyến khích)

**Tạo thư mục input:**
```bash
mkdir videos-to-watermark
```

**Copy video vào thư mục này, rồi chạy:**
```bash
python watermark-batch.py
```

**Output sẽ trong:**
```
videos-watermarked/
```

---

### Option 2: Batch File (Windows)

```cmd
watermark-batch.bat
```

Sẽ tự động xử lý tất cả video trong `videos-to-watermark/`.

---

### Option 3: VS Code Tasks

1. Copy file `tasks.json` từ outputs folder vào `.vscode/tasks.json` (tạo folder nếu cần)

2. Trong VS Code:
   - Press `Ctrl + Shift + B` → chọn task
   - Hoặc `Ctrl + Shift + P` → "Run Task"

---

## 🎯 Watermark Quality Presets

### ⚡ FAST (Speed Priority)
```json
"preset": "fast",
"crf": 28
```
- Mã hóa nhanh (10-20 phút/1080p)
- Chất lượng trung bình
- File size: nhỏ

### ⚖️ BALANCED (Recommended)
```json
"preset": "medium",
"crf": 23
```
- Mã hóa cân bằng (30-50 phút/1080p)
- Chất lượng tốt
- File size: cân bằng

### 🏆 BEST (Quality Priority)
```json
"preset": "slow",
"crf": 18
```
- Mã hóa chậm (60-90 phút/1080p)
- Chất lượng cao
- File size: lớn

---

## 📊 Ví dụ Kết quả

**Trước:** `movie.mp4` → **Sau:** `movie_watermarked.mp4`

✅ Watermark đã burn vào video
✅ Người tải về sẽ thấy watermark
✅ Không thể xóa bỏ
✅ Chất lượng gốc giữ nguyên

---

## 🔧 Xử lý Lỗi

### ❌ "FFmpeg not found"
```
→ Install FFmpeg (xem mục Install FFmpeg ở trên)
```

### ❌ "Logo file not found"
```
→ Check đường dẫn trong watermark-config.json
→ Đảm bảo file tồn tại: assets/watermark-logo.png
```

### ❌ Video chất lượng kém
```
→ Giảm CRF xuống 20-21 (thay vì 23)
→ Thay đổi preset từ "fast" → "medium" hoặc "slow"
```

### ❌ Quá chậm
```
→ Tăng CRF lên 24-25
→ Thay preset thành "fast"
→ Giảm video resolution (scale: 1280:-1)
```

---

## 🎨 Custom Watermark Examples

### Góc dưới cùng bên trái + Logo lớn
```json
"logo": {
  "position": "bottom-left",
  "scale": 0.25,
  "margin": 30
}
```

### Đôi watermark (logo + text cùng vị trí)
```json
"logo": {
  "position": "bottom-right",
  "scale": 0.12
},
"text": {
  "position": "bottom-right",
  "margin": 100  // Tách riêng để không overlap
}
```

### Text chỉ (không logo)
```json
"logo": {
  "enabled": false
},
"text": {
  "enabled": true,
  "content": "CONFIDENTIAL",
  "position": "center"
}
```

---

## ⚙️ FFmpeg Command Reference

Nếu muốn tuỳ chỉnh thêm, đây là command cơ bản:

```bash
ffmpeg -i input.mp4 \
  -filter_complex \
  "[0:v]overlay=x=10:y=10:alpha=0.8[v]; \
   [v]drawtext=text='© 2024':fontsize=24[out]" \
  -map "[out]" -map "0:a" \
  -c:v libx264 -preset medium -crf 23 \
  -c:a aac -b:a 128k \
  output.mp4
```

---

## 📁 Project Structure

```
MERN_Movie_Project/
├── watermark-config.json           ← Edit cấu hình ở đây
├── watermark-batch.py              ← Script xử lý (Python)
├── watermark-batch.bat             ← Script xử lý (Windows)
├── WATERMARK_SETUP.md              ← Hướng dẫn này
│
├── assets/
│   └── watermark-logo.png          ← Logo watermark
│
├── videos-to-watermark/            ← Copy video vào đây
│   ├── movie1.mp4
│   ├── movie2.mkv
│   └── ...
│
└── videos-watermarked/             ← Output tự động tạo
    ├── movie1_watermarked.mp4
    ├── movie2_watermarked.mp4
    └── ...
```

---

## 🎓 Tips & Tricks

### Tính toán thời gian xử lý
```
Công thức gần đúng:
- Fast preset:   input_duration / 3-4
- Medium preset: input_duration / 1.5-2
- Slow preset:   input_duration / 0.5-1

Ví dụ: Video 60 phút, medium preset
→ Thời gian mã hóa ≈ 30-40 phút
```

### Watermark bình minh/hoàng hôn
```
Dùng opacity thấp (0.3-0.5) để watermark nhìn mềm mại
```

### Watermark ở giữa
```
Edit watermark-batch.py, thêm position "center":
"position": "center"
```

### Kiểm tra file output
```
ffprobe videos-watermarked/movie_watermarked.mp4
```

---

## 📞 Support

Nếu có vấn đề:
1. Check error message từ FFmpeg
2. Xem troubleshooting ở trên
3. Verify config file syntax (JSON format)
4. Đảm bảo ffmpeg installed và trong PATH

---

## 🎉 Hoàn tất!

Giờ bạn có thể:
✅ Watermark tự động hàng loạt video
✅ Burn vĩnh viễn vào video file
✅ Người tải về không thể xóa
✅ Bảo vệ nội dung tác quyền

**Hạnh phúc làm video!** 🎬✨
