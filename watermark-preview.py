#!/usr/bin/env python3
"""
Watermark Preview Generator
Tạo video preview 5 giây để xem watermark trước khi process toàn bộ
"""

import os
import json
import subprocess
import sys
from pathlib import Path

class WatermarkPreview:
    def __init__(self, config_path="watermark-config.json"):
        self.config_path = config_path
        self.load_config()
        self.validate_ffmpeg()

    def load_config(self):
        """Load configuration"""
        try:
            with open(self.config_path, 'r') as f:
                self.config = json.load(f)
            print(f"✓ Config loaded: {self.config_path}")
        except FileNotFoundError:
            print(f"✗ Config file not found: {self.config_path}")
            sys.exit(1)

    def validate_ffmpeg(self):
        """Check FFmpeg"""
        try:
            subprocess.run(['ffmpeg', '-version'],
                         capture_output=True,
                         timeout=5,
                         check=True)
            print("✓ FFmpeg available")
        except Exception as e:
            print(f"✗ FFmpeg not found: {e}")
            sys.exit(1)

    def build_filter(self):
        """Build FFmpeg filter string"""
        cfg = self.config['watermark']
        logo_cfg = cfg.get('logo', {})
        text_cfg = cfg.get('text', {})

        filters = []
        filters.append(f"[0:v]scale=1920:-1[scaled]")

        # Logo
        if logo_cfg.get('enabled', True) and os.path.exists(logo_cfg['path']):
            pos = logo_cfg.get('position', 'top-right')
            margin = logo_cfg.get('margin', 20)
            opacity = logo_cfg.get('opacity', 0.8)

            pos_map = {
                'top-right': f'x=W-w-{margin}:y={margin}',
                'bottom-right': f'x=W-w-{margin}:y=H-h-{margin}',
                'top-left': f'x={margin}:y={margin}',
                'bottom-left': f'x={margin}:y=H-h-{margin}',
            }

            pos_str = pos_map.get(pos, pos_map['top-right'])
            filters.append(
                f"[scaled]overlay={pos_str}:alpha={opacity}[with_logo]"
            )
            last_filter = 'with_logo'
        else:
            last_filter = 'scaled'

        # Text
        if text_cfg.get('enabled', True):
            text = text_cfg.get('content', '© 2024')
            fontsize = text_cfg.get('font_size', 24)
            fontcolor = text_cfg.get('font_color', 'white')
            opacity = text_cfg.get('opacity', 0.7)
            margin = text_cfg.get('margin', 20)
            pos = text_cfg.get('position', 'bottom-right')

            pos_map = {
                'top-right': f'x=W-text_w-{margin}:y={margin}',
                'bottom-right': f'x=W-text_w-{margin}:y=H-text_h-{margin}',
                'top-left': f'x={margin}:y={margin}',
                'bottom-left': f'x={margin}:y=H-text_h-{margin}',
            }

            pos_str = pos_map.get(pos, pos_map['bottom-right'])
            text_escaped = text.replace("'", "\\'")

            filters.append(
                f"[{last_filter}]drawtext=text='{text_escaped}':fontsize={fontsize}:"
                f"fontcolor={fontcolor}@{opacity}:{pos_str}[out]"
            )
        else:
            filters.append(f"[{last_filter}][out]")

        return ';'.join(filters)

    def generate_test_video(self):
        """Generate 5-second test video (gradient)"""
        test_file = "test_input.mp4"

        print("\n📹 Generating 5-second test video...")

        # Create colorful gradient video (5 seconds)
        cmd = [
            'ffmpeg',
            '-f', 'lavfi',
            '-i', 'color=c=blue:s=1920x1080:d=5',
            '-f', 'lavfi',
            '-i', 'sine=frequency=1000:duration=5',
            '-pix_fmt', 'yuv420p',
            test_file,
            '-y'
        ]

        try:
            result = subprocess.run(cmd, capture_output=True, timeout=30)
            if result.returncode == 0:
                print(f"✓ Test video created: {test_file}")
                return test_file
            else:
                print("✗ Failed to create test video")
                return None
        except Exception as e:
            print(f"✗ Error: {e}")
            return None

    def create_preview(self, input_file=None):
        """Create watermark preview"""

        # Use provided video or generate test video
        if input_file is None or not os.path.exists(input_file):
            print("\n📹 No input video provided, generating test video...")
            input_file = self.generate_test_video()

            if not input_file:
                print("✗ Could not create test video")
                return False

        output_file = "preview_watermarked.mp4"

        print(f"\n{'='*60}")
        print(f"Creating Preview: {output_file}")
        print(f"{'='*60}")
        print(f"Input:  {input_file}")
        print(f"Output: {output_file}")

        # Build FFmpeg command
        cfg = self.config['encoding']
        filter_str = self.build_filter()

        print(f"\nWatermark Config:")
        print(f"  Logo:     {self.config['watermark']['logo'].get('path', 'disabled')}")
        print(f"  Text:     {self.config['watermark']['text'].get('content', 'disabled')}")
        print(f"  Position: {self.config['watermark']['logo'].get('position', 'N/A')}")
        print(f"  Codec:    {cfg.get('codec')}")
        print(f"  Preset:   {cfg.get('preset')}")
        print(f"  CRF:      {cfg.get('crf')}")

        cmd = [
            'ffmpeg',
            '-i', input_file,
            '-filter_complex', filter_str,
            '-map', '[out]',
            '-map', '0:a?',
            '-c:v', cfg.get('codec', 'libx264'),
            '-preset', cfg.get('preset', 'medium'),
            '-crf', str(cfg.get('crf', 23)),
            '-c:a', 'aac',
            '-b:a', '128k',
            '-y',
            output_file
        ]

        print(f"\nEncoding preview (5 seconds)...\n")

        try:
            result = subprocess.run(cmd, capture_output=False, timeout=120)

            if result.returncode == 0:
                output_size = os.path.getsize(output_file) / (1024*1024)
                print(f"\n{'='*60}")
                print(f"✓ PREVIEW CREATED SUCCESSFULLY!")
                print(f"{'='*60}")
                print(f"File: {output_file}")
                print(f"Size: {output_size:.2f} MB")
                print(f"Duration: 5 seconds")
                print(f"\n👉 Open with: VLC, Windows Media Player, or your browser")
                print(f"{'='*60}\n")

                # Try to open automatically
                try:
                    os.startfile(output_file)
                    print("Opening preview video...\n")
                except:
                    print("Manually open the preview file to view\n")

                return True
            else:
                print(f"\n✗ Failed to create preview")
                return False

        except subprocess.TimeoutExpired:
            print(f"\n✗ Preview generation timeout")
            return False
        except Exception as e:
            print(f"\n✗ Error: {str(e)}")
            return False

def main():
    print("\n" + "="*60)
    print("🎬 Watermark Preview Generator v1.0")
    print("="*60 + "\n")

    # Check if video file provided
    input_video = None
    if len(sys.argv) > 1:
        input_video = sys.argv[1]
        if not os.path.exists(input_video):
            print(f"✗ Video file not found: {input_video}")
            input_video = None

    preview_gen = WatermarkPreview()

    if input_video:
        print(f"Using video: {input_video}")
        success = preview_gen.create_preview(input_video)
    else:
        print("No input video provided - will generate test video")
        success = preview_gen.create_preview()

    if success:
        print("✓ Preview ready! Adjust watermark-config.json and run again if needed")
    else:
        print("✗ Preview generation failed")
        sys.exit(1)

    print("Press Enter to exit...")
    input()

if __name__ == "__main__":
    main()
