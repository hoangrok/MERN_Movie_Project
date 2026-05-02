# 🎬 CÁCH DÙNG - Hướng Dẫn Chi Tiết Step-by-Step

Hướng dẫn cụ thể từng bước để dùng watermark system.

---

## 📋 Mục Lục
1. [Chuẩn Bị Trước](#chuẩn-bị-trước)
2. [Bước 1: Install FFmpeg](#bước-1-install-ffmpeg)
3. [Bước 2: Chuẩn Bị Logo](#bước-2-chuẩn-bị-logo)
4. [Bước 3: Edit Config](#bước-3-edit-config)
5. [Bước 4: Test Preview](#bước-4-test-preview)
6. [Bước 5: Process Videos](#bước-5-process-videos)
7. [Bước 6: Check Kết Quả](#bước-6-check-kết-quả)

---

## 🎯 Chuẩn Bị Trước

Bạn cần chuẩn bị:
- [ ] Một logo (hình ảnh công ty/brand)
- [ ] Video file (MP4, MKV, AVI, etc.)
- [ ] Một máy tính (Windows, Mac, hoặc Linux)

---

## ✅ Bước 1: Install FFmpeg

FFmpeg là tool chuyên nghiệp xử lý video. Bạn phải cài nó.

### **Windows - Cách Đơn Giản Nhất (Dùng Chocolatey)**

**Step 1.1:** Mở PowerShell với quyền Admin
- Nhấn `Windows + X`
- Chọn `Windows PowerShell (Admin)` hoặc `Terminal (Admin)`

**Step 1.2:** Copy-paste lệnh này vào terminal:
```powershell
choco install ffmpeg
```

**Step 1.3:** Chọn `Y` (Yes) khi hỏi

**Step 1.4:** Chờ cài đặt xong (2-3 phút)

**Step 1.5:** Kiểm tra xem FFmpeg đã cài chưa:
```powershell
ffmpeg -version
```

Nếu xuất hiện `ffmpeg version...` → **Thành công!** ✓

---

### **Nếu không có Chocolatey**

1. Vào: https://ffmpeg.org/download.html
2. Chọn Windows → Download
3. Extract file vào một folder
4. Add folder vào Windows PATH:
   - Mở: System Properties → Environment Variables
   - Thêm FFmpeg folder vào PATH
5. Restart computer
6. Test: `ffmpeg -version`

---

### **macOS**

```bash
brew install ffmpeg
```

---

### **Linux (Ubuntu)**

```bash
sudo apt install ffmpeg
```

---

## 🖼️ Bước 2: Chuẩn Bị Logo

Logo của bạn sẽ hiện trên mỗi video.

### **Yêu Cầu Logo**

✅ **Format:** PNG (không phải JPEG!)
✅ **Size:** Tối thiểu 300x300px (500x500px tốt hơn)
✅ **Background:** Trong suốt (không nền trắng/đen)

### **Cách Tạo Logo**

**Option 1: Dùng Figma (Free, Online)**
1. Vào: https://www.figma.com
2. Tạo một design nhỏ (300x300px)
3. Thêm logo/tên công ty
4. Export as PNG (màu nền: transparent)

**Option 2: Dùng Photoshop**
1. Tạo file mới: 500x500px
2. Thêm logo
3. Delete nền (chỉ giữ logo)
4. Export as PNG

**Option 3: Dùng Paint.NET (Free)**
1. Tải: https://www.getpaint.net
2. Mở hoặc tạo logo
3. File → Export As → PNG

### **Đặt Logo Vào Project**

1. Tạo folder: `assets` (ngang hàng với watermark-config.json)
   ```
   MERN_Movie_Project/
   ├── assets/                    ← Tạo folder này
   │   └── watermark-logo.png     ← Đặt logo vào đây
   ├── watermark-config.json
   └── ...
   ```

2. Copy file `watermark-logo.png` vào folder `assets/`

---

## 🎛️ Bước 3: Edit Config

Config file chứa tất cả cài đặt watermark.

### **Step 3.1: Mở File Config**

Mở file: `watermark-config.json`
- Bằng VS Code (khuyến khích)
- Hoặc bằng Notepad

### **Step 3.2: Tìm Text Content**

Tìm dòng này:
```json
"content": "© 2024 MovieName"
```

**Thay thế** thành text của bạn:
```json
"content": "© 2024 YourStudio"
```

Ví dụ:
```json
"content": "© 2024 Netflix"
"content": "Produced by XYZ Films"
"content": "My YouTube Channel"
```

### **Step 3.3: Chọn Vị Trí Logo**

Tìm:
```json
"position": "bottom-right"
```

Có 4 vị trí:
- `"top-right"` - Góc trên bên phải
- `"top-left"` - Góc trên bên trái
- `"bottom-right"` - Góc dưới bên phải
- `"bottom-left"` - Góc dưới bên trái

Ví dụ: Đặt logo ở góc trên bên phải
```json
"position": "top-right"
```

### **Step 3.4: Tùy Chỉnh Kích Thước Logo**

Tìm:
```json
"scale": 0.15
```

Giá trị:
- `0.10` = 10% (rất nhỏ)
- `0.15` = 15% (vừa) ⭐ **Khuyến khích**
- `0.20` = 20% (lớn)
- `0.25` = 25% (rất lớn)

### **Step 3.5: Tùy Chỉnh Độ Mờ Logo**

Tìm:
```json
"opacity": 0.8
```

Giá trị:
- `0.3` = Rất mờ (gần như vô hình)
- `0.5` = Mờ trung bình
- `0.8` = Hiện rõ ⭐ **Khuyến khích**
- `1.0` = Hoàn toàn đặc (không thấy qua video)

### **Step 3.6: Tùy Chỉnh Font Size**

Tìm:
```json
"font_size": 24
```

Giá trị:
- `16` = Nhỏ
- `20` = Vừa
- `24` = Lớn ⭐ **Khuyến khích**
- `32` = Rất lớn

### **Step 3.7: Chọn Chất Lượng Processing**

Tìm:
```json
"preset": "medium",
"crf": 23
```

Có 3 tùy chọn:

**Fast (Nhanh nhất, chất lượng thấp):**
```json
"preset": "fast",
"crf": 26
```
⏱️ Thời gian: ~15 phút/giờ video
📊 Chất lượng: 70%

**Medium (Cân bằng) ⭐ Khuyến khích:**
```json
"preset": "medium",
"crf": 23
```
⏱️ Thời gian: ~40 phút/giờ video
📊 Chất lượng: 90%

**Slow (Chậm nhất, chất lượng cao):**
```json
"preset": "slow",
"crf": 18
```
⏱️ Thời gian: ~90 phút/giờ video
📊 Chất lượng: 98%

### **Step 3.8: Save File**

Nhấn: `Ctrl + S` để save
- VS Code: Tự động save
- Notepad: File → Save

### **Ví Dụ Config Hoàn Chỉnh**

```json
{
  "watermark": {
    "logo": {
      "path": "./assets/watermark-logo.png",
      "position": "bottom-right",
      "scale": 0.15,
      "opacity": 0.8,
      "margin": 20
    },
    "text": {
      "enabled": true,
      "content": "© 2024 MyStudio",
      "position": "bottom-right",
      "font_size": 24,
      "font_color": "white",
      "opacity": 0.7,
      "margin": 20
    }
  },
  "encoding": {
    "codec": "libx264",
    "preset": "medium",
    "crf": 23
  },
  "input_dir": "./videos-to-watermark",
  "output_dir": "./videos-watermarked"
}
```

---

## 👁️ Bước 4: Test Preview (QUAN TRỌNG!)

**KHÔNG SKIP BƯỚC NÀY!** 

Preview giúp bạn xem watermark trông thế nào trước khi xử lý tất cả videos.

### **Option A: Dùng VS Code (Khuyến Khích)**

**Step 4.1:** Mở VS Code
- Open folder: MERN_Movie_Project

**Step 4.2:** Chạy Preview Task
- Nhấn: `Ctrl + Shift + P`
- Gõ: `Run Task`
- Chọn: `👁️ Preview Watermark (5 sec test)`

**Step 4.3:** Chờ xong (10-20 giây)
- Video sẽ tự động mở
- Xem kết quả watermark

---

### **Option B: Dùng Terminal/PowerShell**

**Step 4.1:** Mở PowerShell
- Windows + X → Windows PowerShell

**Step 4.2:** Navigate tới folder project
```powershell
cd C:\Users\hoang\OneDrive\Desktop\MERN_Movie_Project
```

**Step 4.3:** Chạy preview script
```bash
python watermark-preview.py
```

**Step 4.4:** Chờ xong (~20 giây)
- Video preview mở tự động
- File: `preview_watermarked.mp4`

---

### **Kiểm Tra Preview**

Video preview sẽ hiển thị:
- Logo watermark ở góc
- Text copyright
- Độ mờ/đặc
- Vị trí

**Bạn hài lòng?**
- ✅ **YES** → Chuyển đến Bước 5
- ❌ **NO** → Quay lại Bước 3 (edit config) → Preview lại

### **Ví Dụ Điều Chỉnh**

**Logo quá lớn?**
```json
"scale": 0.15  →  "scale": 0.12
```
→ Preview lại

**Text quá nhỏ?**
```json
"font_size": 24  →  "font_size": 28
```
→ Preview lại

**Watermark quá đậm?**
```json
"opacity": 0.8  →  "opacity": 0.6
```
→ Preview lại

---

## 🎬 Bước 5: Process Videos

Giờ đã đến lúc watermark tất cả videos!

### **Step 5.1: Chuẩn Bị Videos**

1. Tạo folder (nếu chưa có):
   ```
   MERN_Movie_Project/
   └── videos-to-watermark/     ← Tạo folder này
   ```

2. Copy tất cả video vào folder này:
   ```
   videos-to-watermark/
   ├── video1.mp4
   ├── video2.mkv
   ├── video3.avi
   └── ...
   ```

### **Step 5.2: Chạy Watermark (Option A - VS Code)**

**Cách nhanh nhất:**
```
Ctrl + Shift + B
```

**Hoặc:**
1. Nhấn: `Ctrl + Shift + P`
2. Gõ: `Run Task`
3. Chọn: `🎬 Watermark Videos (Python)`

**Kết quả:**
- Terminal hiển thị progress
- Chỉ số: `[1/5] Processing: video1.mp4`
- Chờ xong → Xem `videos-watermarked/`

---

### **Step 5.3: Chạy Watermark (Option B - Terminal)**

**Mở PowerShell:**
```powershell
cd C:\Users\hoang\OneDrive\Desktop\MERN_Movie_Project
python watermark-batch.py
```

**Output sẽ hiển thị:**
```
============================================================
FFmpeg Batch Watermark Burner v1.0
============================================================

Found 3 video(s) to process

[1/3] Processing: video1.mp4
Input:  C:\...\videos-to-watermark\video1.mp4
Output: C:\...\videos-watermarked\video1_watermarked.mp4
Encoding...
✓ SUCCESS: video1
  Output size: 450.25 MB

[2/3] Processing: video2.mkv
...

[3/3] Processing: video3.avi
...

============================================================
SUMMARY
============================================================
Total:      3
Successful: 3 ✓
Failed:     0 ✗
============================================================
```

### **Step 5.4: Đợi Xong**

Thời gian tùy thuộc vào:
- **Độ dài video** (1 giờ = ~40 phút processing)
- **Số lượng video** (3 video = ~2 giờ)
- **Preset** (medium = 40 phút/giờ)

**Ví dụ:**
- 3 video × 30 phút mỗi cái = 90 phút (1.5 giờ)
- Hoặc chạy vào ban đêm

### **Stop Processing (Nếu Cần)**

Nhấn: `Ctrl + C` trong terminal

---

## ✅ Bước 6: Check Kết Quả

### **Step 6.1: Mở Output Folder**

**Bằng VS Code:**
1. Nhấn: `Ctrl + Shift + P`
2. Gõ: `Run Task`
3. Chọn: `📁 Open Output Folder`

**Hoặc:**
- Mở File Explorer
- Navigate tới: `videos-watermarked/`

### **Step 6.2: Xem Kết Quả**

Folder sẽ chứa:
```
videos-watermarked/
├── video1_watermarked.mp4      ← Có watermark ✓
├── video2_watermarked.mp4      ← Có watermark ✓
├── video3_watermarked.mp4      ← Có watermark ✓
└── ...
```

### **Step 6.3: Test Một File**

Mở một file bằng VLC hoặc Media Player:
- Kiểm tra watermark hiện không
- Kiểm tra chất lượng video
- Kiểm tra âm thanh

### **Step 6.4: Done! ✓**

Tất cả videos đã có watermark:
- ✅ Watermark đã burn vĩnh viễn
- ✅ Không ai có thể xóa được
- ✅ Sẵn sàng share/upload

---

## 🎯 Complete Example Walkthrough

**Situation:** Bạn có 5 video, muốn watermark với logo công ty

### **Timeline:**

```
0:00  Bước 1: cài FFmpeg
      $ choco install ffmpeg
      
0:05  Bước 2: tạo logo.png
      Tạo trong Figma/Photoshop
      Copy vào: assets/watermark-logo.png
      
0:10  Bước 3: edit config
      Thay "© 2024 MovieName" → "© 2024 MyCompany"
      Chọn: position = "bottom-right"
      Chọn: preset = "medium"
      Save file
      
0:12  Bước 4: test preview
      python watermark-preview.py
      ↓ Chờ 15 giây
      ↓ Video mở: preview_watermarked.mp4
      ✓ "Looks perfect!"
      
0:15  Bước 5: chuẩn bị videos
      Copy 5 videos vào: videos-to-watermark/
      
0:20  Bước 6: process all
      Ctrl + Shift + B (hoặc python watermark-batch.py)
      ↓ Chờ ~150 phút (5 × 30 min videos)
      ↓ Terminal hiển thị progress
      ↓ [1/5] Processing video1...
      ↓ [2/5] Processing video2...
      ↓ ...
      ↓ ✓ All done!
      
2:55  Bước 7: check results
      Mở: videos-watermarked/
      ✓ 5 video files có watermark
      ✓ Ready to upload!
```

---

## 💡 Tips & Tricks

### **Thay Đổi Config Nhanh**

Nếu bạn muốn watermark khác nhau:

**Cách 1:** Save config với tên khác
```
watermark-config.json          ← Default
watermark-config-v2.json       ← Variant 2
watermark-config-bold.json     ← Variant bold
```

**Cách 2:** Batch process từng lô
- Process 5 video với config A
- Thay config
- Process 5 video khác với config B

### **Tối Ưu Hóa Speed**

Nếu quá chậm:
```json
"preset": "medium"  →  "preset": "fast"
"crf": 23           →  "crf": 26
```

### **Cải Thiện Chất Lượng**

Nếu chất lượng không tốt:
```json
"preset": "medium"  →  "preset": "slow"
"crf": 23           →  "crf": 20
```

### **Thêm/Bỏ Text Watermark**

Bỏ text, chỉ giữ logo:
```json
"text": {
  "enabled": false     ← Thay true thành false
}
```

### **Thêm/Bỏ Logo Watermark**

Bỏ logo, chỉ giữ text:
```json
"logo": {
  "enabled": false     ← Thay true thành false
}
```

---

## 🆘 Troubleshooting

### ❌ "FFmpeg not found"

**Solution:**
```powershell
choco install ffmpeg
# Restart PowerShell
# Test: ffmpeg -version
```

### ❌ "Logo file not found"

**Check:**
1. Logo file tồn tại: `assets/watermark-logo.png` ?
2. Đường dẫn trong config đúng: `"path": "./assets/watermark-logo.png"` ?

### ❌ "Preview không mở"

**Solution:**
- Manually mở file: `preview_watermarked.mp4`
- Right-click → Open with → VLC/Media Player

### ❌ "Watermark không hiện"

**Check:**
1. Logo file không bị lỗi (thử mở logo.png xem có lỗi không)
2. Config đúng syntax (JSON validate)
3. Chạy preview xem watermark có hiện không

### ❌ "Processing quá chậm"

**Solution:**
```json
"preset": "fast"    # thay từ "medium"
"crf": 26          # thay từ 23
```

### ❌ "Video output file rất lớn"

**Solution:**
```json
"crf": 26    # tăng từ 23
"crf": 28    # hoặc cao hơn
```

---

## 📞 Quick Command Reference

```bash
# Test preview (5 seconds)
python watermark-preview.py

# Process all videos
python watermark-batch.py

# Check FFmpeg
ffmpeg -version

# OR in VS Code:
# Ctrl+Shift+B → Process all
# Ctrl+Shift+P → Run Task → Preview
```

---

## ✅ Complete Checklist

Trước khi bắt đầu:
- [ ] FFmpeg installed (`ffmpeg -version` works)
- [ ] Logo created (PNG, transparent, 500x500+)
- [ ] Config edited (text changed, preset chosen)
- [ ] Preview tested (looks good!)
- [ ] Videos copied to input folder
- [ ] Ready to process!

---

## 🎉 Success!

Bạn đã hoàn tất 6 bước! 🚀

Tất cả videos bây giờ có watermark đã burn vĩnh viễn.

**Next:** Upload videos hoặc share với khách hàng! 📤

---

**Cần giúp?**
- Xem lại guide này
- Check WATERMARK_EXAMPLES.md cho config examples
- Read START_HERE.md để hiểu thêm

**Happy watermarking!** 🎬✨
