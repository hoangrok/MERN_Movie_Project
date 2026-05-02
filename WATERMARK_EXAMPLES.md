# 🎨 Watermark Examples - Copy & Paste Configs

Sẵn các cấu hình watermark đẹp - chỉ cần copy-paste!

---

## 📋 Table of Contents

1. [Professional Studio](#1-professional-studio)
2. [Subtle Copyright](#2-subtle-copyright)
3. [Bold Branding](#3-bold-branding)
4. [Film Festival](#4-film-festival)
5. [YouTube Channel](#5-youtube-channel)
6. [Confidential](#6-confidential)
7. [Production Company](#7-production-company)
8. [Minimal Logo](#8-minimal-logo)

---

## 1. Professional Studio

**Best for:** Professional productions, corporate videos

**Preview:**
```
┌─────────────────────────────────────┐
│                              🎬 Logo│
│                                     │
│                                     │
│                                     │
│                                     │
│                                     │
│ © 2024 Studio Productions           │
└─────────────────────────────────────┘
```

**Config (Copy this):**
```json
{
  "watermark": {
    "logo": {
      "path": "./assets/watermark-logo.png",
      "position": "top-right",
      "scale": 0.12,
      "opacity": 0.95,
      "margin": 25
    },
    "text": {
      "enabled": true,
      "content": "© 2024 Studio Productions",
      "position": "bottom-left",
      "font_size": 20,
      "font_color": "white",
      "opacity": 0.8,
      "margin": 25
    }
  },
  "encoding": {
    "codec": "libx264",
    "preset": "medium",
    "crf": 23
  }
}
```

---

## 2. Subtle Copyright

**Best for:** Content where you don't want watermark too noticeable

**Preview:**
```
┌─────────────────────────────────────┐
│                                     │
│                                     │
│                                     │
│                                     │
│                                     │
│                     © 2024 MyStudio │ ← Mờ nhạt
└─────────────────────────────────────┘
```

**Config (Copy this):**
```json
{
  "watermark": {
    "logo": {
      "enabled": false
    },
    "text": {
      "enabled": true,
      "content": "© 2024 MyStudio",
      "position": "bottom-right",
      "font_size": 18,
      "font_color": "white",
      "opacity": 0.4,
      "margin": 20
    }
  },
  "encoding": {
    "codec": "libx264",
    "preset": "medium",
    "crf": 23
  }
}
```

---

## 3. Bold Branding

**Best for:** Strong brand protection, promotional videos

**Preview:**
```
┌─────────────────────────────────────┐
│ 🎬 Logo                             │
│                                     │
│                                     │
│                                     │
│                                     │
│ STUDIO NAME™                        │
└─────────────────────────────────────┘
```

**Config (Copy this):**
```json
{
  "watermark": {
    "logo": {
      "path": "./assets/watermark-logo.png",
      "position": "top-left",
      "scale": 0.18,
      "opacity": 0.95,
      "margin": 20
    },
    "text": {
      "enabled": true,
      "content": "STUDIO NAME™",
      "position": "bottom-left",
      "font_size": 28,
      "font_color": "white",
      "opacity": 0.9,
      "margin": 20
    }
  },
  "encoding": {
    "codec": "libx264",
    "preset": "medium",
    "crf": 23
  }
}
```

---

## 4. Film Festival

**Best for:** Film festival submissions, short films

**Preview:**
```
┌─────────────────────────────────────┐
│                        FESTIVAL 2024 │
│                              🎬 Logo│
│                                     │
│         [Film Content Here]          │
│                                     │
│ Directed by: John Doe               │
│ © 2024 Independent Films            │
└─────────────────────────────────────┘
```

**Config (Copy this):**
```json
{
  "watermark": {
    "logo": {
      "path": "./assets/watermark-logo.png",
      "position": "top-right",
      "scale": 0.1,
      "opacity": 0.8,
      "margin": 20
    },
    "text": {
      "enabled": true,
      "content": "Festival 2024 | Independent Films",
      "position": "bottom-left",
      "font_size": 18,
      "font_color": "white",
      "opacity": 0.75,
      "margin": 20
    }
  },
  "encoding": {
    "codec": "libx264",
    "preset": "slow",
    "crf": 20
  }
}
```

---

## 5. YouTube Channel

**Best for:** YouTube videos, streaming content

**Preview:**
```
┌─────────────────────────────────────┐
│                                     │
│                                     │
│                 [Video Content]      │
│                                     │
│                                     │
│                    Subscribe! 🔔 YT │
└─────────────────────────────────────┘
```

**Config (Copy this):**
```json
{
  "watermark": {
    "logo": {
      "enabled": false
    },
    "text": {
      "enabled": true,
      "content": "Subscribe & Like! / YouTube Channel",
      "position": "bottom-right",
      "font_size": 22,
      "font_color": "white",
      "opacity": 0.6,
      "margin": 30
    }
  },
  "encoding": {
    "codec": "libx264",
    "preset": "medium",
    "crf": 23
  }
}
```

---

## 6. Confidential

**Best for:** Confidential/sensitive content protection

**Preview:**
```
┌─────────────────────────────────────┐
│                                     │
│           CONFIDENTIAL              │
│           (mờ nhạt xuyên suốt)      │
│                                     │
│       [Sensitive Video Content]      │
│                                     │
└─────────────────────────────────────┘
```

**Config (Copy this):**
```json
{
  "watermark": {
    "logo": {
      "enabled": false
    },
    "text": {
      "enabled": true,
      "content": "CONFIDENTIAL",
      "position": "center",
      "font_size": 48,
      "font_color": "red",
      "opacity": 0.25,
      "margin": 0
    }
  },
  "encoding": {
    "codec": "libx264",
    "preset": "medium",
    "crf": 23
  }
}
```

---

## 7. Production Company

**Best for:** Professional video production credits

**Preview:**
```
┌─────────────────────────────────────┐
│                                     │
│                                     │
│         [Video Content Here]        │
│                                     │
│                                     │
│ Produced by: XYZ Productions        │
│ 🎬 Logo    © 2024 All Rights Reserved
└─────────────────────────────────────┘
```

**Config (Copy this):**
```json
{
  "watermark": {
    "logo": {
      "path": "./assets/watermark-logo.png",
      "position": "bottom-left",
      "scale": 0.08,
      "opacity": 0.85,
      "margin": 20
    },
    "text": {
      "enabled": true,
      "content": "Produced by XYZ Productions © 2024",
      "position": "bottom-right",
      "font_size": 16,
      "font_color": "white",
      "opacity": 0.7,
      "margin": 20
    }
  },
  "encoding": {
    "codec": "libx264",
    "preset": "medium",
    "crf": 23
  }
}
```

---

## 8. Minimal Logo

**Best for:** Clean, minimalist aesthetic

**Preview:**
```
┌─────────────────────────────────────┐
│                                     │
│                                     │
│         [Video Content Here]        │
│                                     │
│                                     │
│                              🎬 Logo│
└─────────────────────────────────────┘
```

**Config (Copy this):**
```json
{
  "watermark": {
    "logo": {
      "path": "./assets/watermark-logo.png",
      "position": "bottom-right",
      "scale": 0.1,
      "opacity": 0.75,
      "margin": 20
    },
    "text": {
      "enabled": false
    }
  },
  "encoding": {
    "codec": "libx264",
    "preset": "medium",
    "crf": 23
  }
}
```

---

## 🎯 How to Use These Examples

### Step 1: Choose a template above

### Step 2: Copy the `"watermark"` part

Example from "Professional Studio":
```json
"watermark": {
  "logo": { ... },
  "text": { ... }
}
```

### Step 3: Paste into `watermark-config.json`

Replace your current config's `"watermark"` section:

```json
{
  "watermark": {
    [PASTE HERE]
  },
  "encoding": { ... }
}
```

### Step 4: Edit text content

Change this part to match your brand:
```json
"content": "© 2024 MyStudio"  ← Edit this
```

### Step 5: Test with preview

```bash
python watermark-preview.py
```

---

## 🎨 Customization Cheat Sheet

### Position
```
"position": "top-left"
"position": "top-right"
"position": "bottom-left"
"position": "bottom-right"
"position": "center"
```

### Logo Size
```
"scale": 0.08   (very small)
"scale": 0.15   (medium) ⭐
"scale": 0.25   (large)
```

### Transparency
```
"opacity": 0.3  (subtle)
"opacity": 0.6  (balanced)
"opacity": 0.9  (bold)
```

### Font Size
```
"font_size": 16 (small)
"font_size": 24 (medium) ⭐
"font_size": 36 (large)
```

### Processing Speed
```
"preset": "fast"    (10 min for 1 hour video)
"preset": "medium"  (40 min for 1 hour video) ⭐
"preset": "slow"    (90 min for 1 hour video, best quality)
```

### Quality
```
"crf": 26  (fast, smaller file)
"crf": 23  (balanced) ⭐
"crf": 18  (best quality, larger file)
```

---

## 🚀 Quick Start Template

Use this as starting point:

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
      "content": "© 2024 Your Studio",
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

Then adjust to your needs!

---

## 💡 Pro Tips

### Disable Logo?
```json
"logo": {
  "enabled": false
}
```

### Disable Text?
```json
"text": {
  "enabled": false
}
```

### Change Font Color?
```json
"font_color": "white"     // white, black, red, yellow, etc.
```

### Move Things Around?
Try different `"position"` values and preview!

---

## 🎯 Recommended Combinations

### For Brand Protection
Use: **Professional Studio** or **Bold Branding**
```
Logo + Text, both visible, bold
```

### For Subtle Branding
Use: **Minimal Logo** or **Subtle Copyright**
```
Either logo or text, low opacity
```

### For Content Protection
Use: **Confidential**
```
Large centered text watermark
```

---

## 📊 Processing Times (per 1-hour video)

| Config | Preset | Time |
|--------|--------|------|
| Professional Studio | medium | ~40 min |
| Subtle Copyright | medium | ~40 min |
| Bold Branding | medium | ~40 min |
| Confidential | fast | ~10 min |

All same codec (H.264), so time depends on preset mainly.

---

## ✅ Testing Workflow

```
1. Pick a template above
2. Copy config
3. Paste into watermark-config.json
4. Edit text with YOUR info
5. Run: python watermark-preview.py
6. Watch preview_watermarked.mp4
7. Like it? → Process all videos
8. Don't like it? → Try different template, repeat from step 2
```

---

## 🎉 Examples by Use Case

| Use Case | Template | Why |
|----------|----------|-----|
| Movie Studio | Professional Studio | Clean, professional look |
| YouTube Channel | YouTube Channel | CTA watermark |
| Film Production | Film Festival | Credits-style watermark |
| Confidential | Confidential | Strong protection |
| Minimal Branding | Minimal Logo | Clean aesthetic |
| Corporate Video | Production Company | Professional credits |
| Online Course | Subtle Copyright | Not distracting |

---

**Pick one above and start watermarking!** 🎬✨

Questions? Check **WATERMARK_PREVIEW_GUIDE.md** for testing!
