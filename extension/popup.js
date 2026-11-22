import { getAdapterForHost } from "../src/core/adapters.js";
import {
  createDefaultSettings,
  exportSettingsJson,
  mergeSettings,
  normalizeDomain,
} from "../src/core/engine.js";
import { resolveLanguage, t } from "../src/core/i18n.js";

let settings = createDefaultSettings();
let activeAdapter = null;
let activeTabId = null;

const el = {
  enabled: document.getElementById("toggle-enabled"),
  paywalls: document.getElementById("toggle-paywalls"),
  clickbait: document.getElementById("toggle-clickbait"),
  seen: document.getElementById("toggle-seen"),
  displayMode: document.getElementById("select-display-mode"),
  siteStatus: document.getElementById("site-status"),
  siteToggleBtn: document.getElementById("toggle-site-btn"),
  mutedBadge: document.getElementById("muted-badge"),
  kwForm: document.getElementById("keyword-form"),
  kwInput: document.getElementById("keyword-input"),
  kwTags: document.getElementById("keyword-tags"),
  domForm: document.getElementById("domain-form"),
  domInput: document.getElementById("domain-input"),
  domTags: document.getElementById("domain-tags"),
  llmToggle: document.getElementById("toggle-llm"),
  llmPrompt: document.getElementById("llm-prompt"),
  btnOptions: document.getElementById("btn-options"),
  btnExport: document.getElementById("btn-export"),
  btnResetMuted: document.getElementById("btn-reset-muted"),
};

function lang() {
  return resolveLanguage(settings.language);
}

async function save() {
  await chrome.storage.local.set({ settings });
}

function renderTags(container, items, onRemove) {
  container.innerHTML = "";
  for (const value of items) {
    const pill = document.createElement("span");
    pill.className = "tag";
    const txt = document.createElement("span");
    txt.textContent = value;
    const del = document.createElement("button");
    del.type = "button";
    del.textContent = "×";
    del.addEventListener("click", () => onRemove(value));
    pill.append(txt, del);
    container.appendChild(pill);
  }
}

function renderI18n() {
  const curLang = lang();
  document.documentElement.lang = curLang;

  document.querySelectorAll("[data-i18n]").forEach((node) => {
    node.textContent = t(curLang, node.dataset.i18n);
  });
  document.querySelectorAll("[data-i18n-placeholder]").forEach((node) => {
    node.placeholder = t(curLang, node.dataset.i18nPlaceholder);
  });
  document.querySelectorAll(".lang-btn").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.lang === curLang);
  });
}

function renderSiteStatus(count = 0) {
  const curLang = lang();
  el.mutedBadge.textContent = t(curLang, "mutedCount", { count });

  if (!activeAdapter) {
    el.siteStatus.textContent = t(curLang, "siteUnsupported");
    el.siteToggleBtn.hidden = true;
    return;
  }

  const paused = settings.disabledSites.includes(activeAdapter.id);
  el.siteStatus.textContent = t(curLang, paused ? "siteStatusOff" : "siteStatusOn", {
    site: activeAdapter.name,
  });
  el.siteToggleBtn.hidden = false;
  el.siteToggleBtn.textContent = paused
    ? curLang === "uk"
      ? "Увімкнути"
      : "Resume"
    : curLang === "uk"
      ? "Пауза"
      : "Pause";
}

function renderAll(tabCount = 0) {
  renderI18n();
  el.enabled.checked = settings.enabled;
  el.paywalls.checked = settings.mutePaywalls;
  el.clickbait.checked = settings.muteClickbaitSlop;
  el.seen.checked = settings.hideSeen;
  el.displayMode.value = settings.displayMode;
  el.llmToggle.checked = Boolean(settings.llm?.enabled);
  el.llmPrompt.value = settings.llm?.rulesPrompt || "";

  renderTags(el.kwTags, settings.keywords, async (kw) => {
    settings.keywords = settings.keywords.filter((x) => x !== kw);
    await save();
    renderAll();
  });

  renderTags(el.domTags, settings.mutedDomains, async (dom) => {
    settings.mutedDomains = settings.mutedDomains.filter((x) => x !== dom);
    await save();
    renderAll();
  });

  renderSiteStatus(tabCount);
}

