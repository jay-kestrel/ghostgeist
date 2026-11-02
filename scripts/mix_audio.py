#!/usr/bin/env python3
"""
GhostGeist: Automated Audio Mixing & Ducking Tool
Layers royalty-free background music behind the Fish Audio TTS voiceover
using FFmpeg sidechain compression (auto-ducking) and frequency separation.
"""

import os
import sys
import subprocess
import argparse

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.abspath(os.path.join(SCRIPT_DIR, ".."))

DEFAULT_VOICEOVER = os.path.join(PROJECT_ROOT, "demo_voiceover.mp3")
DEFAULT_BGM = os.path.join(PROJECT_ROOT, "bgm_options", "01_deep_techno_ambience.mp3")
DEFAULT_OUTPUT = os.path.join(PROJECT_ROOT, "demo_mixed_final.mp3")


def get_audio_duration(file_path):
    """Retrieve audio duration in seconds using ffprobe."""
    cmd = [
        "ffprobe", "-v", "quiet",
        "-show_entries", "format=duration",
        "-of", "csv=p=0",
        file_path
    ]
    result = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
    if result.returncode != 0:
        raise RuntimeError(f"Failed to probe {file_path}: {result.stderr}")
    return float(result.stdout.strip())


def mix_audio(voice_path, bgm_path, out_path, voice_boost_db=11.0, bgm_level_db=-25.0, duck_ratio=5.0):
    if not os.path.exists(voice_path):
        print(f"Error: Voiceover file not found: {voice_path}", file=sys.stderr)
        sys.exit(1)
    if not os.path.exists(bgm_path):
        print(f"Error: BGM file not found: {bgm_path}", file=sys.stderr)
        sys.exit(1)

    voice_dur = get_audio_duration(voice_path)
    bgm_dur = get_audio_duration(bgm_path)

    print(f"🎙️  Voiceover track : {voice_path} ({voice_dur:.1f}s)")
    print(f"🎵 Background music : {bgm_path} ({bgm_dur:.1f}s)")
    print(f"🔊 Voice boost      : +{voice_boost_db:.1f} dB (front-and-center)")
    print(f"🎚️  BGM base level   : {bgm_level_db:.1f} dB (subtle background bed)")

    fade_out_start = max(0.0, voice_dur - 3.0)

    # Filter graph explanation:
    # 1. Voice: Boost gain (+11dB) to bring peak to ~ -1.5dB, convert to stereo, split into mix & sidechain
    # 2. BGM: Drop to subtle background (-25dB), carve vocal pocket (-4dB @ 2.5kHz), add fades
    # 3. Ducking: Sidechain compress BGM against voice signal (threshold=0.08, ratio=5)
    # 4. Mix: Combine voice + ducked BGM with normalize=false to prevent amix attenuation
    filter_complex = (
        f"[0:a]volume={voice_boost_db:.1f}dB,aformat=channel_layouts=stereo,asplit=2[v_mix][v_sc];"
        f"[1:a]volume={bgm_level_db:.1f}dB,"
        f"equalizer=f=2500:width_type=o:width=1.5:g=-4.0,"
        f"afade=t=in:ss=0:d=1.5,"
        f"afade=t=out:st={fade_out_start:.2f}:d=3.0[bg_eq];"
        f"[bg_eq][v_sc]sidechaincompress=threshold=0.08:ratio={duck_ratio}:attack=40:release=350[ducked];"
        f"[v_mix][ducked]amix=inputs=2:duration=first:normalize=false[mixed];"
        f"[mixed]aformat=channel_layouts=stereo[out]"
    )

    cmd = [
        "ffmpeg", "-y",
        "-i", voice_path,
        "-i", bgm_path,
        "-filter_complex", filter_complex,
        "-map", "[out]",
        "-c:a", "libmp3lame",
        "-b:a", "256k",
        out_path
    ]

    print("⚡ Mixing and mastering with voice priority + dynamic ducking...")
    result = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)

    if result.returncode != 0:
        print(f"FFmpeg Error:\n{result.stderr}", file=sys.stderr)
        sys.exit(result.returncode)

    out_size_mb = os.path.getsize(out_path) / (1024 * 1024)
    print(f"✅ Success! Mastered audio created: {out_path} ({out_size_mb:.2f} MB)")


def main():
    parser = argparse.ArgumentParser(description="Mix voiceover with background music using dynamic auto-ducking.")
    parser.add_argument("--voice", default=DEFAULT_VOICEOVER, help="Path to voiceover MP3")
    parser.add_argument("--bgm", default=DEFAULT_BGM, help="Path to background music MP3")
    parser.add_argument("--output", default=DEFAULT_OUTPUT, help="Path to output mixed MP3")
    parser.add_argument("--voice-boost", type=float, default=11.0, help="Voice boost in dB (default: +11.0 dB)")
    parser.add_argument("--bgm-level", type=float, default=-25.0, help="BGM base level in dB (default: -25.0 dB)")
    parser.add_argument("--duck-ratio", type=float, default=5.0, help="Compression ducking ratio (default: 5.0)")

    args = parser.parse_args()
    mix_audio(args.voice, args.bgm, args.output, args.voice_boost, args.bgm_level, args.duck_ratio)


if __name__ == "__main__":
    main()
