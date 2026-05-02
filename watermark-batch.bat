@echo off
REM ============================================
REM FFmpeg Batch Watermark Burner for Windows
REM Burn logo + text vào video (hard watermark)
REM ============================================

setlocal enabledelayedexpansion

REM Config
set INPUT_DIR=videos-to-watermark
set OUTPUT_DIR=videos-watermarked
set LOGO_FILE=assets\watermark-logo.png
set COPYRIGHT_TEXT=© 2024 MovieName
set POSITION=bottom-right

REM Font config
set FONT_SIZE=24
set FONT_COLOR=white@0.7
set MARGIN=20

REM Encoding config
set CODEC=libx264
set PRESET=medium
set CRF=23

REM Check if FFmpeg exists
where ffmpeg >nul 2>nul
if errorlevel 1 (
    echo [ERROR] FFmpeg not found! Install it first:
    echo choco install ffmpeg (nếu dùng Chocolatey)
    echo hoặc tải từ https://ffmpeg.org/download.html
    pause
    exit /b 1
)

REM Create output directory
if not exist "%OUTPUT_DIR%" mkdir "%OUTPUT_DIR%"

REM Count files
setlocal enabledelayedexpansion
set count=0
for %%f in ("%INPUT_DIR%\*.mp4" "%INPUT_DIR%\*.mkv" "%INPUT_DIR%\*.avi") do (
    set /a count+=1
)

if %count% equ 0 (
    echo [ERROR] Không tìm thấy video file trong %INPUT_DIR%
    echo Hãy đưa file vào thư mục này rồi chạy lại.
    pause
    exit /b 1
)

echo.
echo ========================================
echo Found %count% video file(s)
echo ========================================
echo.

REM Process each video
set processed=0
for %%f in ("%INPUT_DIR%\*.mp4" "%INPUT_DIR%\*.mkv" "%INPUT_DIR%\*.avi") do (
    set /a processed+=1
    set input_file=%%f
    set filename=%%~nf
    set extension=%%~xf
    set output_file=%OUTPUT_DIR%\!filename!_watermarked.mp4

    echo.
    echo [!processed!/%count%] Processing: !filename!
    echo Input: !input_file!
    echo Output: !output_file!
    echo.

    REM Build FFmpeg filter
    REM Position mapping: top-right, bottom-right, top-left, bottom-left
    if "%POSITION%"=="bottom-right" (
        set LOGO_POS=x=W-w-!MARGIN!:y=H-h-!MARGIN!
        set TEXT_POS=x=W-text_w-!MARGIN!:y=H-text_h-!MARGIN!-30
    ) else if "%POSITION%"=="top-right" (
        set LOGO_POS=x=W-w-!MARGIN!:y=!MARGIN!
        set TEXT_POS=x=W-text_w-!MARGIN!:y=!MARGIN!+30
    ) else if "%POSITION%"=="top-left" (
        set LOGO_POS=x=!MARGIN!:y=!MARGIN!
        set TEXT_POS=x=!MARGIN!:y=!MARGIN!+30
    ) else (
        set LOGO_POS=x=!MARGIN!:y=H-h-!MARGIN!
        set TEXT_POS=x=!MARGIN!:y=H-text_h-!MARGIN!-30
    )

    REM Build FFmpeg command with both logo and text watermarks
    set FILTER=[0:v]scale=1920:-1[scaled];[scaled]overlay=!LOGO_POS!:alpha=0.8[with_logo];[with_logo]drawtext=text='!COPYRIGHT_TEXT!':fontsize=!FONT_SIZE!:fontcolor=!FONT_COLOR!:!TEXT_POS![out]

    REM Run FFmpeg with hardware acceleration (if available)
    ffmpeg -i "!input_file!" ^
        -vf "!FILTER!" ^
        -c:v !CODEC! ^
        -preset !PRESET! ^
        -crf !CRF! ^
        -c:a aac ^
        -b:a 128k ^
        "!output_file!" ^
        -y

    if errorlevel 1 (
        echo [ERROR] Lỗi xử lý !filename!
        echo Tiếp tục với file tiếp theo...
    ) else (
        echo [OK] Hoàn thành !filename!
    )
)

echo.
echo ========================================
echo Hoàn thành! Các file watermarked:
echo Output folder: %OUTPUT_DIR%
echo ========================================
echo.
pause
