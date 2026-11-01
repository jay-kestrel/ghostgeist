# GhostGeist: Master Project & Submission Plan
**Atlassian Codegeist 2026 Hackathon**  
*Theme: "Build with context. Ship with confidence."*  
*Hackathon URL:* [codegeist2026.devpost.com](https://codegeist2026.devpost.com/)  
*Submission Deadline:* **December 22, 2026 @ 12:00 PM PST**  
*Target Grand Category:* **Apps for Software Teams** ($15,000 1st / $8,000 2nd / $5,000 3rd)  
*Target Bonus Categories:* **Best App with Atlassian MCP** ($1,500) & **Best Marketplace Published App** ($1,500)  
*Live Site:* [ghostgeist.atlassian.net](https://ghostgeist.atlassian.net/)  
*Repository:* [github.com/jay-kestrel/ghostgeist](https://github.com/jay-kestrel/ghostgeist)  

---

## 1. Executive Summary & Value Proposition

### The Problem: "The Shadow Work Blindspot"
Existing GitHub-Atlassian integrations are strictly **one-way and reactive**: they assume a developer meticulously creates a Jira ticket first, grabs the issue key (`PROJ-123`), and prefixes their git branch or commit message.

In reality, engineering teams spend 20–30% of their bandwidth on **shadow work**: rapid hotfixes, tech debt refactors, dependency updates, and experimental spikes opened directly as GitHub PRs without a prior Jira ticket. This creates institutional blindspots:
* Sprint burndowns and velocity metrics are inaccurate.
* Engineering managers and PMs lack visibility into unbudgeted engineering hours.
* Release notes omit critical un-ticketed bug fixes.
* Uncaptured work cannot be accounted for in R&D capitalization.

### The Solution: GhostGeist
**GhostGeist** is an **Engineering Shadow Work Reconciliation Platform** built natively on Atlassian Forge. Instead of acting as a "spam bot" that blindly auto-files low-quality tickets, GhostGeist delivers an intelligent, human-in-the-loop workflow:
1. **Scans & Filters**: Detects open GitHub PRs that lack valid Jira issue tracking keys.
2. **Context-Aware Gemini AI Reasoning**: Analyzes the PR diff, commit history, and metadata using **Gemini 3.8 Flash** with structured JSON output to synthesize clean titles, descriptions, issue types (Bug/Task/Story), and estimated story points.
3. **Interactive Triage Command Center**: Embeds a native Jira Project Page (UI Kit 2) where tech leads and scrum masters can inspect, adjust, and reconcile shadow work with one click.
4. **Jira REST API v3 & ADF Generation**: Instantly generates properly formatted Jira issues in Atlassian Document Format (ADF) with bi-directional remote links pointing directly to the GitHub PR.
5. **Rovo Model Context Protocol (MCP)**: Exposes tools (`get-untracked-prs`, `triage-pr-gemini`, `create-jira-ticket-from-pr`) on Atlassian's managed MCP server, allowing developers in **Cursor**, **Claude Desktop**, or **Rovo** to reconcile work directly from their IDE.

---

## 2. Technical Architecture & Decisions

```
                     ┌──────────────────────────────────────────────┐
                     │                 GitHub Repo                  │
                     │         (jay-kestrel/ghostgeist)             │
                     └──────────────────────┬───────────────────────┘
                                            │
                        GitHub REST API     │ (open PRs, diffs)
                                            ▼
┌──────────────────────────────────────────────────────────────────────────────────┐
│                             Atlassian Forge Runtime                              │
│                                                                                  │
│  ┌───────────────────────┐   ┌───────────────────────┐   ┌────────────────────┐  │
│  │  src/services/github  │   │  src/services/gemini  │   │ src/services/jira  │  │
│  │  • Fetch PRs & diffs  │   │  • Gemini 3.8 Flash   │   │ • ADF builder      │  │
│  │  • Regex key matching │   │  • Gemini 3.5 Fallback│   │ • Remote links     │  │
│  │  • Token auth         │   │  • Header auth        │   │ • asApp() requests │  │
│  └───────────────────────┘   └───────────────────────┘   └────────────────────┘  │
│                                           ▲                                      │
│                                           │ Resolvers & Services                 │
│  ┌────────────────────────────────────────┴───────────────────────────────────┐  │
│  │                 src/frontend/index.jsx (Forge UI Kit 2)                    │  │
│  │  • DynamicTable of Untracked PRs      • AI Analysis & Edit Modal           │  │
│  │  • Shadow Work Capacity Stat Cards    • 1-Click Reconcile Button           │  │
│  │  • Settings Drawer (KVS masked)       • Jira Deep Links                    │  │
│  └────────────────────────────────────────────────────────────────────────────┘  │
│                                           ▲                                      │
│                                           │ rovo:mcp Action Tools                │
│  ┌────────────────────────────────────────┴───────────────────────────────────┐  │
│  │                             src/mcp/index.js                               │  │
│  │  • get-untracked-prs    • triage-pr-gemini    • create-jira-ticket-from-pr │  │
│  └────────────────────────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────────────────────────┘
```

### Key Grounded Engineering Decisions:
* **UI Kit 2 (`@forge/react`)**: 100% native Atlassian components (`DynamicTable`, `Badge`, `Lozenge`, `Modal`, `Stack`, `Inline`) for maximum responsiveness, zero bundle overhead, and native theme compliance.
* **On-Demand Triage Architecture**: Eliminates blocking sequential loops during initial repo scan. The list of untracked PRs loads instantaneously, while `gemini-3.8-flash` is invoked on-demand with the full 25-second Forge execution window available for deep reasoning.
* **Bridge Security & Token Protection**: Raw credentials (GitHub PAT and Gemini API key) are stored server-side in Forge KVS and never transmitted over the client bridge.
* **ADF Specification Strictness**: `src/services/jira.js` validates that no empty string text nodes are ever emitted, preventing Jira Cloud API v3 `400 Bad Request` schema errors.
* **Dual AI Strategy**: Uses Google's `gemini-3.8-flash` (version 3.0 reasoning model) as primary, with automatic fallback to `gemini-3.5-flash` and `gemini-3.5-flash-lite` for ultra-fast response times.

---

## 3. Implementation Status & Milestones

| Milestone | Deliverable | Status |
| :--- | :--- | :---: |
| **M1: Setup & Grounding** | Scraped rules, registered Developer Space (`GhostGeist`), installed `@forge/cli@15.0.0`, verified credentials in `.env`, grounded tech specs in `TECHNICAL_SPEC.md`. | ✅ **Complete** |
| **M2: App Scaffolding** | Scaffolded native Jira Project Page app, deployed v2.0.0, installed to `ghostgeist.atlassian.net`. | ✅ **Complete** |
| **M3: Full Implementation** | Built GitHub service, Gemini 3 service, Jira REST API v3 ADF builder, KVS config, UI Kit 2 dashboard, and Rovo MCP handlers. | ✅ **Complete** |
| **M4: Adversarial Audit** | Senior Security Reviewer identified 4 blockers (secret leakage, ADF empty string bug, Gemini model alignment, null inputs). | ✅ **Complete** |
| **M5: Remediation & Verification** | Applied all fixes; 10/10 unit tests passing, 0 lint errors, deployed v3.0.0, upgraded live on `ghostgeist.atlassian.net`. | ✅ **Complete** |
| **M6: Live Test Data** | Created branch `feat/optimize-auth-session-cache` and opened live untracked **[PR #1](https://github.com/jay-kestrel/ghostgeist/pull/1)** on GitHub. | ✅ **Complete** |
| **M7: Live End-to-End Verification** | Confirm scan, triage, and issue reconciliation on `ghostgeist.atlassian.net`. | 🟡 **Next Up** |
| **M8: Demo Video Production** | Screen recording, Fish Audio voiceover synthesis, and ffmpeg assembly into a 2-minute demo. | ⏳ Pending |
| **M9: Devpost & Marketplace Package** | Submission copy, Forge installation link generation, Marketplace review ticket submission. | ⏳ Pending |

---

## 4. Phase-by-Phase Roadmap for Completion

### Phase 4: Live Verification on `ghostgeist.atlassian.net`
1. Navigate to `ghostgeist.atlassian.net` and open any Jira Software project.
2. Open the **GhostGeist Triage** page from the sidebar.
3. Click **"Scan Untracked PRs"** to verify that GitHub PR #1 appears.
4. Click **"View AI Analysis"** to verify `gemini-3.8-flash` outputs the suggested title, story points, and description.
5. Click **"Reconcile to Jira"** to verify the new issue is created in Jira and linked to the PR.

### Phase 5: Automated Demo Video Pipeline (Target: 2:00 Minutes)
Judges are not required to watch beyond 3 minutes. Our target duration is **1:45 to 2:15 minutes**.
* **Step 1: Script & Storyboard**
  * `0:00 - 0:25`: The Problem (The Shadow Work Blindspot; untracked PRs destroying velocity).
  * `0:25 - 0:50`: The Solution (Opening GhostGeist in Jira; 1-click scan detecting untracked PR #1).
  * `0:50 - 1:25`: Gemini AI Reasoning (Inspecting the AI analysis card; structured story points and ADF summary).
  * `1:25 - 1:45`: Reconciliation & Remote Link (1-click create issue; showing the Jira issue and GitHub remote link).
  * `1:45 - 2:00`: MCP & Marketplace (Showing Rovo MCP tool capability in IDE; closing pitch).
* **Step 2: Voiceover Generation via Fish Audio**
  * Run Python script using `FISH_AUDIO_API_KEY` to synthesize `demo_voiceover.mp3`.
* **Step 3: Screen Recording & Stitching**
  * Record clean 1080p screen capture.
  * Merge audio and video using `/opt/homebrew/bin/ffmpeg`:
    ```bash
    ffmpeg -i screen_recording.mp4 -i demo_voiceover.mp3 -c:v copy -c:a aac -shortest final_submission_demo.mp4
    ```

### Phase 6: Devpost & Marketplace Submission Package
1. **Public YouTube Upload**: Upload `final_submission_demo.mp4` as Public on YouTube.
2. **Forge Installation Link**: Generate via `forge install --link` or Atlassian Developer Console.
3. **Atlassian Marketplace Submission**:
   * Package app manifest and submit for listing in the Atlassian Marketplace Partner Console to generate a Marketplace Review Ticket.
   * Provide the review ticket URL in the Devpost form to qualify for the **$1,500 Best Marketplace App Prize**.
4. **Devpost Form Submission**:
   * Category: **Apps for Software Teams**.
   * Bonus Prizes Selected: **Best app with Atlassian MCP** & **Best Marketplace published app**.
   * Written Pitch: Elevator pitch, Inspiration, What it does, How we built it, Challenges, and What's next.

---

## 5. Quick Reference & Commands

### Local Environment Commands
```bash
# Run unit test suite
cd ghostgeist && npm test

# Run linter
cd ghostgeist && npm run lint
forge lint

# Deploy app to development environment
cd ghostgeist && forge deploy

# Upgrade installation on live site
cd ghostgeist && forge install --upgrade -e development -s ghostgeist.atlassian.net -p jira --confirm-scopes --non-interactive

# View live runtime logs
cd ghostgeist && forge logs -e development
```

### Key Credentials & Config Mapping (Stored in `.env`)
* `GITHUB_REPO`: `jay-kestrel/ghostgeist`
* `GITHUB_PAT`: Configured in `.env` (Admin permissions)
* `GEMINI_API_KEY`: Configured in `.env` (Google AI Studio)
* `FISH_AUDIO_API_KEY`: Configured in `.env` (Audio TTS)
* `FORGE_EMAIL`: `jayaram.hariharan@gmail.com`
* `ATLASSIAN_SITE`: `https://ghostgeist.atlassian.net/`
* `FORGE_APP_ID`: `ari:cloud:ecosystem::app/8f916e76-19dc-490d-8440-d6ff0cf9122d`
