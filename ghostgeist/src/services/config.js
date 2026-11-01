/**
 * GhostGeist Configuration Service
 * Handles persistence of repository, API credentials, and reconciled PR ledger using Forge KVS.
 */
import { kvs } from '@forge/kvs';

const CONFIG_KEY = 'ghostgeist:settings';
const RECONCILED_KEY = 'ghostgeist:reconciled';

const DEFAULT_CONFIG = {
  owner: process.env.GITHUB_OWNER || 'jay-kestrel',
  repo: process.env.GITHUB_REPO || 'ghostgeist',
  githubToken: process.env.GITHUB_PAT || '',
  geminiApiKey: process.env.GEMINI_API_KEY || ''
};

// In-memory fallback if KVS is not available in test or local context
let memoryStore = { ...DEFAULT_CONFIG };
let reconciledMemoryStore = [];

export async function getAppConfig() {
  try {
    if (kvs && typeof kvs.get === 'function') {
      const stored = await kvs.get(CONFIG_KEY);
      if (stored && typeof stored === 'object') {
        const storedOwner = typeof stored.owner === 'string' ? stored.owner.trim() : '';
        const storedRepo = typeof stored.repo === 'string' ? stored.repo.trim() : '';
        const storedToken = typeof stored.githubToken === 'string' ? stored.githubToken.trim() : '';
        const storedGemini = typeof stored.geminiApiKey === 'string' ? stored.geminiApiKey.trim() : '';

        return {
          owner: storedOwner || DEFAULT_CONFIG.owner,
          repo: storedRepo || DEFAULT_CONFIG.repo,
          githubToken: storedToken || DEFAULT_CONFIG.githubToken,
          geminiApiKey: storedGemini || DEFAULT_CONFIG.geminiApiKey
        };
      }
    }
  } catch (err) {
    console.warn('Forge KVS get error, using fallback:', err.message);
  }

  return {
    owner: (typeof memoryStore.owner === 'string' && memoryStore.owner.trim()) || DEFAULT_CONFIG.owner,
    repo: (typeof memoryStore.repo === 'string' && memoryStore.repo.trim()) || DEFAULT_CONFIG.repo,
    githubToken: (typeof memoryStore.githubToken === 'string' && memoryStore.githubToken.trim()) || DEFAULT_CONFIG.githubToken,
    geminiApiKey: (typeof memoryStore.geminiApiKey === 'string' && memoryStore.geminiApiKey.trim()) || DEFAULT_CONFIG.geminiApiKey
  };
}

export async function saveAppConfig({ owner, repo, githubToken, geminiApiKey } = {}) {
  const current = await getAppConfig();
  const updated = {
    owner: typeof owner === 'string' && owner.trim() ? owner.trim() : current.owner,
    repo: typeof repo === 'string' && repo.trim() ? repo.trim() : current.repo,
    githubToken: typeof githubToken === 'string' && githubToken.trim() ? githubToken.trim() : current.githubToken,
    geminiApiKey: typeof geminiApiKey === 'string' && geminiApiKey.trim() ? geminiApiKey.trim() : current.geminiApiKey
  };

  try {
    if (kvs && typeof kvs.set === 'function') {
      await kvs.set(CONFIG_KEY, updated);
    }
  } catch (err) {
    console.warn('Forge KVS set error, storing in fallback:', err.message);
  }

  memoryStore = { ...updated };
  return updated;
}

export async function getReconciledPRs() {
  try {
    if (kvs && typeof kvs.get === 'function') {
      const stored = await kvs.get(RECONCILED_KEY);
      if (Array.isArray(stored)) {
        return stored;
      }
    }
  } catch (err) {
    console.warn('Forge KVS get reconciled PRs error, using fallback:', err.message);
  }

  return [...reconciledMemoryStore];
}

export async function recordReconciledPR({ owner, repo, prNumber, issueKey, issueUrl } = {}) {
  const currentList = await getReconciledPRs();
  const entry = {
    owner: (owner || '').trim(),
    repo: (repo || '').trim(),
    prNumber: Number(prNumber),
    issueKey: (issueKey || '').trim().toUpperCase(),
    issueUrl: (issueUrl || '').trim(),
    reconciledAt: new Date().toISOString()
  };

  const normOwner = entry.owner.toLowerCase();
  const normRepo = entry.repo.toLowerCase();

  const existingIndex = currentList.findIndex((item) => {
    if (Number(item?.prNumber) !== entry.prNumber) {
      return false;
    }
    const itemOwner = (item?.owner || '').trim().toLowerCase();
    const itemRepo = (item?.repo || '').trim().toLowerCase();

    if (normOwner && normRepo && itemOwner && itemRepo) {
      return itemOwner === normOwner && itemRepo === normRepo;
    }
    return true;
  });

  const updatedList = [...currentList];
  if (existingIndex >= 0) {
    updatedList[existingIndex] = entry;
  } else {
    updatedList.push(entry);
  }

  try {
    if (kvs && typeof kvs.set === 'function') {
      await kvs.set(RECONCILED_KEY, updatedList);
    }
  } catch (err) {
    console.warn('Forge KVS set reconciled PRs error, storing in fallback:', err.message);
  }

  reconciledMemoryStore = [...updatedList];
  return entry;
}

export function resetMemoryStoreForTesting() {
  memoryStore = { ...DEFAULT_CONFIG };
  reconciledMemoryStore = [];
}

export { DEFAULT_CONFIG };

