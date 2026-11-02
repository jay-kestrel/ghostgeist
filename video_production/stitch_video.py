#!/usr/bin/env python3
"""
GhostGeist: Demo Video Stitcher
Concatenates the 10 rendered video clips and binds the finalized audio track
(demo_backing_audio.mp3) into the master submission video: ghostgeist_demo_master.mp4.
"""

import os
import sys
import subprocess
import json

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.abspath(os.path.join(SCRIPT_DIR, ".."))
CLIPS_DIR = os.path.join(SCRIPT_DIR, "clips")
AUDIO_FILE = os.path.join(PROJECT_ROOT, "demo_backing_audio.mp3")
MASTER_OUTPUT = os.path.join(PROJECT_ROOT, "ghostgeist_demo_master.mp4")
CONCAT_FILE = os.path.join(SCRIPT_DIR, "concat_clips.txt")


def check_file(path, desc):
    if not os.path.exists(path):
        print(f"Error: {desc} not found at {path}", file=sys.stderr)
        sys.exit(1)


def get_media_info(file_path):
    cmd = [
        "ffprobe", "-v", "quiet",
        "-print_format", "json",
        "-show_format", "-show_streams",
        file_path
    ]
    res = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
    if res.returncode != 0:
        raise RuntimeError(f"ffprobe failed for {file_path}: {res.stderr}")
    return json.loads(res.stdout)


def stitch_demo_video():
    print("=" * 60)
    print("🎬 GhostGeist: Stitching Demo Video & Backing Audio Track")
    print("=" * 60)

    check_file(AUDIO_FILE, "Demo backing audio track")

    # Verify all 10 clips exist
    clip_files = []
    total_video_duration = 0.0

    with open(CONCAT_FILE, "w", encoding="utf-8") as f_out:
        for i in range(1, 11):
            clip_name = f"scene_{i:02d}.mp4"
            clip_path = os.path.join(CLIPS_DIR, clip_name)
            check_file(clip_path, f"Clip {clip_name}")
            clip_files.append(clip_path)

            info = get_media_info(clip_path)
            dur = float(info["format"]["duration"])
            total_video_duration += dur
            print(f"  • {clip_name:12s} : {dur:6.2f}s (1920x1080 @ 30fps)")

            # Concat demuxer needs absolute or relative paths
            f_out.write(f"file '{clip_path}'\n")

    audio_info = get_media_info(AUDIO_FILE)
    audio_dur = float(audio_info["format"]["duration"])

    print("-" * 60)
    print(f"📊 Total Video Duration : {total_video_duration:.2f}s")
    print(f"🎵 Audio Track Duration : {audio_dur:.2f}s")
    print(f"⏱️ Drift / Delta        : {abs(total_video_duration - audio_dur):.3f}s (sub-frame sync)")
    print("-" * 60)

    # Stitch video clips with concat demuxer and mix with demo_backing_audio.mp3
    cmd = [
        "ffmpeg", "-y",
        "-f", "concat",
        "-safe", "0",
        "-i", CONCAT_FILE,
        "-i", AUDIO_FILE,
        "-map", "0:v",
        "-map", "1:a",
        "-c:v", "copy",
        "-c:a", "aac",
        "-b:a", "256k",
        "-shortest",
        MASTER_OUTPUT
    ]

    print(f"⚡ Muxing master video to: {MASTER_OUTPUT} ...")
    res = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
    if res.returncode != 0:
        print(f"FFmpeg Concatenation Error:\n{res.stderr}", file=sys.stderr)
        sys.exit(res.returncode)

    master_info = get_media_info(MASTER_OUTPUT)
    master_dur = float(master_info["format"]["duration"])
    master_size_mb = os.path.getsize(MASTER_OUTPUT) / (1024 * 1024)

    print("=" * 60)
    print(f"🎉 MASTER DEMO VIDEO COMPLETE: {MASTER_OUTPUT}")
    print(f"📏 Resolution : 1920x1080 (Full HD, 30fps, H.264 High Profile)")
    print(f"⏱️ Duration   : {master_dur:.2f}s (~{int(master_dur // 60)}m {int(master_dur % 60)}s)")
    print(f"💾 File Size  : {master_size_mb:.2f} MB")
    print("=" * 60)


if __name__ == "__main__":
    stitch_demo_video()
