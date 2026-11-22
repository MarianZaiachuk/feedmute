import { createDefaultSettings, mergeSettings } from "../src/core/engine.js";
import { classifyItemsWithLlm, computeRulesHash, testLlmConnection } from "../src/core/llm.js";

const MAX_CACHE_ENTRIES = 600;
const tabMutedCounts = new Map();

chrome.runtime.onInstalled.addListener(async () => {
  const existing = await chrome.storage.local.get(["settings"]);
  if (!existing.settings) {
    await chrome.storage.local.set({ settings: createDefaultSettings(), seenIds: [], llmCache: {} });
  }
});

chrome.tabs.onRemoved.addListener((tabId) => {
  tabMutedCounts.delete(tabId);
});

async function updateTabBadge(tabId, count) {
  if (typeof tabId !== "number" || tabId < 0) return;
  tabMutedCounts.set(tabId, count);
  const text = count > 0 ? String(count > 99 ? "99+" : count) : "";
  await chrome.action.setBadgeText({ tabId, text });
  if (count > 0) {
    await chrome.action.setBadgeBackgroundColor({ tabId, color: "#ea580c" });
  }
}

async function handleClassifyBatch(items, settingsOverride) {
  const stored = await chrome.storage.local.get(["settings", "llmCache"]);
  const settings = mergeSettings(settingsOverride || stored.settings || {});
  const rulesPrompt = settings.llm?.rulesPrompt?.trim() || "";
  if (!settings.llm?.enabled || !rulesPrompt) {
    return { verdicts: {}, error: null };
  }

  const rulesHash = computeRulesHash(rulesPrompt);
  const cache = stored.llmCache && typeof stored.llmCache === "object" ? { ...stored.llmCache } : {};
  const verdicts = {};
  const uncached = [];

  for (const item of items || []) {
    const cacheKey = `${rulesHash}:${item.id}`;
    if (cache[cacheKey]) {
      verdicts[item.id] = cache[cacheKey];
    } else {
      uncached.push(item);
    }
  }

  if (uncached.length === 0) {
    return { verdicts, error: null };
  }

  let lastError = null;
  for (let i = 0; i < uncached.length; i += 15) {
    const slice = uncached.slice(i, i + 15);
    const res = await classifyItemsWithLlm(slice, settings.llm);
    if (res.error) {
      lastError = res.error;
    }
    for (const [id, verdict] of Object.entries(res.verdicts || {})) {
      verdicts[id] = verdict;
      cache[`${rulesHash}:${id}`] = verdict;
    }
  }

  // Keep cache bounded
  const keys = Object.keys(cache);
  if (keys.length > MAX_CACHE_ENTRIES) {
    for (const k of keys.slice(0, keys.length - MAX_CACHE_ENTRIES)) {
      delete cache[k];
    }
  }
  await chrome.storage.local.set({ llmCache: cache });
  return { verdicts, error: lastError };
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (!message || !message.type) return false;

  if (message.type === "UPDATE_BADGE") {
    const tabId = sender?.tab?.id;
    updateTabBadge(tabId, Number(message.count) || 0).then(() => sendResponse({ ok: true }));
    return true;
  }

  if (message.type === "GET_TAB_COUNT") {
    const count = tabMutedCounts.get(message.tabId) || 0;
    sendResponse({ count });
    return false;
  }

  if (message.type === "CLASSIFY_BATCH") {
    handleClassifyBatch(message.items, message.settings)
      .then((res) => sendResponse(res))
      .catch((err) => sendResponse({ verdicts: {}, error: err?.message || "Classification failed" }));
    return true;
  }

  if (message.type === "TEST_LLM") {
    testLlmConnection(message.llmConfig)
      .then((res) => sendResponse(res))
      .catch((err) => sendResponse({ ok: false, message: err?.message || "Connection failed" }));
    return true;
  }

  return false;
});
