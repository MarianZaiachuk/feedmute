import {
  compileRegexRule,
  createDefaultSettings,
  evaluateItem,
  exportSettingsJson,
  importSettingsJson,
  mergeSettings,
  normalizeDomain,
} from "../src/core/engine.js";
import { evaluateNaturalRulesFallback } from "../src/core/heuristics.js";
import { formatMuteReason, resolveLanguage, t } from "../src/core/i18n.js";
import { classifyItemsWithLlm, testLlmConnection } from "../src/core/llm.js";
import { SAMPLE_FEED } from "./sampleFeed.js";

const STORAGE_KEY = "feedmute:demo:state:v1";

function createDemoDefaults() {
  const base = createDefaultSettings();
  base.keywords = ["blockchain"];
  base.llm.rulesPrompt = "";
  return base;
}

function loadDemoState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        settings: mergeSettings(parsed.settings || {}),
        seenIds: new Set(Array.isArray(parsed.seenIds) ? parsed.seenIds : []),
        siteFilter: parsed.siteFilter || "all",
        useRealLlm: Boolean(parsed.useRealLlm),
      };
    }
  } catch {
    // fallback to defaults
  }
  return {
    settings: createDemoDefaults(),
    seenIds: new Set(),
    siteFilter: "all",
    useRealLlm: false,
  };
}

let state = loadDemoState();
const temporarilyRevealed = new Set();
let realLlmVerdicts = {};

function saveState() {
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({
      settings: state.settings,
      seenIds: Array.from(state.seenIds),
      siteFilter: state.siteFilter,
      useRealLlm: state.useRealLlm,
    })
  );
}

const el = {
  title: document.getElementById("demo-title"),
  subtitle: document.getElementById("demo-subtitle"),
  btnReset: document.getElementById("btn-reset"),
  statVisible: document.getElementById("stat-visible"),
  statMuted: document.getElementById("stat-muted"),
  statTotal: document.getElementById("stat-total"),
  paywalls: document.getElementById("toggle-paywalls"),
  clickbait: document.getElementById("toggle-clickbait"),
  seen: document.getElementById("toggle-seen"),
  btnMarkSeen: document.getElementById("btn-mark-seen"),
  displayMode: document.getElementById("select-display-mode"),
  kwForm: document.getElementById("kw-form"),
  kwInput: document.getElementById("kw-input"),
  kwTags: document.getElementById("kw-tags"),
  domForm: document.getElementById("dom-form"),
  domInput: document.getElementById("dom-input"),
  domTags: document.getElementById("dom-tags"),
  rxForm: document.getElementById("rx-form"),
  rxInput: document.getElementById("rx-input"),
  rxTags: document.getElementById("rx-tags"),
  llmToggle: document.getElementById("toggle-llm"),
  llmPrompt: document.getElementById("llm-prompt"),
  toggleRealLlm: document.getElementById("toggle-real-llm"),
  realLlmFields: document.getElementById("real-llm-fields"),
  llmBaseUrl: document.getElementById("llm-base-url"),
  llmModel: document.getElementById("llm-model"),
  llmApiKey: document.getElementById("llm-api-key"),
  btnRunRealLlm: document.getElementById("btn-run-real-llm"),
  realLlmStatus: document.getElementById("real-llm-status"),
  btnExport: document.getElementById("btn-export"),
  btnImport: document.getElementById("btn-import"),
  importFile: document.getElementById("import-file"),
  siteTabs: document.getElementById("site-tabs"),
  feedList: document.getElementById("feed-list"),
};

function lang() {
  return resolveLanguage(state.settings.language);
}

