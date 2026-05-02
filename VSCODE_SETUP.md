# 🎬 VS Code Setup - Watermarking Tasks

Hướng dẫn thiết lập tasks trong VS Code để chạy watermarking với 1 click.

---

## 📝 Setup Steps

### 1. Tạo thư mục `.vscode`

Trong folder `MERN_Movie_Project/`, tạo:
```
MERN_Movie_Project/
└── .vscode/
```

### 2. Thêm `tasks.json`

Tạo file `.vscode/tasks.json` với nội dung từ file outputs folder (hoặc copy từ dưới):

```json
{
    "version": "2.0.0",
    "tasks": [
        {
            "label": "🎬 Watermark Videos (Python)",
            "type": "shell",
            "command": "python",
            "args": ["watermark-batch.py"],
            "presentation": {
                "echo": true,
                "reveal": "always",
                "focus": true,
                "panel": "shared",
                "showReuseMessage": false
            },
            "problemMatcher": [],
            "group": {
                "kind": "build",
                "isDefault": true
            }
        },
        {
            "label": "🎬 Watermark Videos (Batch)",
            "type": "shell",
            "command": "cmd",
            "args": ["/c", "watermark-batch.bat"],
            "windows": {
                "command": "cmd",
                "args": ["/c", "watermark-batch.bat"]
            },
            "presentation": {
                "echo": true,
                "reveal": "always",
                "focus": true,
                "panel": "shared"
            },
            "problemMatcher": []
        },
        {
            "label": "📁 Open Input Folder",
            "type": "shell",
            "command": "explorer",
            "args": [".\\videos-to-watermark"],
            "windows": {
                "command": "explorer",
                "args": [".\\videos-to-watermark"]
            },
            "problemMatcher": [],
            "presentation": {
                "reveal": "silent"
            }
        },
        {
            "label": "📁 Open Output Folder",
            "type": "shell",
            "command": "explorer",
            "args": [".\\videos-watermarked"],
            "windows": {
                "command": "explorer",
                "args": [".\\videos-watermarked"]
            },
            "problemMatcher": [],
            "presentation": {
                "reveal": "silent"
            }
        }
    ]
}
```

---

## 🚀 Chạy Tasks

### Option 1: Keyboard Shortcut (Nhanh nhất)
```
Ctrl + Shift + B
```
Sẽ chạy task mặc định (Python watermark)

---

### Option 2: Run Task Menu
```
Ctrl + Shift + P
```
Gõ: `Run Task`

Chọn task từ list:
- 🎬 **Watermark Videos (Python)** ← Khuyến khích
- 🎬 **Watermark Videos (Batch)**
- 📁 **Open Input Folder** → Mở folder input
- 📁 **Open Output Folder** → Mở folder output

---

### Option 3: Terminal Tab
Click nút + ở Terminal → New Terminal

Gõ:
```bash
python watermark-batch.py
```

hoặc
```cmd
watermark-batch.bat
```

---

## 📊 Task Output

Khi chạy, VS Code sẽ hiển thị Terminal output:

```
============================================================
FFmpeg Batch Watermark Burner v1.0
Burn logo + text vào video (hard watermark)
============================================================

✓ Config loaded: watermark-config.json
✓ FFmpeg available: ffmpeg version 6.0
✓ Input dir: C:\...\videos-to-watermark
✓ Output dir: C:\...\videos-watermarked

Found 3 video(s) to process

============================================================
[1/3] Processing: movie1.mp4
============================================================
...
Starting encode...
(quá trình mã hóa)
...
✓ SUCCESS: movie1
  Output size: 450.25 MB
```

---

## ⚙️ Customize Tasks

### Thay đổi task mặc định

Sửa `"isDefault": true` để thay đổi task mặc định (Ctrl+Shift+B):

```json
"group": {
    "kind": "build",
    "isDefault": true  // Đặt true cho task nào muốn chạy default
}
```

### Thêm keyboard shortcut riêng

