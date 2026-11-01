# GhostGeist: Grounded Technical Specification & Systems Reference

This document provides exact, verified schemas, API payloads, configurations, and copy-paste ready code implementations for GhostGeist on Atlassian Forge. All endpoints and schemas have been empirically tested and validated.

---

## 1. Atlassian Forge Network Egress & Permissions (`manifest.yml`)

### Outbound Network Calls (Egress)
In Forge, outbound HTTP calls made via `@forge/api`'s `fetch` will fail with network errors unless destination hostnames are declared in `permissions.external.fetch.backend`. Hostnames must NOT include protocols (`https://`) or trailing slashes.

### Jira Scopes
- `read:jira-work`: Search issues, get issue metadata, read project details.
- `write:jira-work`: Create Jira issues, update fields, create remote links (`/remotelink`).
- `read:jira-user`: Query user information for assignees or project leads.
- `storage:app`: Store app configuration (e.g. GitHub repo settings, preferences) in Forge K/V storage.

### Verified `manifest.yml` Example
Combines `jira:projectPage` (UI Kit 2 / `@forge/react`), `rovo:mcp` (MCP Server for Rovo and AI agents), and background functions:

```yaml
modules:
  jira:projectPage:
    - key: ghostgeist-triage-project-page
      resource: main
      resolver:
        function: resolver
      render: native
      title: GhostGeist

  rovo:mcp:
    - key: ghostgeist-mcp
      name: GhostGeist MCP Server
      tools:
        - get-untracked-prs
        - triage-pr-gemini
        - create-jira-ticket-from-pr

  action:
    - key: get-untracked-prs
      name: Get Untracked GitHub PRs
      function: mcpHandler
      actionVerb: GET
      description: Scans open GitHub Pull Requests that have no associated Jira issue key.
      inputs:
        owner:
          title: Owner
          type: string
          required: false
          description: GitHub repository owner (defaults to app config)
        repo:
          title: Repository
          type: string
          required: false
          description: GitHub repository name (defaults to app config)

    - key: triage-pr-gemini
      name: Triage Pull Request with Gemini
      function: mcpHandler
      actionVerb: GET
      description: Uses Google Gemini AI to analyze a PR diff/body and synthesize a structured Jira ticket proposal.
      inputs:
        prNumber:
          title: PR Number
          type: integer
          required: true
          description: GitHub Pull Request number to inspect

    - key: create-jira-ticket-from-pr
      name: Create Jira Issue from PR
      function: mcpHandler
      actionVerb: CREATE
      description: Creates a Jira issue from an untracked PR and links the PR URL as a remote link.
      inputs:
        projectKey:
          title: Jira Project Key
          type: string
          required: true
          description: Target Jira project key (e.g. GHOST)
        summary:
          title: Summary
          type: string
          required: true
          description: Issue title
        description:
          title: Description
          type: string
          required: true
          description: Markdown or text description
        issueType:
          title: Issue Type
          type: string
          required: true
          description: Task, Bug, or Story
        prUrl:
          title: PR Web URL
          type: string
          required: true
          description: GitHub PR URL
        prNumber:
          title: PR Number
          type: integer
          required: false
          description: GitHub PR number

  function:
    - key: resolver
      handler: src/resolvers/index.handler
    - key: mcpHandler
      handler: src/mcp/index.handler

resources:
  - key: main
    path: src/frontend/index.jsx

permissions:
  scopes:
    - read:jira-work
    - write:jira-work
    - read:jira-user
    - storage:app
  external:
    fetch:
      backend:
        - 'api.github.com'
        - 'generativelanguage.googleapis.com'
        - 'api.fish.audio'

app:
  runtime:
    name: nodejs24.x
    memoryMB: 256
    architecture: arm64
  id: ari:cloud:ecosystem::app/8f916e76-19dc-490d-8440-d6ff0cf9122d
```

---

## 2. Jira REST API v3 via `@forge/api`

### Package Import
Install `@forge/api` in `ghostgeist/package.json`:
```bash
npm install @forge/api
```
Import in backend resolvers/functions:
```javascript
import api, { route, fetch } from '@forge/api';
```

