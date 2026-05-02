# 🖥️ VS Code Integration - Complete Guide

Hướng dẫn tích hợp watermarking vào VS Code với preview.

---

## 📋 Summary

| Action | Shortcut | What happens |
|--------|----------|--------------|
| **Preview Watermark** | `Ctrl+Shift+P` → Run Task | 5-sec preview video |
| **Process All Videos** | `Ctrl+Shift+B` | Batch process tất cả |
| **Open Output Folder** | `Ctrl+Shift+P` → Run Task | View hasil |

---

## 🚀 Setup (Copy-Paste)

### 1. Create `.vscode/tasks.json`

**Path:** `MERN_Movie_Project/.vscode/tasks.json`

**Copy this code:**

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
            "label": "👁️ Preview Watermark (5 sec test)",
            "type": "shell",
            "command": "python",
            "args": ["watermark-preview.py"],
            "presentation": {
                "echo": true,
                "reveal": "always",
                "focus": true,
                "panel": "shared"
            },
            "problemMatcher": [],
            "group": {
                "kind": "test"
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

## 🎯 Using in VS Code

### ✨ Preview Watermark (Before Process All)

**Quick:**
```
Ctrl + Shift + P
```

**Type:**
```
Run Task
```

**Select:**
```
👁️ Preview Watermark (5 sec test)
```

**What happens:**
```
1. Auto-generates 5-second test video
2. Adds watermark based on watermark-config.json
3. Creates: preview_watermarked.mp4
4. Opens in video player (auto)
5. You see exactly how watermark looks!
```

**Typical output:**
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
  Text:     © 2024 MovieName
  Position: bottom-right

Encoding preview (5 seconds)...
[FFmpeg progress...]
✓ PREVIEW CREATED SUCCESSFULLY!
Opening preview video...
```

---

### 🚀 Process All Videos

**Quick:**
```
Ctrl + Shift + B
```

**What happens:**
```
1. Reads all videos from: videos-to-watermark/
2. Applies watermark (using config)
3. Saves to: videos-watermarked/
4. Shows progress for each video
```

**Typical output:**
```
============================================================
FFmpeg Batch Watermark Burner v1.0
============================================================

Found 3 video(s) to process

[1/3] Processing: movie1.mp4
Input:  C:\...\videos-to-watermark\movie1.mp4
Output: C:\...\videos-watermarked\movie1_watermarked.mp4
Codec: libx264, Preset: medium, CRF: 23
Starting encode...

[Progress bar...]

✓ SUCCESS: movie1
  Output size: 450.25 MB

[2/3] Processing: movie2.mkv
...

[3/3] Processing: movie3.mp4
...

============================================================
SUMMARY
============================================================
Total:      3
Successful: 3 ✓
Failed:     0 ✗
============================================================
```

---

### 📁 Open Output Folder

**Quick:**
```
Ctrl + Shift + P → Run Task → 📁 Open Output Folder
```

View processed videos instantly.

---

## 🎨 Workflow Example

### Scenario: You want to test before processing 10 videos

```
Step 1: Copy 10 videos to videos-to-watermark/
        ├── video1.mp4
        ├── video2.mp4
        └── ... × 10

Step 2: Edit watermark-config.json
        {
          "logo": {
            "position": "bottom-right",
            "scale": 0.15,
            "opacity": 0.8
          },
          "text": {
            "content": "© 2024 Studio"
          }
        }

Step 3: PREVIEW FIRST
        Ctrl + Shift + P → Run Task → 👁️ Preview Watermark
        
        ↓ Wait 10-20 seconds
        
        ↓ Check: preview_watermarked.mp4 opens
        
        ↓ "Looks good!" OR "Adjust and preview again"

Step 4: HAPPY WITH PREVIEW?
        
        YES → Ctrl + Shift + B (Process all)
              ↓ Wait 5-10 minutes
              ↓ All 10 videos done!
              
        NO  → Edit config again
              Go back to Step 3

Step 5: DONE!
        Ctrl + Shift + P → Run Task → 📁 Open Output Folder
        
        See all videos with watermark:
        ├── video1_watermarked.mp4
        ├── video2_watermarked.mp4
        └── ... × 10
```

---

## ⚙️ Configuration Quick Reference

Edit `watermark-config.json`:

```json
{
  "watermark": {
    "logo": {
      "path": "./assets/watermark-logo.png",    // Path to logo
      "position": "bottom-right",               // top-right, bottom-left, etc.
      "scale": 0.15,                            // 0.1-0.25 recommended
      "opacity": 0.8,                           // 0.3-1.0
      "margin": 20                              // pixels from edge
    },
    "text": {
      "enabled": true,                          // true/false
      "content": "© 2024 MovieName",            // Your text
      "position": "bottom-right",
      "font_size": 24,                          // 18-32 recommended
      "font_color": "white",                    // Color name
      "opacity": 0.7,                           // 0.3-1.0
      "margin": 20
    }
  },
  "encoding": {
    "codec": "libx264",                         // H.264
    "preset": "medium",                         // fast/medium/slow
    "crf": 23                                   // 18-28
  },
  "input_dir": "./videos-to-watermark",
  "output_dir": "./videos-watermarked"
}
```

---

## 🔧 Customization

### Change Logo Position

**Available positions:**
- `"top-left"`
- `"top-right"`
- `"bottom-left"`
- `"bottom-right"`

**Example - Top-Left:**
```json
"logo": {
  "position": "top-left",    // ← Changed
  "scale": 0.15
}
```

---

### Change Text Position

```json
"text": {
  "position": "bottom-left",  // ← Changed from bottom-right
  "content": "© 2024"
}
```

---

### Adjust Logo Size

**Too small?** Increase scale:
```json
"scale": 0.20  // was 0.15
```

**Too large?** Decrease scale:
```json
"scale": 0.10  // was 0.15
```

---

### Adjust Opacity (Transparency)

**More transparent (subtle):**
```json
"opacity": 0.5  // was 0.8
```

**More opaque (bold):**
```json
"opacity": 0.95  // was 0.8
```

---

### Change Processing Speed

**Fast (less quality, faster):**
```json
"encoding": {
  "preset": "fast",  // was "medium"
  "crf": 26          // was 23
}
```

**Slow (best quality, slower):**
```json
"encoding": {
  "preset": "slow",  // was "medium"
  "crf": 20          // was 23
}
```

---

## 📺 What's Happening Behind Scenes

### When you click "Preview":

```
1. watermark-preview.py runs
2. Generates 5-second test video (colorful gradient)
3. Reads watermark-config.json
4. Builds FFmpeg filter chain:
   - Takes test video
   - Overlays logo (with position, scale, opacity)
   - Adds text (with font size, color, position)
   - Encodes with H.264 codec
5. Outputs: preview_watermarked.mp4
6. Opens in default media player
```

### When you click "Process All":

```
1. watermark-batch.py runs
2. Reads all videos from videos-to-watermark/
3. For each video:
   - Reads watermark-config.json
   - Builds same FFmpeg filter
   - Encodes video with watermark
   - Saves to videos-watermarked/
4. Shows progress bar
5. Summarizes results
```

---

## 💡 Tips & Tricks

### Preview Different Configs Quickly

```
1. Save current config as: watermark-config-v1.json
2. Edit watermark-config.json with new values
3. Preview
4. Keep or revert?
```

### Batch Process by Folder

```
videos-to-watermark/
├── batch-1/
│   ├── video1.mp4
│   ├── video2.mp4
│   └── video3.mp4
├── batch-2/
│   └── ...

Run:
1. Move batch-1 content to videos-to-watermark/
2. Process all
3. Move output to videos-watermarked/batch-1/
4. Clear videos-to-watermark/
5. Repeat for batch-2
```

### Terminal View

Can't see terminal output?

Press: `Ctrl + J` (toggle terminal panel)

---

## 🐛 Troubleshooting

### ❌ Task doesn't appear in list

**Solution:**
- Make sure `.vscode/tasks.json` exists
- Check JSON syntax (use online JSON validator)
- Reload VS Code: `Ctrl + K, Ctrl + R`

### ❌ Python not found

**Solution:**
```
Ctrl + Shift + P → Python: Select Interpreter
```

Choose Python 3.x version

### ❌ FFmpeg not found

**Solution:**
```powershell
choco install ffmpeg
```

Restart VS Code after install

### ❌ Preview doesn't open

**Manual:**
1. Find `preview_watermarked.mp4` in project folder
2. Right-click → Open with → Media Player

### ❌ Permission denied error

**Solution:**
- Make sure you have write permission to folder
- Run VS Code as Administrator (if needed)

---

## 🎓 Full Example Workflow

```bash
# 1. Copy 5 videos to input folder
#    MERN_Movie_Project/
#    └── videos-to-watermark/
#        ├── movie1.mp4
#        ├── movie2.mp4
#        ├── movie3.mp4
#        ├── movie4.mp4
#        └── movie5.mp4

# 2. Edit watermark-config.json
#    Change: position, scale, opacity, text content

# 3. Preview in VS Code
#    Ctrl + Shift + P → Run Task → 👁️ Preview Watermark
#    
#    Wait 10-20 seconds
#    Video preview opens automatically
#    Check if it looks good

# 4. Good? Process all videos
#    Ctrl + Shift + B
#    
#    Wait 5-10 minutes (depending on video length)
#    Progress shows for each video

# 5. Results
#    MERN_Movie_Project/
#    └── videos-watermarked/
#        ├── movie1_watermarked.mp4
#        ├── movie2_watermarked.mp4
#        ├── movie3_watermarked.mp4
#        ├── movie4_watermarked.mp4
#        └── movie5_watermarked.mp4
```

---

## ✅ Checklist

Before processing:

- [ ] `.vscode/tasks.json` created
- [ ] FFmpeg installed (`ffmpeg -version` works)
- [ ] `watermark-config.json` edited
- [ ] `assets/watermark-logo.png` exists
- [ ] Preview works
- [ ] Videos in `videos-to-watermark/`
- [ ] Ready to process!

---

## 🎉 You're All Set!

Now you have:
✅ Professional watermarking system
✅ VS Code integration
✅ Quick preview before processing
✅ Batch automation

**Happy video processing!** 🎬✨
