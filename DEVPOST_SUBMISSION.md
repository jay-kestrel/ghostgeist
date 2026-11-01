# GhostGeist — Official Codegeist 2026 Devpost Submission & Judge Evaluation Guide

**Project Name:** GhostGeist  
**Tagline:** Build with context. Reconcile shadow engineering work with confidence.  
**Primary Category:** Apps for Software Teams  
**Bonus Prize Categories:**  
1. **Best App with Atlassian MCP** (`rovo:mcp` server + open-source `skill.md`)  
2. **Best Agents — Rovo / Assignable Agents** (`rovo:agent` module + reusable `action` tools)  
3. **Best Marketplace Published App** (100% Native Forge UI Kit 2, Zero-Egress Leakage, Marketplace Ready)  

**Atlassian Forge App ID:** `ari:cloud:ecosystem::app/8f916e76-19dc-490d-8440-d6ff0cf9122d`  
**Live Demonstration Site:** `https://ghostgeist.atlassian.net`  
**Public Repository:** `https://github.com/jay-kestrel/ghostgeist`  
**Open-Source Agent Skill:** [`skills/ghostgeist/skill.md`](skills/ghostgeist/skill.md)  

---

## ⚡ For Hackathon Judges: 60-Second Zero-Config Testing Instructions

Per the **Codegeist 2026 Official Rules (Section 4 — Testing & Functionality)**, GhostGeist is engineered to work **out-of-the-box in any judge's test Jira Cloud environment with zero mandatory credential setup**:

1. **Install via the Forge Installation Link:**
   - Click the Forge Installation Link provided on our Devpost submission and select your test Jira Cloud site.
2. **Open GhostGeist in Any Jira Project:**
   - Navigate to any Jira Software project on your site and click **GhostGeist Triage** in the left project sidebar.
3. **Zero-Config Instant Scan (Pre-Configured Public Demo Repository):**
   - By default, GhostGeist comes pre-configured to point to our live public test repository (`jay-kestrel/ghostgeist`), which contains active, untracked pull requests with real multi-file diffs.
   - Click **Scan PRs**. Because the demo repository is public, **no GitHub Personal Access Token is required** to scan and inspect untracked PRs.
