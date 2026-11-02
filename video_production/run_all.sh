#!/usr/bin/env bash
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

echo "============================================================"
echo "🎬 GhostGeist: Complete Demo Video Production Pipeline"
echo "============================================================"

# 1. Render all 10 animated HTML scenes directly to 1080p 30fps MP4 clips via Puppeteer & FFmpeg
echo "Step 1/2: Rendering 10 animated video clips via Chrome & FFmpeg..."
node "$SCRIPT_DIR/render_scenes.js"

# 2. Stitch clips and combine with backing audio track
echo "Step 2/2: Stitching clips with demo_backing_audio.mp3..."
python3 "$SCRIPT_DIR/stitch_video.py"

echo "============================================================"
echo "✅ Demo video production complete!"
echo "Master video: $PROJECT_ROOT/ghostgeist_demo_master.mp4"
echo "============================================================"
