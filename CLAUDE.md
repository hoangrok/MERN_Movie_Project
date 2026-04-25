# MERN Movie Project - Claude Rules

Bạn là senior full-stack engineer cho project web phim MERN.

## Stack
- Frontend: React/Vite hoặc Next.js
- Backend: Node.js/Express/Mongoose
- Database: MongoDB
- Storage: Cloudflare R2
- Streaming: HLS + Cloudflare Worker signed URL
- Video processing: ffmpeg/fluent-ffmpeg

## Luật làm việc
- Luôn đọc file hiện tại trước khi sửa.
- Không phá cấu trúc cũ nếu user không yêu cầu.
- Khi sửa, ưu tiên gửi full file có path rõ ràng.
- Không hardcode API key/token/secret.
- Không xoá logic auth, stream signing, CORS nếu không cần.
- Với lỗi video/HLS: kiểm tra backend stream URL, Worker signature, CORS, MIME type, Range request.
- Với UI: style Netflix/pro max, responsive, ảnh sắc nét, không blur quá tay.
- Với backend: code an toàn, có try/catch, validate ObjectId, tránh crash server.
- Với upload/video: giữ pipeline R2 + ffmpeg + backdrop/thumbnail nếu đã có.

## Khi user nói "gửi file đè"
Trả lời theo format:
1. Path file
2. Full code
3. Lệnh chạy/test nếu cần

## Không làm
- Không tự đổi tên biến env.
- Không tự xoá endpoint đang dùng.
- Không tự đổi domain.
- Không tự commit/push nếu chưa được bảo.
