#!/usr/bin/env python3
"""
FFmpeg Batch Watermark Burner
Burn logo + text vào video (hard watermark - không thể xóa)
"""

import os
import json
import subprocess
import sys
from pathlib import Path
from datetime import datetime
import shutil

class WatermarkBurner:
    def __init__(self, config_path="watermark-config.json"):
        self.config_path = config_path
        self.load_config()
        self.validate_ffmpeg()
        self.setup_directories()

    def load_config(self):
        """Load configuration from JSON file"""
        try:
            with open(self.config_path, 'r') as f:
                self.config = json.load(f)
            print(f"✓ Config loaded: {self.config_path}")
        except FileNotFoundError:
            print(f"✗ Config file not found: {self.config_path}")
            sys.exit(1)

    def validate_ffmpeg(self):
        """Check if FFmpeg is installed"""
        try:
            result = subprocess.run(['ffmpeg', '-version'],
                                  capture_output=True,
                                  timeout=5)
            if result.returncode == 0:
                version_line = result.stdout.decode().split('\n')[0]
                print(f"✓ FFmpeg available: {version_line}")
            else:
                raise Exception("FFmpeg check failed")
        except Exception as e:
            print(f"✗ FFmpeg not found: {e}")
            print("Install FFmpeg:")
            print("  Windows: choco install ffmpeg")
            print("  macOS: brew install ffmpeg")
            print("  Linux: sudo apt install ffmpeg")
            sys.exit(1)

    def setup_directories(self):
        """Create necessary directories"""
        self.input_dir = Path(self.config['input_dir'])
        self.output_dir = Path(self.config['output_dir'])

        self.input_dir.mkdir(exist_ok=True)
        self.output_dir.mkdir(exist_ok=True)

        print(f"✓ Input dir: {self.input_dir.absolute()}")
        print(f"✓ Output dir: {self.output_dir.absolute()}")

    def get_video_files(self):
        """Get all video files from input directory"""
        extensions = ['*.mp4', '*.mkv', '*.avi', '*.mov', '*.flv', '*.wmv']
        videos = []

        for ext in extensions:
            videos.extend(self.input_dir.glob(ext))

        return sorted(videos)

    def build_ffmpeg_filter(self):
        """Build FFmpeg filter string for watermark"""
        cfg = self.config['watermark']
        logo_cfg = cfg.get('logo', {})
        text_cfg = cfg.get('text', {})

        filters = []

        # Scale video
        filters.append(f"[0:v]scale=1920:-1[scaled]")

        # Add logo overlay
        if logo_cfg.get('enabled', True) and os.path.exists(logo_cfg['path']):
            pos = logo_cfg.get('position', 'top-right')
            margin = logo_cfg.get('margin', 20)
            opacity = logo_cfg.get('opacity', 0.8)
            scale = logo_cfg.get('scale', 0.15)

            pos_map = {
                'top-right': f'x=W-w*{scale}-{margin}:y={margin}',
                'bottom-right': f'x=W-w*{scale}-{margin}:y=H-h*{scale}-{margin}',
                'top-left': f'x={margin}:y={margin}',
                'bottom-left': f'x={margin}:y=H-h*{scale}-{margin}',
            }

            pos_str = pos_map.get(pos, pos_map['top-right'])

            filters.append(
                f"[scaled]{'[logo]' if not filters[0].endswith('[scaled]') else ''}overlay={pos_str}:alpha={opacity}[with_logo]"
            )
            last_filter = 'with_logo'
        else:
            last_filter = 'scaled'

        # Add text watermark
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

        # Join all filters
        return ';'.join(filters)

    def process_video(self, video_path, total_count, current_num):
        """Process a single video file"""
        video_name = video_path.stem
        output_path = self.output_dir / f"{video_name}_watermarked.mp4"

        print(f"\n{'='*60}")
        print(f"[{current_num}/{total_count}] Processing: {video_path.name}")
        print(f"{'='*60}")
        print(f"Input:  {video_path.absolute()}")
        print(f"Output: {output_path.absolute()}")

        # Build FFmpeg command
        cfg = self.config['encoding']
        filter_str = self.build_ffmpeg_filter()

        cmd = [
            'ffmpeg',
            '-i', str(video_path),
            '-filter_complex', filter_str,
            '-map', '[out]',
            '-map', '0:a?',  # Keep audio if exists
            '-c:v', cfg.get('codec', 'libx264'),
            '-preset', cfg.get('preset', 'medium'),
            '-crf', str(cfg.get('crf', 23)),
            '-c:a', 'aac',
            '-b:a', '128k',
            '-y',  # Overwrite output file
            str(output_path)
        ]

        print(f"\nCommand: {' '.join(cmd[:5])}...")
        print(f"Codec: {cfg.get('codec')}, Preset: {cfg.get('preset')}, CRF: {cfg.get('crf')}")
        print(f"Starting encode...\n")

        try:
            result = subprocess.run(cmd,
                                  capture_output=False,
                                  timeout=3600)  # 1 hour timeout

            if result.returncode == 0:
                output_size = os.path.getsize(output_path) / (1024*1024)
                print(f"\n✓ SUCCESS: {video_name}")
                print(f"  Output size: {output_size:.2f} MB")
                return True
            else:
                print(f"\n✗ FAILED: {video_name}")
                return False

        except subprocess.TimeoutExpired:
            print(f"\n✗ TIMEOUT: {video_name} (exceeded 1 hour)")
            return False
        except Exception as e:
            print(f"\n✗ ERROR: {video_name}")
            print(f"  {str(e)}")
            return False

    def run(self):
        """Run the batch watermarking process"""
        videos = self.get_video_files()

        if not videos:
            print(f"\n✗ No video files found in: {self.input_dir.absolute()}")
            print("Supported formats: mp4, mkv, avi, mov, flv, wmv")
            return

        print(f"\n{'='*60}")
        print(f"Found {len(videos)} video(s) to process")
        print(f"{'='*60}\n")

        successful = 0
        failed = 0

        for idx, video_path in enumerate(videos, 1):
            try:
                if self.process_video(video_path, len(videos), idx):
                    successful += 1
                else:
                    failed += 1
            except KeyboardInterrupt:
                print("\n\n✗ Processing interrupted by user")
                break
            except Exception as e:
                print(f"\n✗ Unexpected error: {str(e)}")
                failed += 1

        # Summary
        print(f"\n{'='*60}")
        print(f"SUMMARY")
        print(f"{'='*60}")
        print(f"Total:      {len(videos)}")
        print(f"Successful: {successful} ✓")
        print(f"Failed:     {failed} ✗")
        print(f"Output:     {self.output_dir.absolute()}")
        print(f"{'='*60}\n")

        if failed == 0:
            print("✓ All videos processed successfully!")
        else:
            print(f"⚠ {failed} video(s) failed to process")

if __name__ == "__main__":
    print("\n" + "="*60)
    print("FFmpeg Batch Watermark Burner v1.0")
    print("Burn logo + text vào video (hard watermark)")
    print("="*60 + "\n")

    burner = WatermarkBurner()
    burner.run()

    print("Press Enter to exit...")
    input()