### Issue Creation (`POST /rest/api/3/issue`)
In Jira Cloud REST API v3, `description` **must** be formatted in **Atlassian Document Format (ADF)**. Passing a plain string causes a `400 Bad Request`.

#### ADF Helper Utility
```javascript
/**
 * Generates valid Atlassian Document Format (ADF) from text and PR metadata
 */
export function buildAdfDescription(text, prUrl, prNumber, author) {
  const paragraphs = text.split('\n\n').filter(p => p.trim().length > 0);
  
  const content = [];

  // Summary paragraphs
  for (const p of paragraphs) {
    content.push({
      type: 'paragraph',
      content: [
        {
          type: 'text',
          text: p.trim()
        }
      ]
    });
  }

  // PR Context Block / Callout
  if (prUrl) {
    content.push({
      type: 'paragraph',
      content: [
        {
          type: 'text',
          text: 'Source Pull Request: ',
          marks: [{ type: 'strong' }]
        },
        {
          type: 'text',
          text: `#${prNumber || ''} on GitHub`,
          marks: [
            {
              type: 'link',
              attrs: { href: prUrl }
            }
          ]
        },
        {
          type: 'text',
          text: author ? ` (Opened by @${author})` : ''
        }
      ]
    });
  }

  return {
    version: 1,
    type: 'doc',
    content
  };
}
```

#### Issue Creation Code Snippet
```javascript
export async function createJiraIssue({ projectKey, summary, description, issueType = 'Task', prUrl, prNumber, author }) {
  const adfDescription = buildAdfDescription(description, prUrl, prNumber, author);

  const payload = {
    fields: {
      project: {
        key: projectKey
      },
      summary: summary,
      description: adfDescription,
      issuetype: {
        name: issueType
      }
    }
  };

  const response = await api.asUser().requestJira(route`/rest/api/3/issue`, {
    method: 'POST',
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Failed to create Jira issue (${response.status}): ${errorBody}`);
  }

  const issueData = await response.json(); // { id: "10001", key: "GHOST-1", self: "..." }

  // Automatically attach GitHub Remote Link
  if (prUrl) {
    await attachRemoteLink({
      issueKeyOrId: issueData.key,
      url: prUrl,
      title: `GitHub PR #${prNumber || ''}: ${summary}`
    });
  }

  return issueData;
}
```

### Remote Link (`POST /rest/api/3/issue/{issueIdOrKey}/remotelink`)
Attaches a clean external web link to the Jira issue that directly opens the PR in GitHub:
```javascript
export async function attachRemoteLink({ issueKeyOrId, url, title }) {
  const payload = {
    relationship: 'links to',
    object: {
      url: url,
      title: title,
      icon: {
        url16x16: 'https://github.githubassets.com/favicons/favicon.svg',
        title: 'GitHub'
      }
    }
  };

  const response = await api.asUser().requestJira(route`/rest/api/3/issue/${issueKeyOrId}/remotelink`, {
    method: 'POST',
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.warn(`Remote link warning (${response.status}): ${errorText}`);
  }

  return response.ok;
}
```

---

## 3. Forge UI Kit 2 (`@forge/react` v12.4.0-next.3) Components & Patterns

### Important Architectural Rules
1. **No HTML DOM elements**: Do NOT use `<div>`, `<button>`, `<table>`, or `<span>`. UI Kit 2 renders through Atlassian's reconciler. Use `@forge/react` components.
2. **Tables in UI Kit 2**: UI Kit 2 does **not** have `<Table><Head><Row><Cell>`. Instead, it exports **`DynamicTable`** (`import { DynamicTable } from '@forge/react'`).
3. **Data Fetching / Invocation**: Communicate between `@forge/react` and backend resolvers using `invoke` from `@forge/bridge`:
   ```javascript
   import { invoke } from '@forge/bridge';
   const data = await invoke('resolverFunctionKey', { param1: 'val' });
   ```
4. **Project Context**: Access current Jira project using `useProductContext` from `@forge/react`:
   ```javascript
   import { useProductContext } from '@forge/react';
   const context = useProductContext();
   const projectKey = context?.extension?.project?.key; // e.g. "GHOST"
   ```

### Tested Component Inventory
Exported directly by `@forge/react`:
- Layout: `Stack`, `Inline`, `Box`, `Flex`, `Grid`, `Bleed`
- Typography: `Heading` (`as="h1"|"h2"|"h3"|"h4"`), `Text`, `Code`, `CodeBlock`
- Data Display: `DynamicTable`, `Badge`, `Lozenge` (`appearance: "default" | "success" | "inprogress" | "removed" | "new" | "moved"`), `Tag`, `TagGroup`, `User`, `Tooltip`
- Interactive: `Button`, `LoadingButton`, `LinkButton`, `Link`, `Pressable`
- Feedback: `Spinner`, `EmptyState`, `SectionMessage`, `SectionMessageAction`
- Modals: `Modal`, `ModalHeader`, `ModalTitle`, `ModalBody`, `ModalFooter`, `ModalTransition`
- Form Controls: `Form`, `FormHeader`, `FormSection`, `FormFooter`, `Textfield`, `TextArea`, `Select`, `Toggle`, `Checkbox`

### `DynamicTable` Implementation Pattern
```jsx
import React from 'react';
import { DynamicTable, Lozenge, Button, Text, Code, Link } from '@forge/react';

export const UntrackedPRTable = ({ prs, onTriage, isLoading }) => {
  const head = {
    cells: [
      { key: 'pr', content: 'Pull Request', isSortable: true },
      { key: 'author', content: 'Author' },
      { key: 'branch', content: 'Branch' },
      { key: 'status', content: 'Status' },
      { key: 'actions', content: 'Action' }
    ]
  };

  const rows = prs.map((pr) => ({
    key: String(pr.id || pr.number),
    cells: [
      {
        key: 'pr',
        content: (
          <Link href={pr.html_url} openInNewTab>
            {`#${pr.number} ${pr.title}`}
          </Link>
        )
      },
      {
        key: 'author',
        content: <Text>{pr.user?.login || 'unknown'}</Text>
      },
      {
        key: 'branch',
        content: <Code>{pr.head?.ref}</Code>
      },
      {
        key: 'status',
        content: (
          <Lozenge appearance="inprogress">
            Untracked Ghost
          </Lozenge>
        )
      },
      {
        key: 'actions',
        content: (
          <Button
            appearance="primary"
            spacing="compact"
            onClick={() => onTriage(pr)}
          >
            Triage with Gemini
          </Button>
        )
      }
    ]
  }));

  return (
    <DynamicTable
      head={head}
      rows={rows}
      isLoading={isLoading}
      emptyView={<Text>No untracked pull requests found. Everything is tracked!</Text>}
    />
  );
};
```

---

## 4. Google Gemini API Specifications (`generativelanguage.googleapis.com`)

### Empirical Model Validation (2026 Status)
> [!IMPORTANT]
> Live testing with Google AI Studio confirmed:
> - `models/gemini-2.5-flash` is **no longer available for new users** and returns:
>   `HTTP 404: "This model models/gemini-2.5-flash is no longer available to new users. Please update your code to use models/gemini-3.8-flash for the latest features and improvements."`
> - **`models/gemini-3.5-flash-lite`** is active, extremely fast (sub-second response), supports JSON schema structured outputs, and passed all live verification tests.
> - **`models/gemini-3.8-flash`** is the recommended flagship Flash model for deep code analysis.
> - **`models/gemini-flash-latest`** is the alias pointing to the latest stable Flash model.

### Calling Gemini with Structured JSON Outputs
Endpoint:
```http
POST https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:generateContent?key=${GEMINI_API_KEY}
```
Header:
```http
Content-Type: application/json
```

### Verified Request Payload & Schema
Enforces strict JSON schema generation (`responseMimeType: "application/json"`, `responseSchema`):

```json
{
  "contents": [
    {
      "role": "user",
      "parts": [
        {
          "text": "You are GhostGeist, an expert software architect embedded in Jira. Analyze the following untracked GitHub Pull Request and synthesize a clear, actionable Jira issue.\n\nPR Number: #42\nTitle: fix: handle null user profile avatar in navbar\nAuthor: octocat\nBranch: fix/avatar-null-ref -> main\nPR Description:\nWhen a user has not uploaded an avatar, the navbar image component throws an unhandled null exception causing the top bar to crash. This PR adds a fallback SVG placeholder avatar and tests."
        }
      ]
    }
  ],
  "generationConfig": {
    "responseMimeType": "application/json",
    "responseSchema": {
      "type": "OBJECT",
      "properties": {
        "suggestedTitle": {
          "type": "STRING",
          "description": "Concise, standardized Jira issue summary"
        },
        "suggestedDescription": {
          "type": "STRING",
          "description": "Comprehensive issue description including context, root cause, and changes made"
        },
        "issueType": {
          "type": "STRING",
          "enum": ["Task", "Bug", "Story"],
          "description": "Appropriate Jira issue type"
        },
        "estimatedStoryPoints": {
          "type": "INTEGER",
          "description": "Estimated Fibonacci story points (1, 2, 3, 5, 8)"
        },
        "reason": {
          "type": "STRING",
          "description": "Rationale for the chosen issue type and point estimate"
        }
      },
      "required": [
        "suggestedTitle",
        "suggestedDescription",
        "issueType",
        "estimatedStoryPoints",
        "reason"
      ]
    }
  }
}
```

### Verified Live Response Sample
Directly from `gemini-3.5-flash-lite`:
```json
{
  "suggestedTitle": "Fix null pointer exception when user has no avatar",
  "suggestedDescription": "When a user has not set an avatar in settings, the header profile image crashes with an undefined error. We need to add a fallback default avatar SVG to prevent this crash.",
  "issueType": "Bug",
  "estimatedStoryPoints": 2,
  "reason": "This is a bug fix addressing an unhandled null/undefined state causing a crash in the header profile component."
}
```

### Backend Triage Function (`@forge/api` fetch)
```javascript
import { fetch } from '@forge/api';

export async function triagePRWithGemini(pr, apiKey) {
  const model = 'gemini-3.5-flash-lite';
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  const promptText = `You are GhostGeist, an expert engineering lead. Analyze this untracked GitHub Pull Request and produce a production-ready Jira issue specification.

PR #${pr.number}: ${pr.title}
Author: ${pr.user?.login || 'unknown'}
Branch: ${pr.head?.ref} -> ${pr.base?.ref}
Description:
${pr.body || '(No description provided)'}`;

  const payload = {
    contents: [
      {
        role: 'user',
        parts: [{ text: promptText }]
      }
    ],
    generationConfig: {
      responseMimeType: 'application/json',
      responseSchema: {
        type: 'OBJECT',
        properties: {
          suggestedTitle: { type: 'STRING' },
          suggestedDescription: { type: 'STRING' },
          issueType: {
            type: 'STRING',
            enum: ['Task', 'Bug', 'Story']
          },
          estimatedStoryPoints: { type: 'INTEGER' },
          reason: { type: 'STRING' }
        },
        required: [
          'suggestedTitle',
          'suggestedDescription',
          'issueType',
          'estimatedStoryPoints',
          'reason'
        ]
      }
    }
  };

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Gemini API error (${response.status}): ${err}`);
  }

  const result = await response.json();
  const rawJson = result.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!rawJson) {
    throw new Error('Gemini returned an empty response');
  }

  return JSON.parse(rawJson);
}
```

---

## 5. GitHub REST API for Pull Requests & Untracked Detection

### Endpoint & Headers
```http
GET https://api.github.com/repos/{owner}/{repo}/pulls?state=open
Authorization: Bearer <GITHUB_PAT>
Accept: application/vnd.github+json
X-GitHub-Api-Version: 2022-11-28
User-Agent: GhostGeist-Forge-App
```

> [!WARNING]
> GitHub requires a valid `User-Agent` header on every API request. If `User-Agent` is missing, GitHub responds with `403 Forbidden`.

### Fields to Extract
From the PR object array:
- `id`: unique ID
- `number`: PR number (e.g. `12`)
- `title`: PR title string
- `body`: PR description markdown
- `html_url`: browser URL (`https://github.com/owner/repo/pull/12`)
- `user.login`: GitHub handle of author
- `head.ref`: source branch name (e.g. `feature/header-avatar` or `GHOST-101-avatar`)
- `base.ref`: target branch (e.g. `main`)
- `created_at`: creation timestamp

### Untracked "Ghost PR" Detection Logic
A PR is considered **tracked** if it contains an active Jira issue key in any of:
1. The PR Title (e.g., `[GHOST-101] Fix navbar` or `GHOST-101: Fix navbar`)
2. The Branch Name (e.g., `feature/GHOST-101-navbar` or `fix/GHOST-101`)
3. The PR Body (e.g., `Relates to GHOST-101`)

```javascript
/**
 * Detects whether a PR is linked to a Jira issue key.
 * If projectKey is provided, checks specifically for that project's keys.
 * Otherwise checks general Jira key pattern [A-Z][A-Z0-9]+-\d+.
 */
export function analyzePRTracking(pr, targetProjectKey) {
  const genericJiraPattern = /\b([A-Z][A-Z0-9]+-\d+)\b/g;
  const projectSpecificPattern = targetProjectKey
    ? new RegExp(`\\b(${targetProjectKey}-\\d+)\\b`, 'i')
    : genericJiraPattern;

  const titleMatch = pr.title?.match(projectSpecificPattern);
  const branchMatch = pr.head?.ref?.match(projectSpecificPattern);
  const bodyMatch = pr.body?.match(projectSpecificPattern);

  const matchedKey = titleMatch?.[1] || branchMatch?.[1] || bodyMatch?.[1] || null;

  return {
    isUntracked: !matchedKey,
    matchedKey: matchedKey ? matchedKey.toUpperCase() : null
  };
}
```

---

## 6. Rovo MCP Server Tool Action Handlers

In Forge, actions linked under `rovo:mcp` `tools:` are invoked with `(payload, context)`.
Arguments are accessed directly or under `payload.inputs`:

```javascript
// src/mcp/index.js
export async function mcpHandler(payload, context) {
  const inputs = payload.inputs || payload;
  const actionKey = context?.moduleKey || payload.actionKey;

  switch (actionKey) {
    case 'get-untracked-prs': {
      const owner = inputs.owner || process.env.GITHUB_OWNER;
      const repo = inputs.repo || process.env.GITHUB_REPO;
      const prs = await fetchUntrackedPRs(owner, repo);
      return {
        success: true,
        count: prs.length,
        prs: prs.map(p => ({ number: p.number, title: p.title, url: p.html_url }))
      };
    }

    case 'triage-pr-gemini': {
      const prNumber = inputs.prNumber;
      const triage = await triagePRByNumber(prNumber);
      return {
        success: true,
        triage
      };
    }

    case 'create-jira-ticket-from-pr': {
      const result = await createJiraIssue({
        projectKey: inputs.projectKey,
        summary: inputs.summary,
        description: inputs.description,
        issueType: inputs.issueType || 'Task',
        prUrl: inputs.prUrl,
        prNumber: inputs.prNumber
      });
      return {
        success: true,
        issueKey: result.key,
        issueId: result.id
      };
    }

    default:
      throw new Error(`Unknown MCP action: ${actionKey}`);
  }
}
```

---

## 7. Dependency Verification Checklist for Dev Agent

1. **`package.json`**:
   - Ensure `@forge/api` is added: `npm install @forge/api`
   - Keep `@forge/react` (`12.4.0-next.3`), `@forge/bridge` (`7.2.1-next.13`), `@forge/resolver` (`2.0.2-next.0`).
2. **`manifest.yml`**:
   - Check `permissions.external.fetch.backend` contains `api.github.com` and `generativelanguage.googleapis.com`.
   - Check `permissions.scopes` has `read:jira-work` and `write:jira-work`.
3. **Environment & Secrets**:
   - Can be configured via Forge Variables:
     ```bash
     forge variables set GEMINI_API_KEY <key>
     forge variables set GITHUB_PAT <pat>
     ```
   - Or stored securely via `@forge/api` `storage.setSecret()`.