function renderI18n() {
  const curLang = lang();
  document.documentElement.lang = curLang;
  el.title.textContent = t(curLang, "demoTitle");
  el.subtitle.textContent = t(curLang, "demoSubtitle");

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

function renderTags(container, items, onRemove) {
  container.innerHTML = "";
  for (const val of items) {
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

function computeDemoLlmVerdicts(items) {
  if (!state.settings.llm.enabled || !state.settings.llm.rulesPrompt.trim()) {
    return {};
  }
  if (state.useRealLlm) {
    return realLlmVerdicts;
  }
  const curLang = lang();
  const out = {};
  for (const item of items) {
    const res = evaluateNaturalRulesFallback(item, state.settings.llm.rulesPrompt, curLang);
    if (res) {
      out[item.id] = res;
    }
  }
  return out;
}

function filteredFeedItems() {
  const uaSites = new Set(["dou", "pravda", "suspilne", "tsn"]);
  if (state.siteFilter === "all") return SAMPLE_FEED;
  if (state.siteFilter === "ua") return SAMPLE_FEED.filter((i) => uaSites.has(i.siteId));
  return SAMPLE_FEED.filter((i) => i.siteId === state.siteFilter);
}

function closeMenus(except = null) {
  document.querySelectorAll(".mute-menu.open").forEach((m) => {
    if (m !== except) m.classList.remove("open");
  });
}

document.addEventListener("click", (e) => {
  if (!e.target.closest(".mute-wrap")) {
    closeMenus();
  }
});

function renderFeed() {
  const curLang = lang();
  const items = filteredFeedItems();
  const llmVerdicts = computeDemoLlmVerdicts(items);

  el.feedList.innerHTML = "";
  let visibleCount = 0;
  let mutedCount = 0;

  for (const item of items) {
    const isRevealed = temporarilyRevealed.has(item.id);
    const evalResult = isRevealed
      ? { muted: false, ruleType: null, reason: null }
      : evaluateItem(item, state.settings, { seenIds: state.seenIds, llmVerdicts });

    if (evalResult.muted) {
      mutedCount += 1;
      if (state.settings.displayMode === "hide") {
        continue;
      }

      const bar = document.createElement("div");
      bar.className = "collapsed-bar";
      const reasonSpan = document.createElement("span");
      reasonSpan.textContent = `${formatMuteReason(curLang, evalResult)} · ${item.title}`;
      const showBtn = document.createElement("button");
      showBtn.type = "button";
      showBtn.textContent = t(curLang, "showPost");
      showBtn.addEventListener("click", () => {
        temporarilyRevealed.add(item.id);
        renderFeed();
      });
      bar.append(reasonSpan, showBtn);
      el.feedList.appendChild(bar);
      continue;
    }

    visibleCount += 1;
    const card = document.createElement("article");
    card.className = "feed-card";

    const head = document.createElement("div");
    head.className = "feed-card-head";

    const badges = document.createElement("div");
    badges.className = "badges";
    const siteBadge = document.createElement("span");
    siteBadge.className = "site-badge";
    siteBadge.textContent = item.siteLabel;
    const domainBadge = document.createElement("span");
    domainBadge.className = "domain-badge";
    domainBadge.textContent = item.domain;
    badges.append(siteBadge, domainBadge);

    const muteWrap = document.createElement("div");
    muteWrap.className = "mute-wrap";
    const muteBtn = document.createElement("button");
    muteBtn.type = "button";
    muteBtn.className = "mute-btn";
    muteBtn.textContent = t(curLang, "muteBtn");

    const menu = document.createElement("div");
    menu.className = "mute-menu";

    const btnPost = document.createElement("button");
    btnPost.type = "button";
    btnPost.className = "menu-action";
    btnPost.textContent = t(curLang, "mutePost");
    btnPost.addEventListener("click", () => {
      closeMenus();
      temporarilyRevealed.delete(item.id);
      if (!state.settings.mutedItemIds.includes(item.id)) {
        state.settings.mutedItemIds.push(item.id);
      }
      saveState();
      renderAll();
    });
    menu.appendChild(btnPost);

    if (item.domain) {
      const btnDom = document.createElement("button");
      btnDom.type = "button";
      btnDom.className = "menu-action";
      btnDom.textContent = t(curLang, "muteDomain", { domain: item.domain });
      btnDom.addEventListener("click", () => {
        closeMenus();
        temporarilyRevealed.delete(item.id);
        if (!state.settings.mutedDomains.includes(item.domain)) {
          state.settings.mutedDomains.push(item.domain);
        }
        saveState();
        renderAll();
      });
      menu.appendChild(btnDom);
    }

    const kwForm = document.createElement("form");
    kwForm.className = "add-row";
    const kwInput = document.createElement("input");
    kwInput.type = "text";
    kwInput.placeholder = t(curLang, "muteKeywordPrompt");
    const kwGo = document.createElement("button");
    kwGo.type = "submit";
    kwGo.textContent = t(curLang, "add");
    kwForm.append(kwInput, kwGo);
    kwForm.addEventListener("submit", (e) => {
      e.preventDefault();
      const kw = kwInput.value.trim();
      if (!kw) return;
      if (!state.settings.keywords.includes(kw)) {
        state.settings.keywords.push(kw);
      }
      closeMenus();
      saveState();
      renderAll();
    });
    menu.appendChild(kwForm);

    muteBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      const open = !menu.classList.contains("open");
      closeMenus(menu);
      menu.classList.toggle("open", open);
    });

    muteWrap.append(muteBtn, menu);
    head.append(badges, muteWrap);

    const titleEl = document.createElement("a");
    titleEl.className = "feed-title";
    titleEl.href = item.url;
    titleEl.target = "_blank";
    titleEl.rel = "noopener noreferrer";
    titleEl.textContent = item.title;

    const snippetEl = document.createElement("p");
    snippetEl.className = "feed-snippet";
    snippetEl.textContent = item.snippet;

    const metaEl = document.createElement("div");
    metaEl.className = "feed-meta";
    metaEl.textContent = `${item.author} · ${item.meta}`;

    card.append(head, titleEl, snippetEl, metaEl);
    el.feedList.appendChild(card);
  }

  if (el.feedList.children.length === 0) {
    const empty = document.createElement("div");
    empty.className = "empty-state";
    empty.textContent = t(curLang, "demoEmpty");
    el.feedList.appendChild(empty);
  }

  el.statVisible.textContent = String(visibleCount);
  el.statMuted.textContent = String(mutedCount);
  el.statTotal.textContent = String(items.length);
}

function renderAll() {
  renderI18n();
  el.paywalls.checked = state.settings.mutePaywalls;
  el.clickbait.checked = state.settings.muteClickbaitSlop;
  el.seen.checked = state.settings.hideSeen;
  el.displayMode.value = state.settings.displayMode;
  el.llmToggle.checked = state.settings.llm.enabled;
  el.llmPrompt.value = state.settings.llm.rulesPrompt;
  el.toggleRealLlm.checked = state.useRealLlm;
  el.realLlmFields.hidden = !state.useRealLlm;
  el.llmBaseUrl.value = state.settings.llm.baseUrl;
  el.llmModel.value = state.settings.llm.model;
  el.llmApiKey.value = state.settings.llm.apiKey;

  document.querySelectorAll(".tab[data-filter]").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.filter === state.siteFilter);
  });

  renderTags(el.kwTags, state.settings.keywords, (v) => {
    state.settings.keywords = state.settings.keywords.filter((x) => x !== v);
    saveState();
    renderAll();
  });

  renderTags(el.domTags, state.settings.mutedDomains, (v) => {
    state.settings.mutedDomains = state.settings.mutedDomains.filter((x) => x !== v);
    saveState();
    renderAll();
  });

  renderTags(el.rxTags, state.settings.regexRules, (v) => {
    state.settings.regexRules = state.settings.regexRules.filter((x) => x !== v);
    saveState();
    renderAll();
  });

  renderFeed();
}

