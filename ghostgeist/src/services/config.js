/**
 * GhostGeist Configuration Service
 * Handles persistence of repository, API credentials, reconciled PR ledger,
 * commit-SHA triage cache, and demo quota limits using Forge KVS.
 */
import { kvs } from '@forge/kvs';

const CONFIG_KEY = 'ghostgeist:settings';
const RECONCILED_KEY = 'ghostgeist:reconciled';
const TRIAGE_CACHE_KEY = 'ghostgeist:triage_cache';
const DEMO_QUOTA_KEY = 'ghostgeist:demo_triage_count';

const DEFAULT_CONFIG = {
  owner: process.env.GITHUB_OWNER || 'jay-kestrel',
  repo: process.env.GITHUB_REPO || 'ghostgeist',
  githubToken: process.env.GITHUB_PAT || '',
  geminiApiKey: process.env.GEMINI_API_KEY || ''
};

// In-memory fallbacks if KVS is not available in test or local context
let memoryStore = { ...DEFAULT_CONFIG };
let storedInMemory = {};
let reconciledMemoryStore = [];
let triageCacheMemoryStore = {};
let demoQuotaMemoryCount = 0;

function getDefaultGeminiApiKey() {
  return (DEFAULT_CONFIG.geminiApiKey || process.env.GEMINI_API_KEY || '').trim();
}

export async function getAppConfig() {
  const defaultGemini = getDefaultGeminiApiKey();

  try {
    if (kvs && typeof kvs.get === 'function') {
      const stored = await kvs.get(CONFIG_KEY);
      if (stored && typeof stored === 'object') {
        const storedOwner = typeof stored.owner === 'string' ? stored.owner.trim() : '';
        const storedRepo = typeof stored.repo === 'string' ? stored.repo.trim() : '';
        const storedToken = typeof stored.githubToken === 'string' ? stored.githubToken.trim() : '';
        const storedGemini = typeof stored.geminiApiKey === 'string' ? stored.geminiApiKey.trim() : '';

        const hasCustomGemini = Boolean(storedGemini);
        const usingBuiltInGeminiKey = Boolean(!hasCustomGemini && defaultGemini);

        return {
          owner: storedOwner || DEFAULT_CONFIG.owner,
          repo: storedRepo || DEFAULT_CONFIG.repo,
          githubToken: storedToken || DEFAULT_CONFIG.githubToken,
          geminiApiKey: hasCustomGemini ? storedGemini : defaultGemini,
          usingBuiltInGeminiKey
        };
      }
    }
  } catch (err) {
    console.warn('Forge KVS get error, using fallback:', err.message);
  }

  const hasCustomInMemory = Boolean(storedInMemory && typeof storedInMemory.geminiApiKey === 'string' && storedInMemory.geminiApiKey.trim());
  const customGemini = hasCustomInMemory ? storedInMemory.geminiApiKey.trim() : '';
  const activeGemini = customGemini || (typeof memoryStore.geminiApiKey === 'string' && memoryStore.geminiApiKey.trim() !== defaultGemini ? memoryStore.geminiApiKey.trim() : '') || defaultGemini;
  const usingBuiltInGeminiKey = Boolean(!customGemini && defaultGemini);

  return {
    owner: (typeof memoryStore.owner === 'string' && memoryStore.owner.trim()) || DEFAULT_CONFIG.owner,
    repo: (typeof memoryStore.repo === 'string' && memoryStore.repo.trim()) || DEFAULT_CONFIG.repo,
    githubToken: (typeof memoryStore.githubToken === 'string' && memoryStore.githubToken.trim()) || DEFAULT_CONFIG.githubToken,
    geminiApiKey: activeGemini,
    usingBuiltInGeminiKey
  };
}

