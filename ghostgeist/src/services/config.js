/**
 * GhostGeist Configuration Service
 * Handles persistence of repository and API credentials using Forge KVS.
 */
import { kvs } from '@forge/kvs';

const CONFIG_KEY = 'ghostgeist:settings';

const DEFAULT_CONFIG = {
  owner: process.env.GITHUB_OWNER || '',
  repo: process.env.GITHUB_REPO || '',
  githubToken: process.env.GITHUB_PAT || '',
  geminiApiKey: process.env.GEMINI_API_KEY || ''
};

// In-memory fallback if KVS is not available in test or local context
let memoryStore = { ...DEFAULT_CONFIG };

export async function getAppConfig() {
  try {
    if (kvs && typeof kvs.get === 'function') {
      const stored = await kvs.get(CONFIG_KEY);
      if (stored && typeof stored === 'object') {
        return {
          owner: stored.owner || DEFAULT_CONFIG.owner,
          repo: stored.repo || DEFAULT_CONFIG.repo,
          githubToken: stored.githubToken || DEFAULT_CONFIG.githubToken,
          geminiApiKey: stored.geminiApiKey || DEFAULT_CONFIG.geminiApiKey
        };
      }
    }
  } catch (err) {
    console.warn('Forge KVS get error, using fallback:', err.message);
  }

  return { ...memoryStore };
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