function bindEvents() {
  document.querySelectorAll(".lang-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      state.settings.language = btn.dataset.lang;
      saveState();
      renderAll();
    });
  });

  el.btnReset.addEventListener("click", () => {
    localStorage.removeItem(STORAGE_KEY);
    temporarilyRevealed.clear();
    realLlmVerdicts = {};
    state = {
      settings: createDemoDefaults(),
      seenIds: new Set(),
      siteFilter: "all",
      useRealLlm: false,
    };
    saveState();
    renderAll();
  });

  el.paywalls.addEventListener("change", () => {
    state.settings.mutePaywalls = el.paywalls.checked;
    saveState();
    renderAll();
  });

  el.clickbait.addEventListener("change", () => {
    state.settings.muteClickbaitSlop = el.clickbait.checked;
    saveState();
    renderAll();
  });

  el.seen.addEventListener("change", () => {
    state.settings.hideSeen = el.seen.checked;
    saveState();
    renderAll();
  });

  el.btnMarkSeen.addEventListener("click", () => {
    const items = filteredFeedItems();
    const llmVerdicts = computeDemoLlmVerdicts(items);
    for (const item of items) {
      const res = evaluateItem(item, state.settings, { seenIds: state.seenIds, llmVerdicts });
      if (!res.muted) {
        state.seenIds.add(item.id);
      }
    }
    state.settings.hideSeen = true;
    saveState();
    renderAll();
  });

  el.displayMode.addEventListener("change", () => {
    state.settings.displayMode = el.displayMode.value;
    saveState();
    renderAll();
  });

  el.kwForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const val = el.kwInput.value.trim();
    if (val && !state.settings.keywords.includes(val)) {
      state.settings.keywords.push(val);
      saveState();
    }
    el.kwInput.value = "";
    renderAll();
  });

  el.domForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const val = normalizeDomain(el.domInput.value);
    if (val && !state.settings.mutedDomains.includes(val)) {
      state.settings.mutedDomains.push(val);
      saveState();
    }
    el.domInput.value = "";
    renderAll();
  });

  el.rxForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const val = el.rxInput.value.trim();
    if (!val || !compileRegexRule(val)) return;
    if (!state.settings.regexRules.includes(val)) {
      state.settings.regexRules.push(val);
      saveState();
    }
    el.rxInput.value = "";
    renderAll();
  });

  el.llmToggle.addEventListener("change", () => {
    state.settings.llm.enabled = el.llmToggle.checked;
    saveState();
    renderAll();
  });

  el.llmPrompt.addEventListener("input", () => {
    state.settings.llm.rulesPrompt = el.llmPrompt.value;
    realLlmVerdicts = {};
    saveState();
    renderFeed();
  });

  document.querySelectorAll(".chip[data-preset]").forEach((chip) => {
    chip.addEventListener("click", () => {
      const curLang = lang();
      const map = {
        ai: t(curLang, "presetAiText"),
        ads: t(curLang, "presetAdsText"),
        politics: t(curLang, "presetPoliticsText"),
      };
      const text = map[chip.dataset.preset] || "";
      if (!text) return;
      state.settings.llm.rulesPrompt = text;
      state.settings.llm.enabled = true;
      realLlmVerdicts = {};
      saveState();
      renderAll();
    });
  });

  el.toggleRealLlm.addEventListener("change", () => {
    state.useRealLlm = el.toggleRealLlm.checked;
    saveState();
    renderAll();
  });

  const syncLlmInputs = () => {
    state.settings.llm.baseUrl = el.llmBaseUrl.value.trim() || "http://127.0.0.1:1234/v1";
    state.settings.llm.model = el.llmModel.value.trim() || "local-model";
    state.settings.llm.apiKey = el.llmApiKey.value.trim();
    saveState();
  };

  [el.llmBaseUrl, el.llmModel, el.llmApiKey].forEach((node) =>
    node.addEventListener("change", syncLlmInputs)
  );

  el.btnRunRealLlm.addEventListener("click", async () => {
    syncLlmInputs();
    el.realLlmStatus.textContent = "...";
    const health = await testLlmConnection(state.settings.llm);
    if (!health.ok) {
      el.realLlmStatus.textContent = health.message;
      return;
    }
    if (state.settings.llm.enabled && state.settings.llm.rulesPrompt.trim()) {
      const items = filteredFeedItems();
      const res = await classifyItemsWithLlm(items, state.settings.llm);
      if (res.error) {
        el.realLlmStatus.textContent = res.error;
        return;
      }
      realLlmVerdicts = res.verdicts || {};
      el.realLlmStatus.textContent = `${health.message} · classified ${items.length}`;
      renderFeed();
    } else {
      el.realLlmStatus.textContent = health.message;
    }
  });

  el.btnExport.addEventListener("click", () => {
    const json = exportSettingsJson(state.settings);
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
      state.settings = importSettingsJson(text);
      saveState();
      renderAll();
    } catch (err) {
      alert(err?.message || "Invalid JSON");
    }
    el.importFile.value = "";
  });

  el.siteTabs.addEventListener("click", (e) => {
    const tab = e.target.closest(".tab[data-filter]");
    if (!tab) return;
    state.siteFilter = tab.dataset.filter;
    saveState();
    renderAll();
  });
}

bindEvents();
renderAll();
