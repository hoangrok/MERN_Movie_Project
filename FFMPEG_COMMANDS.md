# FFmpeg Watermarking Commands

Các lệnh FFmpeg để watermark video - dùng trực tiếp nếu cần.

---

## 🎯 1. Logo Only (Hình ảnh)

```bash
ffmpeg -i input.mp4 \
  -filter_complex "[0:v]overlay=x=W-w-20:y=H-h-20:alpha=0.8[out]" \
  -map "[out]" -map "0:a" \
  -c:v libx264 -preset medium -crf 23 \
  -c:a aac -b:a 128k \
  output.mp4
```

**Tham số:**
- `W-w-20:y=H-h-20` = bottom-right, 20px margin
- `alpha=0.8` = 80% opacity
- `preset medium` = cân bằng tốc độ/chất lượng

---

## 📝 2. Text Only

```bash
ffmpeg -i input.mp4 \
  -filter_complex "drawtext=text='© 2024 MovieName':fontsize=24:fontcolor=white@0.7:x=W-text_w-20:y=H-text_h-20[out]" \
  -map "[out]" -map "0:a" \
  -c:v libx264 -preset medium -crf 23 \
  -c:a aac -b:a 128k \
  output.mp4
```

---

## 🎬 3. Logo + Text (Khuyến khích)

```bash
ffmpeg -i input.mp4 \
  -filter_complex "[0:v]overlay=x=W-w-20:y=20:alpha=0.8[with_logo];[with_logo]drawtext=text='© 2024':fontsize=24:fontcolor=white@0.7:x=W-text_w-20:y=H-text_h-20[out]" \
  -map "[out]" -map "0:a" \
  -c:v libx264 -preset medium -crf 23 \
  -c:a aac -b:a 128k \
  output.mp4
```

---

## 📍 Position Reference

Thay đổi `x:y` để đặt vị trí:

```
TOP-LEFT:        x=20:y=20
TOP-RIGHT:       x=W-w-20:y=20
BOTTOM-LEFT:     x=20:y=H-h-20
BOTTOM-RIGHT:    x=W-w-20:y=H-h-20
CENTER:          x=(W-w)/2:y=(H-h)/2
```

**Giải thích:**
- `W` = video width
- `H` = video height
- `w` = watermark width
- `h` = watermark height

---

## 🎨 Opacity Settings

```
0.3 = 30% (rất mờ)
0.5 = 50% (mờ trung bình)
0.7 = 70% (nhìn thấy rõ)
0.9 = 90% (rất đặc)
1.0 = 100% (hoàn toàn đặc)
```

---

## ⚙️ Quality Presets

### Fast (Nhanh)
```bash
-preset fast -crf 28
```
Thời gian: ~50% video duration

### Medium (Cân bằng) ⭐ Khuyến khích
```bash
-preset medium -crf 23
```
Thời gian: ~100% video duration

### Slow (Chất lượng cao)
```bash
-preset slow -crf 18
```
Thời gian: ~200% video duration

---

## 🔄 Batch Processing (Windows)

```batch
@echo off
for %%f in (*.mp4) do (
    ffmpeg -i "%%f" ^
      -filter_complex "drawtext=text='© 2024':fontsize=24:fontcolor=white@0.7:x=W-text_w-20:y=H-text_h-20[out]" ^
      -map "[out]" -map "0:a" ^
      -c:v libx264 -preset medium -crf 23 ^
      -c:a aac -b:a 128k ^
      "%%~nf_watermarked.mp4" -y
)
```

Chạy lệnh này từ folder chứa video.

---

## 🔄 Batch Processing (Linux/macOS)

```bash
#!/bin/bash
for file in *.mp4; do
    ffmpeg -i "$file" \
      -filter_complex "drawtext=text='© 2024':fontsize=24:fontcolor=white@0.7:x=W-text_w-20:y=H-text_h-20[out]" \
      -map "[out]" -map "0:a" \
      -c:v libx264 -preset medium -crf 23 \
      -c:a aac -b:a 128k \
      "${file%.*}_watermarked.mp4" -y
done
```

