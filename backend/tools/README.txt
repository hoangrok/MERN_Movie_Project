CÁCH DÙNG TOOL AUTO UPLOAD

1) Tạo folder:
   backend/../tools
   hoặc bất kỳ folder nào bạn muốn, ví dụ:
   MERN_Movie_Project/tools

2) Bỏ các file vào:
   - auto-upload-watermark.js
   - package.json
   - watermark.png

3) Mở file auto-upload-watermark.js
   tìm:
   token: ""
   dán token admin của bạn vào

4) Cài package:
   npm install

5) Chạy:
   npm start

6) Tool sẽ hỏi:
   - đường dẫn video
   - tên phim
   - mô tả
   - genre
   - year
   - rating
   - duration

7) Tool sẽ:
   - burn watermark local
   - tạo movie
   - upload video
   - poll status đến khi ready