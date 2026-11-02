#!/usr/bin/env python3
"""
GhostGeist: Fish Audio TTS Voiceover Generator
Synthesizes the finalized demo video voiceover using Fish Audio's S2.1-Pro / Drama-3 engine.
"""

import os
import sys
import re
import json
import urllib.request
import urllib.error

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.abspath(os.path.join(SCRIPT_DIR, ".."))
OUTPUT_FILE = os.path.join(PROJECT_ROOT, "demo_voiceover.mp3")
# Voice Profiles (Fish Audio reference_ids)
VOICE_PROFILES = {
    "pro_narrator": "b007d3542ec447aa8c00bbb63607a538",       # Professional tech explainer, clear & authoritative
    "podcast_calm": "52837cf9bd91404883959110c3b44987",       # Calm, conversational, educational host
    "documentary_deep": "c3958f083c2d407982263c77cfa831e3",   # Mature, deep, authoritative tone
    "measured_narrator": "0327fdb5da9e4fd782899a8058c8ae2b"    # Deep, measured, deliberate pacing
}

DEFAULT_VOICE = "measured_narrator"

# Try to find FISH_AUDIO_API_KEY from environment, .env, or notes.txt
api_key = os.environ.get("FISH_AUDIO_API_KEY")
if not api_key:
    # Try reading notes.txt
    notes_path = os.path.join(PROJECT_ROOT, "notes.txt")
    if os.path.exists(notes_path):
        with open(notes_path, "r", encoding="utf-8") as f:
            for line in f:
                if line.startswith("fishaudio-key:"):
                    api_key = line.split(":", 1)[1].strip()
                    break

if not api_key:
    # Try reading .env
    env_path = os.path.join(PROJECT_ROOT, ".env")
    if os.path.exists(env_path):
        with open(env_path, "r", encoding="utf-8") as f:
            for line in f:
                if line.startswith("FISH_AUDIO_API_KEY="):
                    api_key = line.split("=", 1)[1].strip()
                    break

if not api_key:
    print("Error: FISH_AUDIO_API_KEY not found in environment, notes.txt, or .env", file=sys.stderr)
    sys.exit(1)

# Finalized, phonetically calibrated voiceover text with Fish Audio bracket syntax
VOICEOVER_TEXT = """[confident, brisk] Every software team has an expensive dirty secret: [subtle pause] twenty to thirty percent of real engineering work never touches Jira. [crisp, serious] Rapid hotfixes, tech debt, and emergency patches ship directly in GitHub, [short pause] leaving sprint burndowns flatlined, release notes incomplete, and engineering capacity invisible. [pause]

[upbeat, authoritative] Meet GhostGeist: built natively on Atlassian Forge with UI Kit Two. [subtle pause] GhostGeist proactively audits your GitHub repositories for untracked pull requests [pause] with zero mandatory credential setup. [confident, smooth] Instantly, our Command Center detects unbudgeted work, calculates shadow velocity points, and displays untracked branches directly inside your Jira project navigation.

[crisp, focused] Clicking View AI Analysis invokes Google Gemini three point eight Flash. [thoughtful pause] GhostGeist synthesizes the git diff against your live Jira backlog—automatically estimating Fibonacci story points, assigning issue types, and verifying duplicate tickets. [upbeat, confident] With one click, GhostGeist generates a native Atlassian Document Format issue via Jira REST API version three, [short pause] complete with bi-directional GitHub remote links and user-attributed permissions. [pause]

[confident, smooth] GhostGeist meets developers wherever they work. Through our declared Rovo M-C-P module and open-source skill file, [short pause] engineers can audit and reconcile shadow work directly inside Cursor or Claude Desktop. [subtle pause] And natively in Atlassian Rovo Chat, our autonomous GhostGeist Auditor agent investigates pull requests and converts unbudgeted code into Jira work items conversationally.

[authoritative, inspiring] Engineered for the Atlassian Marketplace, GhostGeist runs one hundred percent on serverless Forge, storing credentials in encrypted Key-Value Storage with zero secret egress. [thoughtful pause] Stop letting engineering work disappear into the shadows. [confident close] Ship with context, reconcile with confidence. Try GhostGeist today."""

def synthesize_audio(voice_name=DEFAULT_VOICE):
    ref_id = VOICE_PROFILES.get(voice_name, VOICE_PROFILES[DEFAULT_VOICE])
    print(f"Synthesizing demo voiceover using voice: '{voice_name}' (ID: {ref_id})...")
    url = "https://api.fish.audio/v1/tts"
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
        "model": "s2.1-pro-free"
    }
    payload = {
        "text": VOICEOVER_TEXT,
        "reference_id": ref_id,
        "format": "mp3",
        "latency": "normal"
    }

    try:
        data = json.dumps(payload).encode("utf-8")
        req = urllib.request.Request(url, data=data, headers=headers, method="POST")
        with urllib.request.urlopen(req, timeout=90) as response:
            audio_bytes = response.read()
            with open(OUTPUT_FILE, "wb") as f:
                f.write(audio_bytes)
            file_size_kb = len(audio_bytes) / 1024
            print(f"Success! Voiceover audio generated: {OUTPUT_FILE} ({file_size_kb:.1f} KB)")
    except urllib.error.HTTPError as e:
        error_body = e.read().decode("utf-8", errors="replace")
        print(f"HTTP Error {e.code}: {error_body}", file=sys.stderr)
        sys.exit(1)
    except Exception as e:
        print(f"Failed to generate audio: {e}", file=sys.stderr)
        sys.exit(1)

if __name__ == "__main__":
    voice = sys.argv[1] if len(sys.argv) > 1 else DEFAULT_VOICE
    synthesize_audio(voice)
