# Privacy Policy for GhostGeist

**Last Updated:** November 1, 2026  
**Project:** GhostGeist (Atlassian Codegeist 2026 Submission)  
**Repository:** [https://github.com/jay-kestrel/ghostgeist](https://github.com/jay-kestrel/ghostgeist)  
**Developer:** Jay Kestrel (Contact: via GitHub Issues)

---

## 1. Overview & Commitment

GhostGeist ("we", "our", or "the app") is an Engineering Shadow Work Reconciliation Platform built natively on the **Atlassian Forge** serverless cloud platform. GhostGeist connects Jira Cloud and GitHub to help engineering teams discover untracked pull requests and reconcile them into Jira issues.

We are committed to maintaining the highest standards of user privacy, security, and data minimization. **We do not collect, monetize, store, or sell any personal data, source code, or proprietary engineering artifacts.**

---

## 2. Infrastructure & Hosting Architecture

GhostGeist operates 100% within Atlassian's secure cloud infrastructure:
- **Serverless Forge Execution:** All app logic executes entirely inside Atlassian-managed serverless containers (`nodejs24.x`). GhostGeist maintains **zero external servers, databases, or logging infrastructure**.
- **Data Residency:** All application execution and configuration data remain within the Atlassian Cloud boundaries of your Jira instance.

---

## 3. Data Processing & Ephemeral Handling

### A. Source Code & Git Diffs
- **Ephemeral In-Memory Analysis:** When a user triggers repository scanning or AI triage, GhostGeist fetches git diffs, commit messages, and PR metadata via GitHub REST API v3. This information is processed **strictly in-memory** during the execution of the request and is **never written to persistent disk or external databases**.
- **Google Gemini Processing:** Code diffs and PR descriptions are transmitted securely via TLS to Google Cloud's Gemini API (`generativelanguage.googleapis.com`) using structured JSON schema constraints solely to synthesize Jira issue proposals. Google AI terms prohibit training foundation models on enterprise customer API traffic.

### B. Jira Cloud Data
- GhostGeist accesses Jira Cloud project issue type schemes (`/rest/api/3/project/{key}`) and recent project issues (`/rest/api/3/search/jql`) to ground AI classifications and detect duplicate issues.
- When an engineer authorizes ticket creation, GhostGeist creates Jira issues in Atlassian Document Format (ADF) and attaches GitHub remote links using the authenticated user's permissions (`api.asUser()`).

---

## 4. Credentials & Secret Management

- **Zero Client Exposure:** Plaintext credentials (such as GitHub Personal Access Tokens and Google Gemini API keys) are never exposed to the frontend browser client over `@forge/bridge`.
- **Encrypted Storage:** User-provided API keys and configuration settings are stored encrypted at rest using Atlassian Forge Key-Value Storage (`@forge/kvs`).
- **Access Control:** Only authenticated administrators of your Atlassian site have access to configure repository settings.

---

## 5. Network Egress Restrictions

GhostGeist enforces strict outbound network whitelisting declared in `manifest.yml`. The application can only make external network calls to:
1. `api.github.com` (Fetching pull requests, diffs, and updating PR titles/bodies)
2. `generativelanguage.googleapis.com` (Invoking Google Gemini reasoning models)

All other external network egress is prohibited and blocked by the Atlassian Forge platform security policy.

---

## 6. Cookies & Tracking

GhostGeist does **not** use cookies, web beacons, tracking pixels, advertising identifiers, or third-party analytics SDKs (e.g., Google Analytics, Mixpanel, Segment).

---

## 7. Data Retention & Deletion

- Because GhostGeist maintains no external databases, **uninstalling the app from your Atlassian site instantly and permanently purges all configuration settings, cached commit SHAs, and KVS data**.
- Reconciled Jira issues and remote links created by GhostGeist remain standard native Jira Cloud objects under your complete organizational control.

---

## 8. Open Source & Independent Verification

GhostGeist is open-source software distributed under the **MIT License**. The complete source code, manifest permissions, and network endpoints can be independently audited at:  
👉 [https://github.com/jay-kestrel/ghostgeist](https://github.com/jay-kestrel/ghostgeist)

---

## 9. Contact & Support

For privacy inquiries, security questions, or support regarding GhostGeist, please open an issue in the official GitHub repository:  
👉 [https://github.com/jay-kestrel/ghostgeist/issues](https://github.com/jay-kestrel/ghostgeist/issues)
