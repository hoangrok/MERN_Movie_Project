# Hướng Dẫn Ghép Nhiều Videos Thành Video Dài

## Tổng quan

Tính năng này cho phép bạn upload nhiều video nhỏ (vài giây đến vài phút mỗi video) và tự động ghép chúng thành một video dài 10-15 phút, sau đó convert sang HLS để stream.

## Cách sử dụng

### 1. Trong Admin Panel

1. Truy cập trang Admin tạo movie
2. Ở mode "Phim lẻ" (single mode)
3. Tick vào checkbox **"🎬 Ghép nhiều videos thành 1 video dài"**
4. Chọn nhiều video files (ít nhất 2 videos)
5. Cấu hình tuỳ chọn:
   - **Thời lượng tối đa mỗi segment**: Mặc định 900s (15 phút)
   - **Sắp xếp theo**: Tên file hoặc thời gian tạo
6. Điền thông tin movie và submit

### 2. Quy trình xử lý

```
Upload nhiều videos nhỏ
    ↓
Sắp xếp theo thứ tự (name/time)
    ↓
Phân nhóm thành các segments (~10-15 phút mỗi segment)
    ↓
Ghép các videos trong cùng group
    ↓
Nếu có nhiều groups → Ghép các groups thành 1 video
    ↓
Convert sang HLS với watermark (nếu enabled)
    ↓
Upload lên R2 storage
    ↓
Tạo preview timeline, poster, backdrop
    ↓
Hoàn thành!
```

## API Endpoint

### POST `/api/upload/videos/:movieId`

Upload nhiều videos để ghép:

**Request:**
- Method: POST
- Body: FormData với field `videos` chứa nhiều files
- Query params:
  - `targetDuration`: Thời lượng tối đa mỗi segment (giây), default: 900
  - `sortBy`: Cách sắp xếp videos (`name` hoặc `time`), default: `name`

**Response:**
```json
{
  "success": true,
  "queued": true,
  "movieId": "...",
  "status": "queued",
  "message": "Đã nhận X videos. Đang ghép thành Y segment(s) và xử lý nền.",
  "mergeInfo": {
    "totalVideos": 10,
    "segments": 2,
    "targetDuration": 900
  }
}
```

## Các utility functions

### `backend/utils/mergeVideoSegments.js`

```javascript
// Ghép nhiều videos thành 1
mergeVideos(inputVideos, outputPath, options)

// Lấy thông tin video
getVideoInfo(videoPath)

// Phân nhóm videos theo thời lượng
groupVideosByDuration(videos, targetDuration)

// Sắp xếp videos
sortVideos(videoPaths, sortBy)

// Tìm video files trong folder
findVideoFiles(folderPath)
```

## Lưu ý quan trọng

1. **Thứ tự videos**: Đặt tên files theo thứ tự muốn ghép (01-intro.mp4, 02-phan1.mp4, ...)
2. **Định dạng hỗ trợ**: MP4, MKV, WebM, MOV, M4V
3. **Số lượng videos**: Tối thiểu 2 videos
4. **Thời gian xử lý**: Tuỳ thuộc vào số lượng và độ dài videos
5. **Watermark**: Sẽ được áp dụng trong quá trình convert HLS

## Xử lý lỗi

- Nếu 1 video bị lỗi, toàn bộ quá trình sẽ thất bại
- Kiểm tra logs backend để biết chi tiết lỗi
- Đảm bảo tất cả videos có cùng codec (H264 + AAC audio)

## Ví dụ use case

**Trường hợp**: Bạn có 50 videos nhỏ, mỗi video 30 giây, muốn tạo thành 1 video dài ~25 phút

**Cách làm**:
1. Đặt tên files: `01.mp4`, `02.mp4`, ..., `50.mp4`
2. Upload tất cả 50 files cùng lúc
3. Set `targetDuration = 1500` (25 phút)
4. Hệ thống sẽ tự động ghép tất cả thành 1 video dài 25 phút

## Hiệu năng

- **Tốc độ ghép**: ~1-2x realtime (tuỳ preset)
- **Chất lượng**: CRF 23 (balance giữa chất lượng và kích thước)
- **Audio**: Giữ nguyên audio từ videos gốc