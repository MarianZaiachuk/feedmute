import { SITE_LIST } from "../src/core/adapters.js";
import {
  compileRegexRule,
  createDefaultSettings,
  exportSettingsJson,
  importSettingsJson,
  mergeSettings,
  normalizeDomain,
} from "../src/core/engine.js";
import { resolveLanguage, t } from "../src/core/i18n.js";

let settings = createDefaultSettings();

const el = {
  sitesGrid: document.getElementById("sites-grid"),
  kwForm: document.getElementById("kw-form"),
  kwInput: document.getElementById("kw-input"),
  kwTags: document.getElementById("kw-tags"),
  domForm: document.getElementById("dom-form"),
  domInput: document.getElementById("dom-input"),
  domTags: document.getElementById("dom-tags"),
  pwForm: document.getElementById("pw-form"),
  pwInput: document.getElementById("pw-input"),
  pwTags: document.getElementById("pw-tags"),
  rxForm: document.getElementById("rx-form"),
  rxInput: document.getElementById("rx-input"),
  rxTags: document.getElementById("rx-tags"),
  rxTestInput: document.getElementById("rx-test-input"),
  rxTestResult: document.getElementById("rx-test-result"),
  llmEnabled: document.getElementById("llm-enabled"),
  llmProvider: document.getElementById("llm-provider"),
  llmModel: document.getElementById("llm-model"),
  llmBaseUrl: document.getElementById("llm-base-url"),
  baseUrlWrap: document.getElementById("base-url-wrap"),
  llmApiKey: document.getElementById("llm-api-key"),
  llmRules: document.getElementById("llm-rules"),
  btnTestLlm: document.getElementById("btn-test-llm"),
  llmTestStatus: document.getElementById("llm-test-status"),
  btnExport: document.getElementById("btn-export"),
  btnImport: document.getElementById("btn-import"),
  importFile: document.getElementById("import-file"),
  btnClearSeen: document.getElementById("btn-clear-seen"),
  btnClearMuted: document.getElementById("btn-clear-muted"),
  saveToast: document.getElementById("save-toast"),
};

function lang() {
  return resolveLanguage(settings.language);
}

