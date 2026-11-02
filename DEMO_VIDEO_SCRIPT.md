# GhostGeist — Official Codegeist 2026 Demo Video Production Script & Storyboard

**Project Name:** GhostGeist  
**Target Duration:** Exactly **2 minutes 15 seconds** (135 seconds) — *Maximum Codegeist threshold is 3 minutes.*  
**Voiceover Engine:** [Fish Audio](https://fish.audio) (Voice: *Measured Storyteller*, ID: `0327fdb5da9e4fd782899a8058c8ae2b`, Model: `s2.1-pro-free`)  
**Actual Synthesized Audio Duration:** **111.8 seconds** (~1 minute 52 seconds)  
**Spoken Word Count:** **298 words** (~132 WPM — relaxed, crisp, breathing room for clicks and transitions)  
**Style:** Option 2 — *The Speedrun Product Showcase* (Apple-style precision, authoritative, tech-forward, zero fluff)  
**Primary Track:** Apps for Software Teams  
**Bonus Prize Tracks:**
1. **Best App with Atlassian MCP** (`rovo:mcp` + Cursor / Claude Desktop + `skill.md`)
2. **Best Agents — Rovo / Assignable Agents** (`rovo:agent` in Atlassian Rovo Chat)
3. **Best Marketplace Published App** (100% Forge UI Kit 2, zero secret egress, Forge KVS, 60s zero-config judge testing)

---

## 🎬 Two-Column Video Storyboard & Screenplay

| Timestamp | Screen Recording Visual Direction & Lower-Third Overlays | Voiceover Audio Script (Phonetic & Fish Audio Bracket Syntax) |
| :--- | :--- | :--- |
| **0:00 - 0:08** | **VISUAL:** Fast, high-contrast dark-mode split screen.<br/>• **Left:** GitHub PR #1 (`jay-kestrel/ghostgeist/pull/1`) showing un-ticketed branch `feat/optimize-auth-session-cache` merging directly into `main`.<br/>• **Right:** Jira Software Sprint Burndown Chart completely flatlining at zero velocity.<br/><br/>**OVERLAY:** `[LOWER-THIRD: Apps for Software Teams \| The Shadow Work Blindspot]` | `[confident, brisk]` Every software team has an expensive dirty secret: `[subtle pause]` twenty to thirty percent of real engineering work never touches Jira. |
| **0:08 - 0:18** | **VISUAL:** Digital zoom into GitHub PR #1 multi-file diff view showing sensitive session authentication and database pool eviction logic. Pulsing red alert border highlights: *"Missing Jira Key"*. Red pill badges appear: *"Lost Velocity"*, *"SOC-2 Audit Risk"*, *"Unbudgeted Hours"*.<br/><br/>**OVERLAY:** `[PILL: Problem: 20-30% Untracked Bandwidth \| SOC-2 & Sprint Blindspots]` | `[crisp, serious]` Rapid hotfixes, tech debt, and emergency patches ship directly in GitHub, `[short pause]` leaving sprint burndowns flatlined, release notes incomplete, and engineering capacity invisible. `[pause]` |
| **0:18 - 0:33** | **VISUAL:** Swift Apple-style zoom transition into **Jira Cloud** (`ghostgeist.atlassian.net/jira/software/projects/GHOST/`). Cursor clicks **GhostGeist Triage** in the left project sidebar. Native Forge UI Kit 2 page renders instantly in native dark mode (zero iframe lag).<br/><br/>**OVERLAY:** `[LOWER-THIRD: 100% Native Forge UI Kit Two \| Design & Architecture]` | `[upbeat, authoritative]` Meet GhostGeist: built natively on Atlassian Forge with UI Kit Two. `[subtle pause]` GhostGeist proactively audits your GitHub repositories for untracked pull requests `[pause]` with zero mandatory credential setup. |
| **0:33 - 0:45** | **VISUAL:** Cursor clicks the primary blue **"Scan PRs"** button. Fast spinner (0.5s speed-ramped). Three UI Kit 2 stat cards pop into view:<br/>1. *Untracked Shadow PRs: 1 (Red Lozenge: Action Needed)*<br/>2. *Estimated Shadow Points: 3 pts (Primary Badge)*<br/>3. *Target Jira Project: GHOST (Lozenge: jay-kestrel/ghostgeist)*<br/>Below, `DynamicTable` displays PR #1 opened by developer Jay Kestrel.<br/><br/>**OVERLAY:** `[PILL: 60-Second Zero-Config Judge Testing \| No Setup Required]` | `[confident, smooth]` Instantly, our Command Center detects unbudgeted work, calculates shadow velocity points, and displays untracked branches directly inside your Jira project navigation. |
| **0:45 - 1:02** | **VISUAL:** Cursor clicks **"View AI Analysis"** on PR #1. Modal slides open: *Gemini AI Triage: PR #1* (speed-ramped 0.5s).<br/>Cursor highlights:<br/>• *Suggested Summary:* `Optimize authentication session cache and connection pool lifecycle`<br/>• *Issue Type:* `Task` button highlighted<br/>• *Story Points:* `3 pts` highlighted<br/>• *Architectural Rationale Card:* Gemini's analysis of session validation middleware.<br/>• *Duplicate Check Alert:* Green `SectionMessage` confirming no conflicting tickets.<br/><br/>**OVERLAY:** `[LOWER-THIRD: Google Gemini 3.8 Flash Reasoning \| Context-Aware AI Triage]` | `[crisp, focused]` Clicking View AI Analysis invokes Google Gemini three point eight Flash. `[thoughtful pause]` GhostGeist synthesizes the git diff against your live Jira backlog—automatically estimating Fibonacci story points, assigning issue types, and verifying duplicate tickets. |
| **1:02 - 1:22** | **VISUAL:** Inside the modal, cursor clicks **"Create Jira Issue & Link PR"**. Subtle loading indicator (0.6s speed-ramped). Modal closes.<br/>Green Atlassian `SectionMessage` appears: *"Successfully reconciled PR number one to Jira! Created Issue: GHOST-1"*. Cursor clicks ticket link `GHOST-1`. Jira issue view opens showing:<br/>1. Rich Atlassian Document Format (ADF) description with code blocks.<br/>2. Reporter attribution (`api.asUser()`).<br/>3. Clickable bi-directional GitHub remote link under Issue Links.<br/><br/>**OVERLAY:** `[PILL: Jira Cloud REST API v3 \| Strict ADF Trees & Bi-Directional Remote Links]` | `[upbeat, confident]` With one click, GhostGeist generates a native Atlassian Document Format issue via Jira REST API version three, `[short pause]` complete with bi-directional GitHub remote links and user-attributed permissions. `[pause]` |
| **1:22 - 1:37** | **VISUAL:** Screen splits or transitions to **Cursor IDE / Claude Desktop**. Terminal displays GhostGeist MCP connection over Atlassian's remote gateway (`mcp.atlassian.com`). User asks agent: *"Audit repo for untracked PRs and reconcile them."* The IDE agent invokes `get-untracked-prs` and `triage-pr-gemini`, rendering a formatted triage card directly in the code editor.<br/><br/>**OVERLAY:** `[LOWER-THIRD: Bonus Prize 1: Best App with Atlassian MCP \| rovo:mcp + skill.md]` | `[confident, smooth]` GhostGeist meets developers wherever they work. Through our declared Rovo M-C-P module and open-source skill file, `[short pause]` engineers can audit and reconcile shadow work directly inside Cursor or Claude Desktop. |
| **1:37 - 1:52** | **VISUAL:** Smooth slide to Jira Cloud with **Atlassian Rovo Chat** open. User asks: *"@GhostGeist Auditor: Audit open pull requests"*. The native Rovo Agent executes tools conversationally and outputs the triage summary card with 1-click action buttons.<br/><br/>**OVERLAY:** `[LOWER-THIRD: Bonus Prize 2: Best Agents — Rovo \| rovo:agent in Rovo Chat]` | `[subtle pause]` And natively in Atlassian Rovo Chat, our autonomous GhostGeist Auditor agent investigates pull requests and converts unbudgeted code into Jira work items conversationally. |
| **1:52 - 2:05** | **VISUAL:** Fast technical montage:<br/>1. Terminal running `forge lint` showing **0 problems, 0 errors, 0 warnings**.<br/>2. Architecture diagram highlighting Forge serverless runtime and encrypted Key-Value Storage (`@forge/kvs`) with strict egress limited solely to GitHub and Gemini.<br/><br/>**OVERLAY:** `[LOWER-THIRD: Bonus Prize 3: Best Marketplace Published App \| Zero Egress Leakage]` | `[authoritative, inspiring]` Engineered for the Atlassian Marketplace, GhostGeist runs one hundred percent on serverless Forge, storing credentials in encrypted Key-Value Storage with zero secret egress. |
| **2:05 - 2:15** | **VISUAL:** Camera zooms out to the live Jira Kanban board showing the newly reconciled issue `GHOST-1` in the active sprint column. Hero outro slide animates onto the screen.<br/><br/>**HERO OUTRO CARD:**<br/>**GhostGeist**<br/>*Reconcile Shadow Engineering Work with Confidence*<br/>*Atlassian Codegeist 2026 Submission*<br/>*Live Demo: ghostgeist.atlassian.net*<br/>*GitHub: github.com/jay-kestrel/ghostgeist* | `[thoughtful pause]` Stop letting engineering work disappear into the shadows. `[confident close]` Ship with context, reconcile with confidence. Try GhostGeist today. |

---

## 🎙️ Clean Fish Audio Spoken Script (Phonetic & Optimized)

Copy and paste this exact text block into Fish Audio (or run via `python3 scripts/generate_voiceover.py`):

```text
[confident, brisk] Every software team has an expensive dirty secret: [subtle pause] twenty to thirty percent of real engineering work never touches Jira. [crisp, serious] Rapid hotfixes, tech debt, and emergency patches ship directly in GitHub, [short pause] leaving sprint burndowns flatlined, release notes incomplete, and engineering capacity invisible. [pause]

[upbeat, authoritative] Meet GhostGeist: built natively on Atlassian Forge with UI Kit Two. [subtle pause] GhostGeist proactively audits your GitHub repositories for untracked pull requests [pause] with zero mandatory credential setup. [confident, smooth] Instantly, our Command Center detects unbudgeted work, calculates shadow velocity points, and displays untracked branches directly inside your Jira project navigation.

[crisp, focused] Clicking View AI Analysis invokes Google Gemini three point eight Flash. [thoughtful pause] GhostGeist synthesizes the git diff against your live Jira backlog—automatically estimating Fibonacci story points, assigning issue types, and verifying duplicate tickets. [upbeat, confident] With one click, GhostGeist generates a native Atlassian Document Format issue via Jira REST API version three, [short pause] complete with bi-directional GitHub remote links and user-attributed permissions. [pause]

[confident, smooth] GhostGeist meets developers wherever they work. Through our declared Rovo M-C-P module and open-source skill file, [short pause] engineers can audit and reconcile shadow work directly inside Cursor or Claude Desktop. [subtle pause] And natively in Atlassian Rovo Chat, our autonomous GhostGeist Auditor agent investigates pull requests and converts unbudgeted code into Jira work items conversationally.

[authoritative, inspiring] Engineered for the Atlassian Marketplace, GhostGeist runs one hundred percent on serverless Forge, storing credentials in encrypted Key-Value Storage with zero secret egress. [thoughtful pause] Stop letting engineering work disappear into the shadows. [confident close] Ship with context, reconcile with confidence. Try GhostGeist today.
```

---

## 🎯 Codegeist 2026 Judging Criteria Verification

| Judging Criterion (Tie-Breaker Order) | Weight | Where & How It Is Proven in the Video |
| :--- | :---: | :--- |
| **1. Technological Implementation** | 20% | Demonstrates multi-module Forge architecture (`jira:projectPage`, `rovo:mcp`, `rovo:agent`, `action`), Node 24 runtime, recursive ADF v1 syntax tree generation without empty text nodes, `api.asUser()` Jira permission attribution, and Forge KVS security. |
| **2. Design** | 20% | 100% native Atlassian Design System (`@forge/react` UI Kit 2) with zero iframe lag, seamless light/dark mode compliance, dynamic capacity cards, and human-in-the-loop review modal. |
| **3. Potential Impact** | 20% | Solves the 20-30% shadow capacity blindspot, restores sprint velocity accuracy, preserves release notes integrity, and secures change-management audit trails for SOC-2 and R&D capitalization. |
| **4. Innovation / Idea** | 20% | Reverses reactive Jira integrations; proactively discovers un-ticketed work and blends git diffs with Jira project context using Gemini 3.8 Flash. |
| **5. Presentation** | 20% | Fast 2:15 runtime (well under the 3-minute limit), clear audio-visual synchronization, distinct lower-third overlays for all bonus tracks, and zero-config judge test onboarding. |

---

## 🎥 Screen Recording Choreography Checklist (For Jayaram)

Before recording, set up these three browser tabs and windows:
1. **Window 1 (Jira Cloud):**
   * URL: `https://ghostgeist.atlassian.net/jira/software/projects/GHOST/apps/8f916e76-19dc-490d-8440-d6ff0cf9122d/00436796-5548-469e-b60e-93b709397200`
   * Browser zoom set to **115%–120%** for maximum readability on YouTube 1080p.
   * Untracked PR #1 present in test repo `jay-kestrel/ghostgeist`.
2. **Window 2 (GitHub):**
   * URL: `https://github.com/jay-kestrel/ghostgeist/pull/1/files`
   * Shows diff of `feat/optimize-auth-session-cache` (session cache middleware & eviction).
3. **Window 3 (Cursor / Claude Desktop or Terminal):**
   * Showing `skills/ghostgeist/skill.md` or MCP tool invocation `get-untracked-prs`.
4. **Post-Recording Speed-Ramp Note:**
   * When editing, speed-ramp the ~3.4s Gemini API wait time and the ~1.2s Jira API issue creation down to ~0.5s so the video keeps momentum.
