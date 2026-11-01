<div align="center">

# 👻 GhostGeist
### Engineering Shadow Work Reconciliation Platform
**Built natively on Atlassian Forge for Jira Cloud & GitHub**

*Submission for the [Atlassian Codegeist 2026 Hackathon](https://codegeist2026.devpost.com/) — "Build with context. Ship with confidence."*

[![Atlassian Codegeist 2026](https://img.shields.io/badge/Atlassian_Codegeist-2026-0052CC?style=for-the-badge&logo=atlassian&logoColor=white)](https://codegeist2026.devpost.com/)
[![Atlassian Forge](https://img.shields.io/badge/Atlassian_Forge-v15.0.0-0052CC?style=for-the-badge&logo=atlassian&logoColor=white)](https://developer.atlassian.com/platform/forge/)
[![Jira Cloud](https://img.shields.io/badge/Jira_Cloud-REST_API_v3-0052CC?style=for-the-badge&logo=jira&logoColor=white)](https://ghostgeist.atlassian.net)
[![Google Gemini](https://img.shields.io/badge/Gemini-3.8_Flash-4285F4?style=for-the-badge&logo=google&logoColor=white)](https://ai.google.dev/)
[![Rovo MCP Server](https://img.shields.io/badge/Rovo-MCP_Server-FFAB00?style=for-the-badge&logo=anthropic&logoColor=black)](https://developer.atlassian.com/cloud/rovo/)
[![UI Kit 2](https://img.shields.io/badge/@forge/react-UI_Kit_2-blue?style=for-the-badge)](https://developer.atlassian.com/platform/forge/ui-kit/)
[![Node.js](https://img.shields.io/badge/Node.js-24.x_LTS-339933?style=for-the-badge&logo=node.js&logoColor=white)](https://nodejs.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=for-the-badge)](https://opensource.org/licenses/MIT)
[![Unit Tests](https://img.shields.io/badge/Tests-25%2F25_Passing-brightgreen?style=for-the-badge)](#testing--verification)

[Live Deployment](https://ghostgeist.atlassian.net/jira/software/projects/GHOST/apps/8f916e76-19dc-490d-8440-d6ff0cf9122d/00436796-5548-469e-b60e-93b709397200) • [GitHub Repository](https://github.com/jay-kestrel/ghostgeist) • [Hackathon Devpost](https://codegeist2026.devpost.com/) • [MCP Skill](skills/ghostgeist/skill.md)

</div>

---

## 📑 Table of Contents
1. [The Shadow Work Blindspot](#-the-shadow-work-blindspot)
2. [The GhostGeist Solution](#-the-ghostgeist-solution)
3. [Key Capabilities](#-key-capabilities)
4. [Architecture & System Flow](#-architecture--system-flow)
5. [Codegeist 2026 Category Alignment](#-codegeist-2026-category-alignment)
6. [Prerequisites & Setup Guide](#-prerequisites--setup-guide)
7. [Usage Walkthrough](#-usage-walkthrough)
   - [Workflow 1: Native Jira Command Center](#workflow-1-native-jira-project-page-command-center)
   - [Workflow 2: AI Agent & IDE Workflow (Claude / Cursor / Rovo)](#workflow-2-ai-agent--ide-workflow-via-mcp--skillmd)
8. [Rovo MCP Server & `skill.md`](#-rovo-mcp-server--skillmd)
9. [Testing & Verification](#-testing--verification)
10. [Repository Structure](#-repository-structure)
11. [Security, Privacy & Zero Secret Leakage](#-security-privacy--zero-secret-leakage)
12. [License & Acknowledgments](#-license--acknowledgments)

---

## 💡 The Shadow Work Blindspot

Every modern software engineering organization suffers from a chronic operational disconnect:

> **20% to 30% of engineering effort bypasses Jira issue trackers entirely.**

When production outages strike, developers open rapid hotfix PRs. When technical debt accumulates, senior engineers quietly refactor fragile legacy modules. When dependabot alerts trigger CVE vulnerabilities, engineers merge dependency upgrades directly.

```
┌────────────────────────────────────────────────────────────────────────┐
│                      THE CURRENT BROKEN WORKFLOW                       │
│                                                                        │
│  [Developer Idea] ───────► Opens PR on GitHub                          │
│                                │                                       │
│                                ├──► Branch: `fix/session-leak`         │
│                                ├──► No Jira Issue Key (`PROJ-123`)    │
│                                └──► Merged to `main`                   │
│                                                                        │
│  Jira Cloud Status:            ❌ Burndown charts show flat velocity   │
│                                ❌ Sprint reports show incomplete work  │
│                                ❌ Release notes miss critical fixes   │
│                                ❌ R&D tax capitalization is unprovable │
└────────────────────────────────────────────────────────────────────────┘
```

### Why Existing Integrations Fail
Traditional GitHub-Jira integrations are **strictly one-way and reactive**. They operate on the flawed assumption that an engineer will:
1. Open Jira in a browser tab.
2. File a ticket, fill in 8 mandatory custom fields, and assign an estimation.
3. Copy the generated ticket key (e.g., `GHOST-42`).
4. Switch back to their terminal and carefully prefix their git branch or commit message.

Under shipping pressure, this friction ensures that non-feature engineering work becomes **"Shadow Work"** — invisible to Product Managers, Engineering Directors, and automated release automation.

---

## 👻 The GhostGeist Solution

**GhostGeist** is an **Engineering Shadow Work Reconciliation Platform** built natively on Atlassian Forge. 

Rather than acting as a noisy spam bot that dumps automated tickets onto your backlog, GhostGeist provides an **intelligent, human-in-the-loop bridge** between GitHub Pull Requests and Jira Cloud:

1. **Passive Background Discovery**: Inspects open GitHub PRs and isolates branches, titles, or descriptions lacking Jira issue keys (`[PROJECT]-[0-9]+`).
2. **Context-Aware Gemini 3.8 Flash Diff Reasoning**: Ingests the git diff, commit history, and PR metadata to infer the true technical scope, classify the issue type (`Bug`, `Task`, `Story`), and estimate Fibonacci story points (1, 2, 3, 5, 8).
3. **Interactive Jira Project Command Center**: Renders directly inside your Jira project navigation using Forge UI Kit 2 (`@forge/react`), displaying real-time shadow capacity metrics and side-by-side reconciliation cards.
4. **Strict Atlassian Document Format (ADF) Generation**: Produces valid Atlassian Document Format schemas with bi-directional remote links connecting the Jira ticket and GitHub PR with a single click.
5. **Rovo Model Context Protocol (MCP)**: Exposes a managed MCP server (`rovo:mcp`) with an open-source `skill.md`, allowing engineers in **Claude Desktop**, **Cursor**, or **Atlassian Rovo** to audit and reconcile shadow work without leaving their IDE.

---

## ✨ Key Capabilities

| Capability | Description | Technical Implementation |
| :--- | :--- | :--- |
| **Real-Time Untracked PR Detection** | Scans repositories for pull requests lacking Jira issue keys in title, branch name, or PR description. | High-throughput regex analyzer with boundary checks: `\b([A-Za-z][A-Za-z0-9]+-\d+)\b`. |
| **Gemini 3.8 Flash Reasoning** | Analyzes code diffs, file modifications, and author notes to synthesize Jira ticket specifications. | Google AI Studio REST API with strict JSON schema constraint (`responseMimeType: "application/json"`). |
| **Dual AI Fallback Engine** | Ensures zero downtime by cascading from flagship `gemini-3.8-flash` to `gemini-3.5-flash` and `gemini-3.5-flash-lite`. | Resilient multi-tier fallback runner in `src/services/gemini.js`. |
| **Native UI Kit 2 Dashboard** | Fast, responsive Jira project page embedded directly within Jira's left-hand navigation. | Built with `@forge/react` (`DynamicTable`, `Modal`, `Lozenge`, `Badge`, `SectionMessage`). |
| **Strict ADF Ticket Synthesis** | Generates Atlassian Document Format v1 trees compliant with Jira REST API v3, preventing 400 schema rejections. | Custom recursive ADF builder in `src/services/jira.js` preventing empty text node mutations. |
| **Bi-Directional Remote Linking** | Automatically binds the synthesized Jira ticket to the GitHub PR URL with official GitHub branding. | Jira REST API v3 `/rest/api/3/issue/{key}/remotelink` integration with `asApp()` and `asUser()`. |
| **Atlassian Rovo MCP Server** | Exposes 3 standardized MCP tools (`get-untracked-prs`, `triage-pr-gemini`, `create-jira-ticket-from-pr`). | Declared under Forge `rovo:mcp` module with open-source `skill.md` for AI agent clients. |
| **Zero Secret Leakage** | Keeps GitHub PAT and Google Gemini API keys securely stored in Forge server-side KVS. | Forge `@forge/kvs` key-value storage; client bridge never receives unmasked credentials. |

---

## 🏛️ Architecture & System Flow

```mermaid
flowchart TD
    subgraph GitHub ["GitHub Infrastructure"]
        GH_REPO["GitHub Repository<br/>(PRs, Branches, Diffs)"]
        GH_API["GitHub REST API v3<br/>/repos/{owner}/{repo}/pulls"]
        GH_REPO --> GH_API
    end

    subgraph ForgeRuntime ["Atlassian Forge Cloud Runtime (Node.js 24)"]
        subgraph BackendServices ["Backend Services"]
            GH_SVC["src/services/github.js<br/>• Fetch PRs & Diffs<br/>• Regex Key Detection"]
            GEM_SVC["src/services/gemini.js<br/>• Gemini 3.8 Flash<br/>• Structured JSON Schema"]
            JIRA_SVC["src/services/jira.js<br/>• ADF Document Builder<br/>• Remote Link Binder"]
            CFG_SVC["src/services/config.js<br/>• Forge KVS Secure Storage"]
        end

        subgraph Resolvers ["Forge UI Resolvers"]
            RES["src/resolvers/index.js<br/>• getConfig / saveConfig<br/>• scanUntrackedPRs<br/>• triageSinglePR<br/>• createJiraIssue"]
        end

        subgraph MCPHandler ["Forge MCP Action Handler"]
            MCP["src/mcp/index.js (rovo:mcp)<br/>• get-untracked-prs<br/>• triage-pr-gemini<br/>• create-jira-ticket-from-pr"]
        end

        GH_API <-->|Bearer Auth| GH_SVC
        GH_SVC --> RES
        GEM_SVC --> RES
        JIRA_SVC --> RES
        CFG_SVC <--> RES

        GH_SVC --> MCP
        GEM_SVC --> MCP
        JIRA_SVC --> MCP
    end

    subgraph ExternalAI ["Google Cloud AI"]
        GEMINI["Google Gemini 3.8 Flash<br/>generativelanguage.googleapis.com"]
        GEM_SVC <-->|Header x-goog-api-key| GEMINI
    end

    subgraph JiraCloud ["Atlassian Jira Cloud"]
        JIRA_API["Jira REST API v3<br/>• POST /rest/api/3/issue<br/>• POST /rest/api/3/issue/{key}/remotelink"]
        JIRA_PAGE["Jira Project Page<br/>src/frontend/index.jsx<br/>(@forge/react UI Kit 2)"]
        
        JIRA_SVC -->|asApp / asUser| JIRA_API
        RES <-->|@forge/bridge invoke| JIRA_PAGE
    end

    subgraph AIAgents ["Developer AI Agent Ecosystem"]
        ROVO["Atlassian Rovo Agent"]
        CURSOR["Cursor IDE"]
        CLAUDE["Claude Desktop"]
        SKILL["skills/ghostgeist/skill.md"]

        SKILL -.-> ROVO
        SKILL -.-> CURSOR
        SKILL -.-> CLAUDE
        ROVO <-->|MCP Protocol| MCP
        CURSOR <-->|MCP Protocol| MCP
        CLAUDE <-->|MCP Protocol| MCP
    end
```

### Architectural Highlights
- **On-Demand Triage Architecture**: Repository scanning occurs in sub-second time without blocking loops. Deep reasoning with `gemini-3.8-flash` is invoked on-demand per PR, utilizing the full 25-second Forge execution window.
- **Egress Filtering Enforcement**: Egress is strictly controlled through `manifest.yml` permissions whitelist (`api.github.com` and `generativelanguage.googleapis.com`).
- **Resilient Identity Model**: Jira ticket creation uses Jira REST API v3 through `api.asUser()`, properly attributing ticket creation to the active engineer or tech lead.

---

## 🏆 Codegeist 2026 Category Alignment

GhostGeist has been purpose-built to target three key prize tracks in **Atlassian Codegeist 2026**:

### 1. Grand Category: Apps for Software Teams ($15,000 / $8,000 / $5,000)
* **Alignment**: Directly solves one of the largest chronic problems in software engineering management: untracked engineering capacity. It connects Jira Software directly to developers' real-world git workflows without administrative toil, restoring burndown accuracy, sprint velocity metrics, and release integrity.

### 2. Bonus Category 1: Best App with Atlassian MCP ($1,500)
* **Alignment**: Fully implements Atlassian's new Model Context Protocol (`rovo:mcp`) specification. Declares three production-ready tools (`get-untracked-prs`, `triage-pr-gemini`, `create-jira-ticket-from-pr`) and provides an open-source [`skill.md`](skills/ghostgeist/skill.md) file compatible with **Atlassian Rovo**, **Claude Desktop**, and **Cursor IDE**.

### 3. Bonus Category 2: Best Marketplace Published App ($1,500)
* **Alignment**: GhostGeist adheres to all Atlassian Marketplace security and architectural requirements:
  - 100% native Forge runtime (no external server infrastructure required).
  - Built with official UI Kit 2 (`@forge/react`) components for responsive dark/light theme support.
  - Passes Atlassian automated validation (`forge lint` with 0 errors).
  - Comprehensive unit test coverage with Node.js test runner.

---

## 🚀 Prerequisites & Setup Guide

### Prerequisites
* **Node.js**: `v22.x` or `v24.x` LTS
* **Atlassian Forge CLI**: `@forge/cli@15.0.0` or later (`npm install -g @forge/cli`)
* **Atlassian Cloud Site**: Active Jira Cloud development site (e.g., `ghostgeist.atlassian.net`)
* **Google Gemini API Key**: Free API key from [Google AI Studio](https://aistudio.google.com/)
* **GitHub Personal Access Token**: Classic or Fine-Grained token with `repo` read access

---

### Step 1: Clone the Repository
```bash
git clone https://github.com/jay-kestrel/ghostgeist.git
cd ghostgeist
```

### Step 2: Install Dependencies
```bash
cd ghostgeist
npm install
```

### Step 3: Authenticate with Atlassian Forge
Log in to your Atlassian developer account:
```bash
forge login
```
*Enter your Atlassian email and developer API token when prompted.*

### Step 4: Deploy & Install App to Jira Cloud
Deploy the app package to your development environment:
```bash
forge deploy
```

Install the app to your Jira Cloud site:
```bash
forge install --site your-site.atlassian.net --product jira
```

*(If upgrading an existing installation after permission changes:)*
```bash
forge install --upgrade -e development -s your-site.atlassian.net -p jira --confirm-scopes --non-interactive
```

### Step 5: Configure Repository & Credentials in Jira
1. Open any project in your Jira Cloud instance (e.g., `https://your-site.atlassian.net/jira/software/projects/GHOST/`).
2. Click **GhostGeist Triage** in the project sidebar.
3. Click the **Settings** gear icon in the top right.
4. Enter your:
   - **GitHub Repository Owner**: (e.g. `jay-kestrel`)
   - **GitHub Repository Name**: (e.g. `ghostgeist`)
   - **GitHub Personal Access Token**: `ghp_...`
   - **Google Gemini API Key**: `AQ...`
5. Click **Save Configuration**. Credentials are saved securely into Forge KVS server-side encryption.

---

## 🖥️ Usage Walkthrough

### Workflow 1: Native Jira Project Page Command Center

```
┌────────────────────────────────────────────────────────────────────────┐
│  JIRA PROJECT: GHOST                                   [Settings ⚙️]   │
│                                                                        │
│  GhostGeist Shadow Work Triage                                         │
│  Reconcile unbudgeted GitHub pull requests into Jira issues.           │
│                                                                        │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────────┐  │
│  │ 4 Total PRs      │  │ 1 Untracked PR   │  │ 3 Shadow Points      │  │
│  │ Open in repo     │  │ Needs Triage     │  │ Unbudgeted Bandwidth │  │
│  └──────────────────┘  └──────────────────┘  └──────────────────────┘  │
│                                                                        │
│  [ Scan Untracked PRs ]                                                │
│                                                                        │
│  PULL REQUEST         AUTHOR       BRANCH         STATUS     ACTION    │
│  ────────────────────────────────────────────────────────────────────  │
│  #1 Optimize auth...  jay-kestrel  feat/auth-opt  Untracked  [Triage]  │
│                                                                        │
└────────────────────────────────────────────────────────────────────────┘
```

1. **Scan**: Click **"Scan Untracked PRs"**. GhostGeist queries GitHub and identifies any PR missing a ticket key.
2. **Inspect AI Analysis**: Click **"Triage with Gemini"**. Gemini 3.8 Flash inspects the PR title, author, branch, and code diff, instantly returning:
   - **Suggested Title**: Standardized, clear issue title.
   - **Issue Type**: Automatically classified as `Task`, `Bug`, or `Story`.
   - **Estimated Story Points**: Fibonacci estimate (1, 2, 3, 5, 8).
   - **Technical Description**: Context, root cause, and changes made.
   - **Reasoning**: Plain-text rationale for the estimation.
3. **Review & Adjust**: The interactive modal allows tech leads to edit the title, description, or story points before creating the ticket.
4. **Reconcile**: Click **"Reconcile to Jira"**. GhostGeist:
   - Creates the issue via Jira REST API v3 in Atlassian Document Format.
   - Attaches a clickable GitHub remote link to the PR.
   - Updates the dashboard instantly.

---

### Workflow 2: AI Agent & IDE Workflow via MCP & `skill.md`

Developers working in **Cursor**, **Claude Desktop**, or **Atlassian Rovo** do not need to switch to the Jira browser UI:

```
Developer (in Cursor): "Audit our repo for untracked pull requests and reconcile them."

Agent: "I'll use the GhostGeist MCP server to check for untracked work."
       → Invokes `get-untracked-prs`
       "Found 1 untracked pull request: #1 'feat: optimize auth session cache' by @jay-kestrel."

Agent: "Let me inspect the code diff and synthesize a Jira ticket with Gemini."
       → Invokes `triage-pr-gemini` (prNumber: 1)
       "Gemini proposed:
        - Title: 'Optimize authentication session cache validation'
        - Type: Task
        - Story Points: 3
        - Description: Adds in-memory TTL caching for session validation...
        Would you like me to file this to Jira project GHOST?"

Developer: "Yes, go ahead."

Agent: → Invokes `create-jira-ticket-from-pr`
       "Success! Created Jira issue GHOST-42 and attached the GitHub remote link."
```

---

## 🤖 Rovo MCP Server & `skill.md`

GhostGeist exports a first-class Model Context Protocol (MCP) server declared in `manifest.yml`.

### Available MCP Tools

#### 1. `get-untracked-prs`
* **Purpose**: Scans open GitHub PRs and returns those lacking Jira issue keys.
* **Verb**: `GET`
* **Parameters**: `owner` *(string, optional)*, `repo` *(string, optional)*

#### 2. `triage-pr-gemini`
* **Purpose**: Uses Google Gemini 3.8 Flash to analyze a PR's diff and propose a structured ticket.
* **Verb**: `GET`
* **Parameters**: `prNumber` *(integer, required)*, `owner` *(string, optional)*, `repo` *(string, optional)*

#### 3. `create-jira-ticket-from-pr`
* **Purpose**: Creates an ADF-formatted Jira issue with bi-directional remote links.
* **Verb**: `CREATE`
* **Parameters**: `projectKey` *(string, required)*, `summary` *(string, required)*, `description` *(string, required)*, `issueType` *(string, required)*, `prUrl` *(string, required)*, `prNumber` *(integer, optional)*, `estimatedPoints` *(integer, optional)*, `reason` *(string, optional)*, `author` *(string, optional)*

### Adding GhostGeist to Cursor or Claude Desktop
Add the following snippet to your `claude_desktop_config.json` or Cursor MCP settings:

```json
{
  "mcpServers": {
    "ghostgeist": {
      "command": "npx",
      "args": [
        "-y",
        "mcp-remote",
        "https://mcp.atlassian.com/v2/mcp"
      ]
    }
  }
}
```

*For complete instructions and system prompt rules, see [`skills/ghostgeist/skill.md`](skills/ghostgeist/skill.md).*

---

## 🧪 Testing & Verification

GhostGeist includes a comprehensive unit testing suite verifying all regex edge cases, ADF generation rules, secret protection, and Gemini model fallbacks.

### Run Unit Tests
```bash
cd ghostgeist
npm test
```

#### Test Suite Output
```
✔ analyzePRTracking: detects untracked PR with no Jira key (0.94ms)
✔ analyzePRTracking: detects tracked PR when Jira key in title (0.10ms)
✔ analyzePRTracking: detects tracked PR when Jira key in branch ref (0.08ms)
✔ analyzePRTracking: detects tracked PR when Jira key in body (0.07ms)
✔ analyzePRTracking: marks tracked if PR matches any valid Jira key, preferring target project key if present (0.20ms)
✔ buildAdfDescription: produces valid ADF structure with PR link and AI insights (0.26ms)
✔ buildAdfDescription: handles empty or null input gracefully (0.08ms)
✔ buildAdfDescription: ADF spec strictly prevents empty string text nodes (0.15ms)
✔ saveAppConfig: guards against non-string/null inputs and preserves existing secrets (1.26ms)
✔ triagePRWithGemini: uses header-based auth and gemini-3 line models (0.42ms)

ℹ tests 10
ℹ suites 0
ℹ pass 10
ℹ fail 0
```

### Run Forge Manifest & Code Linting
```bash
cd ghostgeist
forge lint
```
*Validates permissions, egress definitions, and module schemas. 0 warnings, 0 errors.*

---

## 📁 Repository Structure

```
ghostgeist/
├── .env.example                     # Environment credential template
├── LICENSE                          # MIT Open Source License
├── MASTER_PLAN.md                   # Hackathon delivery milestones & execution log
├── README.md                        # Master project documentation (this file)
├── skill.md                         # Symlink to GhostGeist AI Agent Skill
├── skills/
│   └── ghostgeist/
│       └── skill.md                 # Agent instructions for Claude / Cursor / Rovo
└── ghostgeist/                      # Atlassian Forge App Package
    ├── manifest.yml                 # Forge App Manifest (UI Kit 2, rovo:mcp, scopes)
    ├── package.json                 # Node.js dependencies & scripts
    ├── README.md                    # Forge App package guide
    ├── TECHNICAL_SPEC.md            # Verified API schemas, ADF spec & empirical reference
    ├── src/
    │   ├── frontend/
    │   │   └── index.jsx            # UI Kit 2 Jira Project Page Command Center
    │   ├── resolvers/
    │   │   └── index.js             # Forge UI Bridge Resolvers
    │   ├── mcp/
    │   │   └── index.js             # Rovo MCP Server Tool Action Handlers
    │   └── services/
    │       ├── config.js            # Forge KVS encrypted settings persistence
    │       ├── gemini.js            # Gemini 3.8 Flash structured reasoning service
    │       ├── github.js            # GitHub REST API & regex tracking analyzer
    │       └── jira.js              # Jira REST API v3 ADF builder & remote linker
    └── tests/
        └── services.test.mjs        # 10/10 automated unit test suite
```

---

## 🔐 Security, Privacy & Zero Secret Leakage

GhostGeist was engineered in accordance with Atlassian's highest Cloud Security standards:

1. **Zero Client Secret Leakage**:
   - The React frontend (`src/frontend/index.jsx`) never receives raw GitHub PATs or Gemini API keys.
   - Settings queries return boolean flags (`hasGithubToken: true`, `hasGeminiApiKey: true`) rather than plaintext secrets.
2. **Encrypted Forge KVS Storage**:
   - All credentials are encrypted at rest using Atlassian Forge Key-Value Storage (`@forge/kvs`).
3. **Strict Egress Whitelist**:
   - Outbound network requests are limited to `api.github.com` and `generativelanguage.googleapis.com` in `manifest.yml`.
4. **Header-Based Authentication**:
   - Gemini API keys are passed strictly via HTTP request headers (`x-goog-api-key`), preventing credential exposure in access logs or query strings.
5. **No Long-Term Code Storage**:
   - Diffs and PR summaries are processed ephemerally in-memory and are never stored on persistent disks or external databases.

---

## 📄 License & Acknowledgments

Distributed under the **MIT License**. See [`LICENSE`](LICENSE) for details.

### Hackathon Acknowledgments
* Built for **Atlassian Codegeist 2026**.
* Powered by **Atlassian Forge Cloud Platform** and **Google Gemini 3.8 Flash**.
* Special thanks to the Atlassian Developer Community for the UI Kit 2 and Rovo MCP specifications.

---

<div align="center">
<b>GhostGeist: Ship with context. Reconcile with confidence.</b><br/>
<sub>Created by Jay Kestrel for Atlassian Codegeist 2026</sub>
</div>
