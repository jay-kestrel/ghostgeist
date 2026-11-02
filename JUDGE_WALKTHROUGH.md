# ⚡ GhostGeist — Official Judge Walkthrough & Evaluation Guide

**Hackathon:** [Atlassian Codegeist 2026](https://codegeist2026.devpost.com/) — *"Build with context. Ship with confidence."*  
**App Name:** GhostGeist  
**Forge App ID:** `ari:cloud:ecosystem::app/8f916e76-19dc-490d-8440-d6ff0cf9122d`  
**Primary Track:** **Apps for Software Teams**  
**Bonus Prize Tracks:**
1. **Best App with Atlassian MCP** (`rovo:mcp` + open-source `skill.md`)
2. **Best Agents — Rovo / Assignable Agents** (`rovo:agent` module)
3. **Best Marketplace Published App** (100% Native Forge UI Kit 2, Zero Egress Leakage)

---

## 🔗 Key Links for Judges

- **Live Demonstration Jira Instance:** [GhostGeist on Jira Cloud](https://ghostgeist.atlassian.net/jira/software/projects/GHOST/apps/8f916e76-19dc-490d-8440-d6ff0cf9122d/00436796-5548-469e-b60e-93b709397200)
- **1080p Master Demo Video (1m 52s):** [`ghostgeist_demo_master.mp4`](ghostgeist_demo_master.mp4)
- **Full Video Script & Screen Choreography:** [`DEMO_VIDEO_SCRIPT.md`](DEMO_VIDEO_SCRIPT.md)
- **Public Demo GitHub Repository:** [jay-kestrel/ghostgeist](https://github.com/jay-kestrel/ghostgeist)
- **Open-Source Agent Skill Definition:** [`skills/ghostgeist/skill.md`](skills/ghostgeist/skill.md)
- **Full Technical API Specifications:** [`ghostgeist/TECHNICAL_SPEC.md`](ghostgeist/TECHNICAL_SPEC.md)

---

## ⏱️ 60-Second Zero-Config Judge Testing Instructions

Per the **Codegeist 2026 Official Rules (Section 4 — Testing & Functionality)**, GhostGeist is engineered to work **out-of-the-box in any judge's test Jira Cloud environment with zero mandatory credential setup**:

```
┌────────────────────────────────────────────────────────────────────────┐
│                        60-SECOND JUDGE FLOW                            │
│                                                                        │
│  [Install via Link] ──► [Open Jira Project] ──► [GhostGeist Triage]    │
│                                                          │             │
│  ┌───────────────────────────────────────────────────────┘             │
│  ▼                                                                     │
│  [Click "Scan PRs"] ───────────► Discovers untracked PRs instantly     │
│  [Click "View AI Analysis"] ──► Inspects Gemini 3.8 diff reasoning     │
│  [Click "Reconcile to Jira"] ──► Creates ADF issue + remote link       │
└────────────────────────────────────────────────────────────────────────┘
```

### Step 1: Install the App onto Your Test Jira Cloud Instance
1. Click the **Forge Installation Link** provided in our Devpost submission.
2. Select your test Jira Cloud site and approve the requested OAuth scopes.

### Step 2: Open GhostGeist in Any Jira Project
1. Navigate to any Jira Software project (e.g., `https://your-site.atlassian.net/jira/software/projects/TEST/boards`).
2. In the left-hand project sidebar, click **GhostGeist Triage**.

### Step 3: Zero-Config Instant Scan (Public Demo Repository)
1. GhostGeist comes pre-configured to point to our public test repository (`jay-kestrel/ghostgeist`), which contains live untracked pull requests with multi-file diffs.
2. Click **Scan PRs**.
   - *Note: Because the demo repository is public, **no GitHub Personal Access Token is required** to scan and inspect untracked PRs.*

### Step 4: Context-Aware AI Triage & Diff Synthesis
1. Click **View AI Analysis** (or **Triage All with Gemini**) next to PR #1 (`feat: optimize auth session cache and pool lifecycle`).
2. Inspect the synthesized proposal modal:
   - **Standardized Jira Summary & Description**: Generated from actual git patch hunks.
   - **Project-Validated Issue Type**: Automatically classified as `Bug`, `Task`, or `Story` based on your project's active Jira issue type scheme.
   - **Fibonacci Story Point Estimate**: `1`, `2`, `3`, `5`, or `8` with technical architectural rationale.
   - **Duplicate / Conflict Detection**: Scans existing issues in your Jira project to ensure no duplicate work is filed.

### Step 5: 1-Click Bi-Directional Reconciliation
1. Click **Create Jira Issue & Link PR** inside the modal (or **Reconcile to Jira** on the table).
2. GhostGeist executes the reconciliation transaction:
   - Creates a native **Atlassian Document Format (ADF v1)** issue via Jira REST API v3 (`/rest/api/3/issue`).
   - Attaches an official **GitHub Remote Link** (`/rest/api/3/issue/{key}/remotelink`) so engineers can jump directly between Jira and GitHub.
   - Records the reconciliation in **Forge KVS** (`@forge/kvs`) so the PR is permanently recognized as tracked.

### Step 6: *(Optional)* Test with Your Own Private Repository
1. Click the **Settings** gear icon in the top right corner of the GhostGeist command center.
2. Enter your custom **GitHub Repository Owner / Name**, **GitHub PAT**, and **Google Gemini API Key**.
3. Credentials are saved encrypted at rest via Forge KVS (`@forge/kvs`) with zero client-side secret leakage.

---

## 🏆 Evaluating the 3 Bonus Categories

### 1. Best App with Atlassian MCP (`rovo:mcp`)
GhostGeist implements the `rovo:mcp` module in [`ghostgeist/manifest.yml`](ghostgeist/manifest.yml), exposing three production-ready action tools over Atlassian's managed MCP gateway:
- `get-untracked-prs`: Audits repositories and isolates untracked work.
- `triage-pr-gemini`: Synthesizes ticket specs from code diffs using Gemini 3.8 Flash.
- `create-jira-ticket-from-pr`: Creates ADF issues with bi-directional remote links.

**To inspect the MCP definition:**
- View the open-source [`skills/ghostgeist/skill.md`](skills/ghostgeist/skill.md) file, which includes client configuration snippets for **Cursor IDE**, **Claude Desktop**, and **Antigravity**, plus system prompt guardrails.

### 2. Best Agents — Rovo / Assignable Agents (`rovo:agent`)
GhostGeist declares a native `rovo:agent` module (`ghostgeist-auditor`) in [`ghostgeist/manifest.yml`](ghostgeist/manifest.yml).
- Once installed on a site, users can open **Atlassian Rovo Chat** and mention `@GhostGeist Auditor`.
- Conversation starters allow teams to ask:
  - *"Audit open GitHub PRs for shadow work"*
  - *"Triage untracked pull requests with Gemini"*
  - *"Reconcile un-ticketed PRs into Jira issues"*

### 3. Best Marketplace Published App
GhostGeist adheres to all Atlassian Marketplace reliability and security guidelines:
- **100% Serverless Forge**: No external servers, databases, or third-party webhooks required.
- **Zero Client Secret Leakage**: API tokens are encrypted server-side in `@forge/kvs`; frontend bridge only receives boolean status flags (`hasGithubToken: true`).
- **Strict Egress Whitelist**: Network calls are strictly limited to `api.github.com` and `generativelanguage.googleapis.com`.
- **Validation**: Passes `forge lint` with 0 errors and 0 warnings.
- **Comprehensive Test Suite**: 29/29 automated unit tests passing (`npm test`).

---

## 📊 Alignment with Official Judging Criteria (Rubric)

| Criteria | Weight | How GhostGeist Delivers |
| :--- | :---: | :--- |
| **Technological Implementation** | **20%** *(Tie-Breaker #1)* | Combines 4 Forge modules (`jira:projectPage`, `rovo:mcp`, `rovo:agent`, `action`), Jira Cloud REST API v3 (ADF v1 schema builder with zero empty-node bugs, remote links, `api.asUser()` priority), Google Gemini 3.8 Flash with multi-model fallback (`gemini-3.6-flash`), and server-side encrypted `@forge/kvs`. |
| **Design** | **20%** *(Tie-Breaker #2)* | 100% native Atlassian Design System (`@forge/react` UI Kit 2). Seamless Jira Cloud Dark/Light theme support, interactive shadow capacity stat cards, auto-triage badges, and an editable review modal. |
| **Potential Impact** | **20%** *(Tie-Breaker #3)* | Solves the 20–30% "shadow work" problem where hotfixes, security patches, and tech-debt refactors bypass Jira, restoring sprint velocity, burndown accuracy, and SOC-2/R&D tax compliance. |
| **Innovation / Idea** | **20%** *(Tie-Breaker #4)* | Inverts the broken paradigm of existing Jira-GitHub integrations. Rather than demanding engineers switch context to file tickets manually, GhostGeist passively detects untracked code and reconciles it with context-aware AI. |
| **Presentation** | **20%** *(Tie-Breaker #5)* | 1080p master demonstration video ([`ghostgeist_demo_master.mp4`](ghostgeist_demo_master.mp4)), detailed storyboard ([`DEMO_VIDEO_SCRIPT.md`](DEMO_VIDEO_SCRIPT.md)), comprehensive technical spec ([`TECHNICAL_SPEC.md`](ghostgeist/TECHNICAL_SPEC.md)), and 60-second zero-config judge mode. |

---

## 🧪 Local Automated Verification

Judges or reviewers wishing to inspect code quality and run automated tests locally:

```bash
# Clone the repository
git clone https://github.com/jay-kestrel/ghostgeist.git
cd ghostgeist/ghostgeist

# Install dependencies
npm install

# Run the 29-test unit suite (runs in ~136ms)
npm test

# Run Forge manifest and schema validation
forge lint
```