4. **AI Triage & Jira Context Synthesis:**
   - Click **View AI Analysis** (or **Triage All with Gemini**) to inspect the structured issue proposal:
     - **Suggested Jira Summary & Technical Description** (synthesized from actual git patches).
     - **Project-Aware Classification** (`Bug`, `Task`, or `Story` validated against your Jira project's active issue type scheme).
     - **Fibonacci Story Point Estimate** (`1`, `2`, `3`, `5`, `8`) with architectural rationale.
     - **Semantic Duplicate / Orphan Detection** (cross-references existing issues in your Jira project so you don't file duplicate tickets).
5. **1-Click Reconciliation & Bi-Directional Linking:**
   - Click **Reconcile to Jira** (or **Create Jira Issue & Link PR** inside the modal).
   - GhostGeist creates a native **Atlassian Document Format (ADF)** issue via Jira REST API v3 (`/rest/api/3/issue`), attaches a clickable **GitHub Remote Link** (`/rest/api/3/issue/{key}/remotelink`), updates the GitHub PR when write credentials are present, and records the reconciliation in **Forge KVS** (`@forge/kvs`) so the PR never resurfaces as untracked on reload.
6. *(Optional)* **Test with Your Own Repository or Keys:**
   - Click **Settings** in the top-right corner of the GhostGeist page to point GhostGeist at any custom GitHub repository (`owner` / `repo`) or supply your own GitHub PAT / Google Gemini API key.

---

## 📊 Alignment with Codegeist 2026 Judging Criteria (Stage 1 & Stage 2 Rubric)

Below is the direct mapping of GhostGeist's architecture and capabilities to the five equally weighted Codegeist 2026 judging criteria (listed in official tie-breaking order):

### 1. Technological Implementation (20% — Tie-Breaker #1)
* **Criterion:** *How thoroughly and skillfully does the project use Atlassian’s Forge platform and at least one Atlassian product or platform capability (Jira, Confluence, Jira Service Management, Bitbucket, Teamwork Graph, Rovo)? Does the project reflect genuine effort and a working, non-trivial implementation?*
* **How GhostGeist Delivers:**
  - **Multi-Module Native Forge Architecture (`ghostgeist/manifest.yml`):** Combines four distinct Forge platform capabilities in a single unified app on the `nodejs24.x` (`arm64`) runtime:
    1. `jira:projectPage` (`ghostgeist-triage-project-page`) rendered natively via **Forge UI Kit 2 (`@forge/react`)**.
    2. `rovo:mcp` (`ghostgeist-mcp`) exposing a remote Model Context Protocol server over Atlassian's managed MCP gateway.
    3. `rovo:agent` (`ghostgeist-auditor-agent`) providing an autonomous in-product **Atlassian Rovo** shadow-work auditor agent.
    4. `action` modules (`get-untracked-prs`, `triage-pr-gemini`, `create-jira-ticket-from-pr`) shared across Rovo Agents and external MCP clients.
  - **Deep Jira Cloud REST API v3 Integration (`ghostgeist/src/services/jira.js`):**
    - Fetches live project context (`GET /rest/api/3/project/{projectKey}` and `GET /rest/api/3/search/jql`) to ground AI reasoning in the team's real Jira issue types and active backlog.
    - Constructs strict **Atlassian Document Format (ADF v1)** syntax trees (`POST /rest/api/3/issue`) with recursive empty-node sanitization to guarantee zero `400 Bad Request` schema rejections.
    - Binds clickable GitHub PR references directly onto Jira issues (`POST /rest/api/3/issue/{issueIdOrKey}/remotelink`).
    - Prioritizes user-delegated authorization (`api.asUser().requestJira(...)`) to enforce Jira project permissions and preserve accurate Reporter attribution, with resilient fallback to `api.asApp()`.
  - **Encrypted Server-Side State (`@forge/kvs` in `ghostgeist/src/services/config.js`):** Stores repository settings, encrypted API credentials, and the persistent reconciliation ledger in Forge Key-Value Storage—ensuring raw secrets never cross the `@forge/bridge` client boundary.

### 2. Design (20% — Tie-Breaker #2)
* **Criterion:** *Does the project deliver a complete, coherent product experience — not just a technical proof of concept?*
* **How GhostGeist Delivers:**
  - **100% Native Atlassian Design System (`ghostgeist/src/frontend/index.jsx`):** Built exclusively with official `@forge/react` UI Kit 2 components (`DynamicTable`, `Modal`, `ModalTransition`, `Lozenge`, `Badge`, `SectionMessage`, `EmptyState`, `LoadingButton`, `Stack`, `Inline`). Automatically adapts to Jira Cloud Light and Dark themes with zero layout shift.
  - **Human-in-the-Loop Triage Workflow:** Rather than acting as a noisy bot that spams a backlog with unreviewed AI tickets, GhostGeist provides:
    - Real-time **Shadow Capacity Stat Cards** (*Untracked Shadow PRs*, *Estimated Shadow Points*, *Target Jira Project*).
    - Concurrent **Auto-Triage & Batch Triage** that populates `Bug` / `Task` / `Story` lozenges and Fibonacci point badges (`1`–`8 pts`) right in the table.
    - An interactive **AI Inspection & Override Modal** where tech leads can review Gemini's architectural rationale, see alerts if an existing Jira issue already matches the PR, edit any field, and reconcile with one click.

### 3. Potential Impact (20% — Tie-Breaker #3)
* **Criterion:** *Does the project make a credible, specific case for solving a real problem for a real audience — and does the solution actually address that problem based on what's demonstrated?*
* **How GhostGeist Delivers:**
  - **The Real-World Problem:** In software engineering organizations, **20% to 30% of engineering capacity is spent on "shadow work"**—urgent production hotfixes, security CVE patches, and tech-debt refactors opened directly as GitHub Pull Requests without creating a Jira ticket first.
  - **Measurable Organizational Impact:**
    - **For Engineering Managers & Scrum Masters:** Restores sprint velocity and burndown accuracy by capturing unbudgeted engineering points before sprint close.
    - **For Product Managers:** Ensures release notes and customer changelogs never omit critical hotfixes that bypassed ticket creation.
    - **For Finance & Leadership:** Captures verifiable engineering audit trails required for R&D software capitalization and compliance (SOC2 / ISO-27001 change management linking every merged PR to an approved Jira work item).

### 4. Innovation / Idea (20% — Tie-Breaker #4)
* **Criterion:** *How creative and novel is the concept and does the project differ from existing concepts?*
* **How GhostGeist Delivers:**
  - **Reversing the Broken Direction of Jira-GitHub Integrations:** Every existing Jira-GitHub integration is **reactive and one-way**—it assumes the developer stopped coding, opened Jira, created an issue, copied `PROJ-123`, and manually typed it into their branch name. When developers skip that step under pressure, existing integrations are completely blind.
  - **Proactive Context-Grounded Reconciliation:** GhostGeist flips the paradigm. It discovers untracked code changes passively, combines **GitHub diff context** (actual file patches) with **Atlassian Jira context** (the project's valid issue types and existing open backlog), and synthesizes reconciled work items either inside Jira or directly inside the developer's IDE via **Atlassian Rovo MCP**.

### 5. Presentation (20% — Tie-Breaker #5)
* **Criterion:** *Does the video clearly demonstrate the project working end-to-end? Does the pitch communicate what problem is solved, who it's for, and why it matters? Is the overall presentation easy to follow?*
* **How GhostGeist Delivers:**
  - **Complete End-to-End Live Verification:** Demonstrated live on `ghostgeist.atlassian.net` against real GitHub pull requests on `github.com/jay-kestrel/ghostgeist`.
  - **Comprehensive Documentation & Verification Suite:** Includes architecture flowcharts, API schema documentation (`ghostgeist/TECHNICAL_SPEC.md`), an open-source agent skill (`skills/ghostgeist/skill.md`), and an automated unit test suite (`ghostgeist/tests/services.test.mjs`) with `0` lint warnings (`forge lint` & `eslint`).

---

## 📝 Devpost Form Copy (Ready to Paste)

### Elevator Pitch
GhostGeist eliminates the "Shadow Work Blindspot" by detecting untracked GitHub PRs, analyzing code diffs alongside live Jira project context with Gemini AI, and reconciling unbudgeted engineering work into ADF-formatted, bi-directionally linked Jira issues—via a native Jira UI Kit 2 Command Center, Rovo Agent, or IDE MCP Server.

### Inspiration
Every engineering team knows the rule: *"No PR without a Jira ticket."* Yet in every engineering organization we've worked in, **20% to 30% of real engineering effort bypasses Jira entirely**. When a production service crashes at 2 AM, when a senior engineer refactors a brittle auth module, or when a security patch needs to ship immediately, developers open a GitHub PR first and tell themselves they'll file the ticket later. They rarely do.

Existing Jira-GitHub integrations only work *if* a human manually puts `PROJ-123` in the branch or PR title. We built **GhostGeist** to answer a simple question: *What if Jira could proactively discover untracked engineering work on GitHub, understand the code diff in the context of your existing Jira backlog, and let you reconcile it with a single click—without ever spamming your board?*

### What It Does
**GhostGeist** is an **Engineering Shadow Work Reconciliation Platform** built natively on Atlassian Forge:
1. **Passive Untracked PR Discovery:** Scans open GitHub Pull Requests and uses boundary-checked regex analysis alongside a Forge KVS reconciliation ledger to isolate PRs missing Jira issue keys.
2. **Context-Aware AI Triage (GitHub Diffs + Jira Project Context):** Combines the PR's file patches from GitHub with live project metadata and recent issues from Jira REST API v3, using **Google Gemini 3.8 Flash** (with structured JSON schema enforcement and multi-model fallback) to synthesize:
   - Standardized Jira summary and technical description
   - Project-validated Issue Type (`Bug`, `Task`, `Story`)
   - Fibonacci Story Point estimate (`1`, `2`, `3`, `5`, `8`) with architectural rationale
   - Semantic duplicate detection (alerting the user if an existing open Jira issue already covers the PR)
3. **Interactive Jira Command Center (`@forge/react` UI Kit 2):** Embeds a native project page in Jira with shadow capacity stat cards, auto-triage badges, and an editable review modal.
4. **1-Click Bi-Directional Reconciliation:** Creates a strict Atlassian Document Format (ADF) Jira issue, attaches an official GitHub remote link to the Jira ticket, updates the GitHub PR with the new Jira key, and records the link in Forge KVS.
5. **Omnichannel Agent Execution (`rovo:mcp` + `rovo:agent` + `skill.md`):** Exposes three Forge action tools (`get-untracked-prs`, `triage-pr-gemini`, `create-jira-ticket-from-pr`) to both **Atlassian Rovo Chat** and external IDE agents (**Cursor**, **Claude Desktop**, **Antigravity**).

### How Project Meets the Main Technology Requirement
GhostGeist is built 100% natively on **Atlassian Forge** (`nodejs24.x` runtime) and integrates deeply with **Jira Cloud** and **Atlassian Rovo**:
- **`jira:projectPage` Module:** Renders a native UI Kit 2 (`@forge/react`) command center inside Jira Software projects.
- **Jira Cloud REST API v3 via `@forge/api`:** Uses `api.asUser().requestJira(...)` and `api.asApp().requestJira(...)` to query project issue-type schemes (`/rest/api/3/project/{key}`), search existing project issues (`/rest/api/3/search/jql`), create ADF-formatted issues (`/rest/api/3/issue`), and bind remote GitHub links (`/rest/api/3/issue/{key}/remotelink`).
- **Forge Key-Value Storage (`@forge/kvs`):** Persists encrypted API credentials and the reconciliation ledger server-side with zero secret exposure over `@forge/bridge`.
- **Atlassian Rovo (`rovo:mcp`, `rovo:agent`, and `action` Modules):** Exposes GhostGeist's capabilities both as an in-product Rovo Agent and as an external Model Context Protocol (MCP) server.

### Bonus Prize Write-Ups

#### 1. Best App with Atlassian MCP
GhostGeist implements the `rovo:mcp` module (`ghostgeist-mcp`) in `ghostgeist/manifest.yml`, exposing three structured action tools over Atlassian's managed MCP server:
- `get-untracked-prs`: Audits open GitHub PRs and filters out tracked/reconciled work.
- `triage-pr-gemini`: Inspects code diffs alongside Jira project context to return a structured JSON ticket proposal.
- `create-jira-ticket-from-pr`: Creates the ADF Jira issue, attaches the GitHub remote link, and records the reconciliation.
We also authored a comprehensive open-source [`skills/ghostgeist/skill.md`](skills/ghostgeist/skill.md) file containing tool schemas, client configurations for Claude Desktop and Cursor (`mcp-remote`), sequence diagrams, and human-in-the-loop system prompt guardrails so any developer can reconcile shadow work directly from their IDE.

#### 2. Best Agents — Rovo / Assignable Agents
GhostGeist declares a native `rovo:agent` module (`ghostgeist-auditor-agent`) paired with three reusable `action` modules in `ghostgeist/manifest.yml`. Once installed on a site, teams can immediately invoke the **GhostGeist Shadow Work Auditor** inside Rovo Chat to audit repositories, estimate unbudgeted engineering story points, and convert untracked PRs into linked Jira tickets conversationally.

#### 3. Best Marketplace Published App
GhostGeist was engineered from day one to meet Atlassian Marketplace security, reliability, and UX standards:
- **Zero External Backend Infrastructure:** Runs entirely inside Atlassian's serverless Forge runtime.
- **Zero Client Secret Leakage:** API tokens are stored server-side in `@forge/kvs` and masked as boolean flags on the frontend bridge.
- **Strict Egress Whitelisting:** Outbound fetch calls are restricted solely to `api.github.com` and `generativelanguage.googleapis.com`.
- **100% UI Kit 2 Compliance:** Uses native `@forge/react` primitives with zero custom HTML/CSS injection and passes `forge lint` with 0 errors and 0 warnings.