async function init() {
  const stored = await chrome.storage.local.get(["settings"]);
  settings = mergeSettings(stored.settings || {});

  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  let tabCount = 0;
  if (tab?.url) {
    try {
      activeAdapter = getAdapterForHost(new URL(tab.url).hostname);
      activeTabId = tab.id;
      const res = await chrome.runtime.sendMessage({ type: "GET_TAB_COUNT", tabId: tab.id });
      tabCount = Number(res?.count) || 0;
    } catch {
      // ignore invalid URLs like chrome://
    }
  }

  renderAll(tabCount);

  document.querySelectorAll(".lang-btn").forEach((btn) => {
    btn.addEventListener("click", async () => {
      settings.language = btn.dataset.lang;
      await save();
      renderAll(tabCount);
    });
  });

  el.enabled.addEventListener("change", async () => {
    settings.enabled = el.enabled.checked;
    await save();
  });

  el.paywalls.addEventListener("change", async () => {
    settings.mutePaywalls = el.paywalls.checked;
    await save();
  });

  el.clickbait.addEventListener("change", async () => {
    settings.muteClickbaitSlop = el.clickbait.checked;
    await save();
  });

  el.seen.addEventListener("change", async () => {
    settings.hideSeen = el.seen.checked;
    await save();
  });

  el.displayMode.addEventListener("change", async () => {
    settings.displayMode = el.displayMode.value;
    await save();
  });

  el.siteToggleBtn.addEventListener("click", async () => {
    if (!activeAdapter) return;
    const id = activeAdapter.id;
    if (settings.disabledSites.includes(id)) {
      settings.disabledSites = settings.disabledSites.filter((s) => s !== id);
    } else {
      settings.disabledSites.push(id);
    }
    await save();
    renderSiteStatus(tabCount);
  });

  el.kwForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const val = el.kwInput.value.trim();
    if (!val) return;
    if (!settings.keywords.includes(val)) {
      settings.keywords.push(val);
      await save();
    }
    el.kwInput.value = "";
    renderAll(tabCount);
  });

  el.domForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const val = normalizeDomain(el.domInput.value);
    if (!val) return;
    if (!settings.mutedDomains.includes(val)) {
      settings.mutedDomains.push(val);
      await save();
    }
    el.domInput.value = "";
    renderAll(tabCount);
  });

  let promptDebounce = null;
  el.llmPrompt.addEventListener("input", () => {
    clearTimeout(promptDebounce);
    promptDebounce = setTimeout(async () => {
      settings.llm.rulesPrompt = el.llmPrompt.value;
      await save();
    }, 300);
  });

  el.llmToggle.addEventListener("change", async () => {
    settings.llm.enabled = el.llmToggle.checked;
    await save();
  });

  document.querySelectorAll(".chip[data-preset]").forEach((chip) => {
    chip.addEventListener("click", async () => {
      const curLang = lang();
      const map = {
        ai: t(curLang, "presetAiText"),
        ads: t(curLang, "presetAdsText"),
        politics: t(curLang, "presetPoliticsText"),
      };
      const next = map[chip.dataset.preset] || "";
      if (!next) return;
      el.llmPrompt.value = next;
      settings.llm.rulesPrompt = next;
      settings.llm.enabled = true;
      el.llmToggle.checked = true;
      await save();
    });
  });

  el.btnOptions.addEventListener("click", () => {
    chrome.runtime.openOptionsPage();
  });

  el.btnExport.addEventListener("click", () => {
    const json = exportSettingsJson(settings);
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "feedmute-settings.json";
    a.click();
    URL.revokeObjectURL(url);
  });

  el.btnResetMuted.addEventListener("click", async () => {
    settings.mutedItemIds = [];
    await save();
    el.btnResetMuted.textContent = t(lang(), "resetDone");
    setTimeout(() => {
      el.btnResetMuted.textContent = t(lang(), "resetMuted");
    }, 1500);
  });
}

init();
