# GhostGeist — Atlassian Forge App Package

> **Note**: For the full project overview, problem statement, architecture diagrams, and hackathon presentation, please see the [GhostGeist Root README](../README.md).

This directory contains the production Atlassian Forge application package for **GhostGeist**, an Engineering Shadow Work Reconciliation Platform submitted to the **Atlassian Codegeist 2026 Hackathon**.

[![Atlassian Forge](https://img.shields.io/badge/Atlassian_Forge-v15.0.0-0052CC?logo=atlassian&logoColor=white)](https://developer.atlassian.com/platform/forge/)
[![Jira Cloud](https://img.shields.io/badge/Jira_Cloud-REST_v3-0052CC?logo=jira&logoColor=white)](https://ghostgeist.atlassian.net)
[![UI Kit 2](https://img.shields.io/badge/@forge/react-UI_Kit_2-blue)](https://developer.atlassian.com/platform/forge/ui-kit/)
[![Node.js](https://img.shields.io/badge/Node.js-24.x-339933?logo=node.js&logoColor=white)](https://nodejs.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](../LICENSE)

---

## 📦 Package Manifest Overview (`manifest.yml`)

GhostGeist combines a native Jira Software Project Page with an Atlassian Rovo Model Context Protocol (MCP) server:

* **`jira:projectPage`** (`ghostgeist-triage-project-page`):
  * Render Mode: `native`
  * Frontend: `src/frontend/index.jsx` (built with UI Kit 2 `@forge/react`)
  * Resolver: `src/resolvers/index.handler`
  * Navigation: "GhostGeist Triage" in Jira Project sidebar
* **`rovo:mcp`** (`ghostgeist-mcp`):
  * Tools: `get-untracked-prs`, `triage-pr-gemini`, `create-jira-ticket-from-pr`
  * Handler: `src/mcp/index.handler`
* **`rovo:agent`** (`ghostgeist-auditor`):
  * Autonomous in-product shadow work auditor agent for Atlassian Rovo Chat
  * Actions: `get-untracked-prs`, `triage-pr-gemini`, `create-jira-ticket-from-pr`
* **Runtime Specifications**:
  * Engine: `nodejs24.x`
  * Memory: `256MB`
  * Architecture: `arm64`
* **Permissions & Egress**:
  * Scopes: `read:jira-work`, `write:jira-work`, `read:jira-user`, `storage:app`
  * Outbound Egress: `api.github.com`, `generativelanguage.googleapis.com`

---

## 🛠️ Development & Deployment Workflow

### Prerequisites
* Node.js 22.x or 24.x
* Atlassian Forge CLI: `npm install -g @forge/cli`
* Authenticated developer session: `forge login`

### 1. Install Dependencies
```bash
npm install
```

### 2. Validate App Manifest & Code
```bash
# Run Forge CLI manifest and schema linter
forge lint

# Run ESLint
npm run lint
```

### 3. Run Automated Unit Test Suite
```bash
npm test
```
*Executes the 29-test suite covering regex Jira key matching, ADF document tree generation, secret isolation, Gemini 3.8/3.6 fallback logic, `api.asUser()` priority, and session cache eviction.*

### 4. Deploy to Development Environment
```bash
forge deploy
```

### 5. Install or Upgrade Site Installation
```bash
# Initial installation
forge install --site your-site.atlassian.net --product jira

# Upgrade existing installation with scope consent
forge install --upgrade -e development -s your-site.atlassian.net -p jira --confirm-scopes --non-interactive
```

### 6. View Live Runtime Logs
```bash
forge logs -e development
```

### 7. Local Tunneling (Development)
```bash
forge tunnel
```

---

## 📂 Source Directory Layout

```
ghostgeist/
├── manifest.yml           # App manifest declaring Jira page, MCP tools, permissions
├── package.json           # Dependencies: @forge/api, @forge/react, @forge/kvs
├── TECHNICAL_SPEC.md      # Low-level API specs, ADF examples, and empirical logs
├── src/
│   ├── frontend/
│   │   └── index.jsx      # UI Kit 2 Jira Project Page Command Center
│   ├── resolvers/
│   │   └── index.js       # Bridge resolvers (getConfig, saveConfig, scan, triage, create)
│   ├── mcp/
│   │   └── index.js       # Action handlers for rovo:mcp tool invocations
│   └── services/
│       ├── config.js      # Forge KVS settings storage with zero-leakage security
│       ├── gemini.js      # Gemini 3.8 Flash structured JSON schema client
│       ├── github.js      # GitHub REST API v3 and regex issue tracking analyzer
│       └── jira.js        # Jira REST API v3 ADF builder & remote link binder
└── tests/
    └── services.test.mjs  # Unit tests with Node.js built-in test runner
```

---

## 📖 Additional Documentation

* **Master Project Guide**: [Root README.md](../README.md)
* **Master Execution Plan & Milestones**: [MASTER_PLAN.md](../MASTER_PLAN.md)
* **API Payloads & Technical Specifications**: [TECHNICAL_SPEC.md](TECHNICAL_SPEC.md)
* **AI Agent MCP Skill Definition**: [skills/ghostgeist/skill.md](../skills/ghostgeist/skill.md)