Edit `.vscode/keybindings.json`:

```json
[
    {
        "key": "ctrl+shift+w",
        "command": "workbench.action.tasks.runTask",
        "args": "🎬 Watermark Videos (Python)"
    },
    {
        "key": "ctrl+shift+o",
        "command": "workbench.action.tasks.runTask",
        "args": "📁 Open Output Folder"
    }
]
```

Giờ:
- `Ctrl+Shift+W` → Watermark videos
- `Ctrl+Shift+O` → Open output folder

---

## 🎯 VS Code Extensions (Optional)

Các extension hữu ích cho video processing:

1. **Better Comments** - Tô màu comments
   ```
   ext install aaron-bond.better-comments
   ```

2. **Code Runner** - Chạy script trực tiếp
   ```
   ext install formulahendry.code-runner
   ```

3. **Terminal Manager** - Quản lý multiple terminals
   ```
   ext install multithreaded.typescript
   ```

4. **FFmpeg Helper** - Syntax highlight FFmpeg commands
   ```
   ext install curl.vscode-alternative-autocompletion
   ```

---

## 💡 Tips & Tricks

### Auto-run task on folder open

Tạo `.vscode/settings.json`:

```json
{
    "terminal.integrated.defaultProfile.windows": "PowerShell",
    "python.defaultInterpreterPath": "python",
    "python.linting.enabled": true
}
```

---

### Monitor task progress

VS Code Terminal hiển thị:
- ✅ Video được xử lý
- ❌ Lỗi gặp phải
- 📊 Output file size
- ⏱️ Thời gian xử lý

---

### Kill running task

Nếu cần dừng:
1. Click Terminal → Kill Terminal
2. Hoặc `Ctrl+C` trong terminal
3. Hoặc `workbench.action.tasks.terminate` command

---

## 🔍 Troubleshooting

### ❌ Task không chạy được

**Kiểm tra:**
1. FFmpeg installed? → `ffmpeg -version`
2. Python installed? → `python --version`
3. Files trong đúng folder? → `ls videos-to-watermark/`

### ❌ Terminal không hiện output

Sửa `tasks.json`:
```json
"presentation": {
    "reveal": "always",  // ← Set to 'always'
    "focus": true
}
```

### ❌ Python script không chạy

Kiểm tra Python path:
```
Ctrl+Shift+P → Python: Select Interpreter
```

Chọn interpreter nếu có nhiều version

---

## 📁 Final Structure

```
MERN_Movie_Project/
├── .vscode/
│   ├── tasks.json          ← Task definitions
│   └── settings.json       ← VS Code settings (optional)
│
├── watermark-config.json   ← Cấu hình watermark
├── watermark-batch.py      ← Python script
├── watermark-batch.bat     ← Batch script (Windows)
│
├── assets/
│   └── watermark-logo.png
│
├── videos-to-watermark/    ← Input videos
├── videos-watermarked/     ← Output videos
│
├── WATERMARK_SETUP.md      ← Setup guide
├── FFMPEG_COMMANDS.md      ← FFmpeg reference
└── VSCODE_SETUP.md         ← File này
```

---

## 🎉 Success!

Giờ bạn có thể:

✅ Chạy watermarking bằng `Ctrl+Shift+B`
✅ Monitor progress trong VS Code terminal
✅ Mở input/output folder từ VS Code
✅ Customize tasks theo nhu cầu
✅ Set keyboard shortcuts

**Happy watermarking!** 🎬✨

---

## 🆘 Help & Resources

- **VS Code Tasks Docs:** https://code.visualstudio.com/docs/editor/tasks
- **FFmpeg Documentation:** https://ffmpeg.org/documentation.html
- **VS Code Keybindings:** https://code.visualstudio.com/docs/getstarted/keybindings

Nếu có issue, check:
1. FFmpeg version compatibility
2. JSON syntax (copy exact format)
3. File paths (relative paths từ project root)
4. Watermark logo file exists