---

## 📊 Codec Options

### H.264 (Khuyến khích - tương thích tốt)
```bash
-c:v libx264 -preset medium -crf 23
```

### H.265/HEVC (Chất lượng tốt hơn, file nhỏ hơn)
```bash
-c:v libx265 -preset medium -crf 23
```

### VP9 (Dùng cho WebM/web)
```bash
-c:v libvpx-vp9 -crf 30 -b:v 0
```

---

## 🎥 Scaling & Resolution

Nếu cần reduce resolution (giảm file size):

```bash
-vf "scale=1280:-1"    # 1280px width, auto height
```

Full example:
```bash
ffmpeg -i input.mp4 \
  -vf "scale=1280:-1,drawtext=text='© 2024':fontsize=20:fontcolor=white@0.7:x=W-text_w-20:y=H-text_h-20" \
  -c:v libx264 -preset medium -crf 23 \
  output.mp4
```

---

## 🔊 Audio Options

Keep original audio:
```bash
-c:a aac -b:a 128k
```

Disable audio:
```bash
-an
```

Higher quality audio:
```bash
-c:a aac -b:a 256k
```

---

## 📹 Common Formats

### MP4 (H.264)
```bash
-c:v libx264 -c:a aac output.mp4
```

### MKV (H.264)
```bash
-c:v libx264 -c:a aac output.mkv
```

### WebM (VP9)
```bash
-c:v libvpx-vp9 -c:a libopus output.webm
```

### MOV (ProRes)
```bash
-c:v prores -c:a aac output.mov
```

---

## 🎬 Advanced: Animated Watermark

Dùng PNG sequence hoặc GIF:

```bash
ffmpeg -i input.mp4 \
  -i watermark.gif \
  -filter_complex "overlay=x=W-w-20:y=H-h-20[out]" \
  -map "[out]" -map "0:a" \
  -c:v libx264 -preset medium output.mp4
```

---

## 🔐 Watermark với Font Custom

```bash
ffmpeg -i input.mp4 \
  -filter_complex "drawtext=fontfile='C:\\Windows\\Fonts\\Arial.ttf':text='© 2024':fontsize=24:fontcolor=white@0.7:x=W-text_w-20:y=H-text_h-20[out]" \
  -map "[out]" -map "0:a" \
  -c:v libx264 -preset medium output.mp4
```

---

## 📈 Performance Tips

**Tăng tốc độ:**
```bash
-preset fast        # Nhanh hơn
-crf 28            # Lower quality
-scale 1280:-1     # Reduce resolution
```

**Tăng chất lượng:**
```bash
-preset slow       # Slow
-crf 18           # Higher quality
-pix_fmt yuv420p  # Better color
```

---

## 🧪 Test Command

Watermark chỉ 5 giây đầu (để test):

```bash
ffmpeg -i input.mp4 \
  -t 5 \
  -filter_complex "drawtext=text='TEST':fontsize=30:fontcolor=red:x=W/2-text_w/2:y=H/2[out]" \
  -map "[out]" -map "0:a" \
  test_output.mp4
```

---

## 🐛 Debug

Kiểm tra video properties:
```bash
ffprobe input.mp4
```

Kiểm tra codec hiện tại:
```bash
ffprobe -v error -select_streams v:0 -show_entries stream=codec_name -of default=noprint_wrappers=1:nokey=1 input.mp4
```

---

## 📚 Resources

- FFmpeg Docs: https://ffmpeg.org/documentation.html
- Filter Docs: https://ffmpeg.org/ffmpeg-filters.html
- DrawText Filter: https://ffmpeg.org/ffmpeg-filters.html#drawtext-1

---

**Pro Tip:** Lưu những command hay dùng vào file `.sh` hoặc `.bat` để tái sử dụng! 🚀