export async function saveAppConfig({ owner, repo, githubToken, geminiApiKey } = {}) {
  const defaultGemini = getDefaultGeminiApiKey();
  let existingStored = {};
  try {
    if (kvs && typeof kvs.get === 'function') {
      const stored = await kvs.get(CONFIG_KEY);
      if (stored && typeof stored === 'object') {
        existingStored = stored;
      }
    }
  } catch (err) {
    console.warn('Forge KVS get error in saveAppConfig:', err.message);
  }

  const prevCustomToken = (typeof existingStored.githubToken === 'string' && existingStored.githubToken.trim())
    || (typeof storedInMemory.githubToken === 'string' && storedInMemory.githubToken.trim())
    || '';
  const prevCustomGemini = (typeof existingStored.geminiApiKey === 'string' && existingStored.geminiApiKey.trim())
    || (typeof storedInMemory.geminiApiKey === 'string' && storedInMemory.geminiApiKey.trim())
    || '';

  const prevOwner = (typeof existingStored.owner === 'string' && existingStored.owner.trim())
    || (typeof memoryStore.owner === 'string' && memoryStore.owner.trim())
    || DEFAULT_CONFIG.owner;
  const prevRepo = (typeof existingStored.repo === 'string' && existingStored.repo.trim())
    || (typeof memoryStore.repo === 'string' && memoryStore.repo.trim())
    || DEFAULT_CONFIG.repo;

  const nextOwner = typeof owner === 'string' && owner.trim() ? owner.trim() : prevOwner;
  const nextRepo = typeof repo === 'string' && repo.trim() ? repo.trim() : prevRepo;
  const nextToken = typeof githubToken === 'string' && githubToken.trim() ? githubToken.trim() : prevCustomToken;
  const nextGemini = typeof geminiApiKey === 'string' && geminiApiKey.trim() ? geminiApiKey.trim() : prevCustomGemini;

  const toStore = {
    owner: nextOwner,
    repo: nextRepo,
    githubToken: nextToken,
    geminiApiKey: nextGemini
  };

  try {
    if (kvs && typeof kvs.set === 'function') {
      await kvs.set(CONFIG_KEY, toStore);
    }
  } catch (err) {
    console.warn('Forge KVS set error, storing in fallback:', err.message);
  }

  storedInMemory = { ...toStore };
  memoryStore = {
    owner: nextOwner,
    repo: nextRepo,
    githubToken: nextToken || DEFAULT_CONFIG.githubToken,
    geminiApiKey: nextGemini || defaultGemini
  };

  const hasCustomGemini = Boolean(nextGemini);
  const usingBuiltInGeminiKey = Boolean(!hasCustomGemini && defaultGemini);

  return {
    ...toStore,
    geminiApiKey: hasCustomGemini ? nextGemini : defaultGemini,
    usingBuiltInGeminiKey
  };
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

export function buildTriageCacheKey(owner, repo, prNumber, headSha) {
  const o = (owner || '').trim();
  const r = (repo || '').trim();
  const num = Number(prNumber);
  const sha = (headSha || '').trim() || 'latest';
  return `${o}/${r}#${num}@${sha}`;
}

export async function getCachedTriage(owner, repo, prNumber, headSha) {
  const cacheKey = buildTriageCacheKey(owner, repo, prNumber, headSha);
  try {
    if (kvs && typeof kvs.get === 'function') {
      const cache = await kvs.get(TRIAGE_CACHE_KEY);
      if (cache && typeof cache === 'object' && cache[cacheKey]) {
        return cache[cacheKey];
      }
    }
  } catch (err) {
    console.warn('Forge KVS get triage cache error, using fallback:', err.message);
  }
  return triageCacheMemoryStore[cacheKey] || null;
}

export async function setCachedTriage(owner, repo, prNumber, headSha, triageResult) {
  if (!triageResult) return null;
  const cacheKey = buildTriageCacheKey(owner, repo, prNumber, headSha);

  let currentCache = {};
  try {
    if (kvs && typeof kvs.get === 'function') {
      const stored = await kvs.get(TRIAGE_CACHE_KEY);
      if (stored && typeof stored === 'object') {
        currentCache = { ...stored };
      }
    }
  } catch (err) {
    console.warn('Forge KVS get triage cache before set error:', err.message);
  }

  currentCache[cacheKey] = triageResult;
  triageCacheMemoryStore[cacheKey] = triageResult;

  try {
    if (kvs && typeof kvs.set === 'function') {
      await kvs.set(TRIAGE_CACHE_KEY, currentCache);
    }
  } catch (err) {
    console.warn('Forge KVS set triage cache error, storing in fallback:', err.message);
  }

  return triageResult;
}

export async function clearTriageCache() {
  try {
    if (kvs && typeof kvs.delete === 'function') {
      await kvs.delete(TRIAGE_CACHE_KEY);
    } else if (kvs && typeof kvs.set === 'function') {
      await kvs.set(TRIAGE_CACHE_KEY, {});
    }
  } catch (err) {
    console.warn('Forge KVS clear triage cache error, using fallback:', err.message);
  }
  triageCacheMemoryStore = {};
  return { success: true };
}

export async function clearReconciledPRs() {
  try {
    if (kvs && typeof kvs.delete === 'function') {
      await kvs.delete(RECONCILED_KEY);
    } else if (kvs && typeof kvs.set === 'function') {
      await kvs.set(RECONCILED_KEY, []);
    }
  } catch (err) {
    console.warn('Forge KVS clear reconciled PRs error, using fallback:', err.message);
  }
  reconciledMemoryStore = [];
  return { success: true };
}

export async function checkAndIncrementDemoQuota(maxCalls = 50) {
  let currentCount = 0;
  try {
    if (kvs && typeof kvs.get === 'function') {
      const stored = await kvs.get(DEMO_QUOTA_KEY);
      if (typeof stored === 'number') {
        currentCount = stored;
      }
    } else {
      currentCount = demoQuotaMemoryCount;
    }
  } catch (err) {
    console.warn('Forge KVS get demo quota error, using fallback:', err.message);
    currentCount = demoQuotaMemoryCount;
  }

  if (currentCount >= maxCalls) {
    return {
      allowed: false,
      count: currentCount,
      maxCalls
    };
  }

  const newCount = currentCount + 1;
  demoQuotaMemoryCount = newCount;

  try {
    if (kvs && typeof kvs.set === 'function') {
      await kvs.set(DEMO_QUOTA_KEY, newCount);
    }
  } catch (err) {
    console.warn('Forge KVS set demo quota error, storing in fallback:', err.message);
  }

  return {
    allowed: true,
    count: newCount,
    maxCalls
  };
}

export function resetDemoQuotaForTests() {
  demoQuotaMemoryCount = 0;
}

export function resetTriageCacheForTests() {
  triageCacheMemoryStore = {};
}

export function resetMemoryStoreForTesting() {
  memoryStore = { ...DEFAULT_CONFIG };
  storedInMemory = {};
  reconciledMemoryStore = [];
  triageCacheMemoryStore = {};
  demoQuotaMemoryCount = 0;
}

export { DEFAULT_CONFIG };