let toastTimer = null;
async function save() {
  await chrome.storage.local.set({ settings });
  clearTimeout(toastTimer);
  el.saveToast.textContent = t(lang(), "saved");
  toastTimer = setTimeout(() => {
    el.saveToast.textContent = "";
  }, 1500);
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

function renderTags(container, list, onRemove) {
  container.innerHTML = "";
  for (const val of list) {
    const tag = document.createElement("span");
    tag.className = "tag";
    const span = document.createElement("span");
    span.textContent = val;
    const btn = document.createElement("button");
    btn.type = "button";
    btn.textContent = "×";
    btn.addEventListener("click", () => onRemove(val));
    tag.append(span, btn);
    container.appendChild(tag);
  }
}

function renderSites() {
  el.sitesGrid.innerHTML = "";
  for (const site of SITE_LIST) {
    const label = document.createElement("label");
    label.className = "site-check";
    const cb = document.createElement("input");
    cb.type = "checkbox";
    cb.checked = !settings.disabledSites.includes(site.id);
    cb.addEventListener("change", async () => {
      if (cb.checked) {
        settings.disabledSites = settings.disabledSites.filter((s) => s !== site.id);
      } else if (!settings.disabledSites.includes(site.id)) {
        settings.disabledSites.push(site.id);
      }
      await save();
    });
    const text = document.createElement("span");
    text.textContent = site.name;
    label.append(cb, text);
    el.sitesGrid.appendChild(label);
  }
}

function updateRegexTest() {
  const sample = el.rxTestInput.value.trim();
  if (!sample) {
    el.rxTestResult.textContent = "";
    return;
  }
  const matched = settings.regexRules.find((raw) => {
    const re = compileRegexRule(raw);
    return re && re.test(sample);
  });
  if (matched) {
    el.rxTestResult.textContent = `Matched: ${matched}`;
    el.rxTestResult.style.color = "#fb923c";
  } else {
    el.rxTestResult.textContent = "No match";
    el.rxTestResult.style.color = "#94a3b8";
  }
}

function renderAll() {
  renderI18n();
  renderSites();

  renderTags(el.kwTags, settings.keywords, async (v) => {
    settings.keywords = settings.keywords.filter((x) => x !== v);
    await save();
    renderAll();
  });

  renderTags(el.domTags, settings.mutedDomains, async (v) => {
    settings.mutedDomains = settings.mutedDomains.filter((x) => x !== v);
    await save();
    renderAll();
  });

  renderTags(el.pwTags, settings.customPaywallDomains, async (v) => {
    settings.customPaywallDomains = settings.customPaywallDomains.filter((x) => x !== v);
    await save();
    renderAll();
  });

  renderTags(el.rxTags, settings.regexRules, async (v) => {
    settings.regexRules = settings.regexRules.filter((x) => x !== v);
    await save();
    renderAll();
  });

  el.llmEnabled.checked = Boolean(settings.llm.enabled);
  el.llmProvider.value = settings.llm.provider;
  el.llmModel.value = settings.llm.model;
  el.llmBaseUrl.value = settings.llm.baseUrl;
  el.llmApiKey.value = settings.llm.apiKey;
  el.llmRules.value = settings.llm.rulesPrompt;
  el.baseUrlWrap.style.display = settings.llm.provider === "gemini" ? "none" : "block";

  updateRegexTest();
}

async function init() {
  const stored = await chrome.storage.local.get(["settings"]);
  settings = mergeSettings(stored.settings || {});
  renderAll();

  document.querySelectorAll(".lang-btn").forEach((btn) => {
    btn.addEventListener("click", async () => {
      settings.language = btn.dataset.lang;
      await save();
      renderAll();
    });
  });

  el.kwForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const val = el.kwInput.value.trim();
    if (val && !settings.keywords.includes(val)) {
      settings.keywords.push(val);
      await save();
    }
    el.kwInput.value = "";
    renderAll();
  });

  el.domForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const val = normalizeDomain(el.domInput.value);
    if (val && !settings.mutedDomains.includes(val)) {
      settings.mutedDomains.push(val);
      await save();
    }
    el.domInput.value = "";
    renderAll();
  });

  el.pwForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const val = normalizeDomain(el.pwInput.value);
    if (val && !settings.customPaywallDomains.includes(val)) {
      settings.customPaywallDomains.push(val);
      await save();
    }
    el.pwInput.value = "";
    renderAll();
  });

  el.rxForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const val = el.rxInput.value.trim();
    if (!val || !compileRegexRule(val)) return;
    if (!settings.regexRules.includes(val)) {
      settings.regexRules.push(val);
      await save();
    }
    el.rxInput.value = "";
    renderAll();
  });

  el.rxTestInput.addEventListener("input", updateRegexTest);

  const syncLlmFields = async () => {
    settings.llm.enabled = el.llmEnabled.checked;
    settings.llm.provider = el.llmProvider.value;
    settings.llm.model = el.llmModel.value.trim() || "local-model";
    settings.llm.baseUrl = el.llmBaseUrl.value.trim() || "http://127.0.0.1:1234/v1";
    settings.llm.apiKey = el.llmApiKey.value.trim();
    settings.llm.rulesPrompt = el.llmRules.value;
    el.baseUrlWrap.style.display = settings.llm.provider === "gemini" ? "none" : "block";
    await save();
  };

  [el.llmEnabled, el.llmProvider].forEach((node) => node.addEventListener("change", syncLlmFields));
  [el.llmModel, el.llmBaseUrl, el.llmApiKey, el.llmRules].forEach((node) =>
    node.addEventListener("change", syncLlmFields)
  );

  el.btnTestLlm.addEventListener("click", async () => {
    await syncLlmFields();
    el.llmTestStatus.textContent = "...";
    const res = await chrome.runtime.sendMessage({
      type: "TEST_LLM",
      llmConfig: settings.llm,
    });
    el.llmTestStatus.textContent = res?.message || "Done";
    el.llmTestStatus.style.color = res?.ok ? "#4ade80" : "#f87171";
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

  el.btnImport.addEventListener("click", () => el.importFile.click());
  el.importFile.addEventListener("change", async () => {
    const file = el.importFile.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      settings = importSettingsJson(text);
      await save();
      renderAll();
    } catch (err) {
      alert(err?.message || "Invalid JSON");
    }
    el.importFile.value = "";
  });

  el.btnClearSeen.addEventListener("click", async () => {
    await chrome.storage.local.set({ seenIds: [] });
    el.saveToast.textContent = t(lang(), "saved");
  });

  el.btnClearMuted.addEventListener("click", async () => {
    settings.mutedItemIds = [];
    await save();
  });
}

init();
