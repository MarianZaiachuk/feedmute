import { getAdapterForHost, extractFeedItems } from "../src/core/adapters.js";
import { createDefaultSettings, evaluateItem, mergeSettings } from "../src/core/engine.js";
import { formatMuteReason, resolveLanguage, t } from "../src/core/i18n.js";

const adapter = getAdapterForHost(window.location.hostname);

if (adapter) {
  let settings = createDefaultSettings();
  let seenIds = new Set();
  const llmVerdicts = {};
  const llmRequested = new Set();
  const temporarilyRevealed = new Set();
  const itemPlaceholders = new WeakMap();
  const dwellTimers = new Map();
  let rescanTimer = null;

  const lang = () => resolveLanguage(settings.language);

  function closeAllMenus(except = null) {
    document.querySelectorAll(".feedmute-menu.open").forEach((menu) => {
      if (menu !== except) {
        menu.classList.remove("open");
      }
    });
  }

  document.addEventListener("click", (evt) => {
    if (!evt.target.closest(".feedmute-trigger-wrap")) {
      closeAllMenus();
    }
  });

  async function saveSettingsUpdate(updater) {
    const fresh = mergeSettings(settings);
    updater(fresh);
    settings = fresh;
    await chrome.storage.local.set({ settings: fresh });
  }

  function removePlaceholder(el) {
    const existing = itemPlaceholders.get(el);
    if (existing && existing.parentNode) {
      existing.parentNode.removeChild(existing);
    }
    itemPlaceholders.delete(el);
  }

  function clearAllFiltering() {
    document.querySelectorAll(".feedmute-hidden").forEach((node) => {
      node.classList.remove("feedmute-hidden");
    });
    document.querySelectorAll(".feedmute-collapsed-bar, .feedmute-collapsed-row").forEach((bar) => {
      bar.remove();
    });
  }

  function ensureTriggerButton(el, item) {
    const mount = adapter.getMountPoint(el);
    if (!mount || mount.querySelector(`.feedmute-trigger-wrap[data-item-id="${CSS.escape(item.id)}"]`)) {
      return;
    }

    const curLang = lang();
    const wrap = document.createElement("span");
    wrap.className = "feedmute-trigger-wrap";
    wrap.dataset.itemId = item.id;

    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "feedmute-trigger-btn";
    btn.textContent = t(curLang, "muteBtn");

    const menu = document.createElement("div");
    menu.className = "feedmute-menu";

    const hidePostBtn = document.createElement("button");
    hidePostBtn.type = "button";
    hidePostBtn.className = "feedmute-menu-btn";
    hidePostBtn.textContent = t(curLang, "mutePost");
    hidePostBtn.addEventListener("click", async (e) => {
      e.preventDefault();
      e.stopPropagation();
      closeAllMenus();
      temporarilyRevealed.delete(item.id);
      await saveSettingsUpdate((s) => {
        if (!s.mutedItemIds.includes(item.id)) {
          s.mutedItemIds.push(item.id);
        }
      });
    });
    menu.appendChild(hidePostBtn);

    if (item.domain && !adapter.hosts.includes(item.domain)) {
      const muteDomBtn = document.createElement("button");
      muteDomBtn.type = "button";
      muteDomBtn.className = "feedmute-menu-btn";
      muteDomBtn.textContent = t(curLang, "muteDomain", { domain: item.domain });
      muteDomBtn.addEventListener("click", async (e) => {
        e.preventDefault();
        e.stopPropagation();
        closeAllMenus();
        temporarilyRevealed.delete(item.id);
        await saveSettingsUpdate((s) => {
          if (!s.mutedDomains.includes(item.domain)) {
            s.mutedDomains.push(item.domain);
          }
        });
      });
      menu.appendChild(muteDomBtn);
    }

    const kwForm = document.createElement("form");
    kwForm.className = "feedmute-kw-form";
    const kwInput = document.createElement("input");
    kwInput.type = "text";
    kwInput.className = "feedmute-kw-input";
    kwInput.placeholder = t(curLang, "muteKeywordPrompt");
    const kwSubmit = document.createElement("button");
    kwSubmit.type = "submit";
    kwSubmit.className = "feedmute-kw-submit";
    kwSubmit.textContent = t(curLang, "add");
    kwForm.append(kwInput, kwSubmit);

    kwForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      e.stopPropagation();
      const kw = kwInput.value.trim();
      if (!kw) return;
      kwInput.value = "";
      closeAllMenus();
      temporarilyRevealed.delete(item.id);
      await saveSettingsUpdate((s) => {
        if (!s.keywords.includes(kw)) {
          s.keywords.push(kw);
        }
      });
    });
    kwForm.addEventListener("click", (e) => e.stopPropagation());
    menu.appendChild(kwForm);

    btn.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      const willOpen = !menu.classList.contains("open");
      closeAllMenus(menu);
      menu.classList.toggle("open", willOpen);
      if (willOpen) {
        kwInput.focus();
      }
    });

    wrap.append(btn, menu);
    mount.appendChild(wrap);
  }

  function createCollapsedPlaceholder(el, item, reasonText) {
    const curLang = lang();
    const inner = document.createElement("div");
    inner.className = "feedmute-collapsed-inner";

    const label = document.createElement("span");
    label.className = "feedmute-reason-pill";
    const shortTitle = item.title.length > 72 ? `${item.title.slice(0, 72)}...` : item.title;
    label.textContent = `${reasonText} · ${shortTitle}`;

    const showBtn = document.createElement("button");
    showBtn.type = "button";
    showBtn.className = "feedmute-show-btn";
    showBtn.textContent = t(curLang, "showPost");
    showBtn.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      temporarilyRevealed.add(item.id);
      applyFilterPass();
    });

    inner.append(label, showBtn);

    if (adapter.id === "hackernews") {
      const tr = document.createElement("tr");
      tr.className = "feedmute-collapsed-row";
      const td = document.createElement("td");
      td.colSpan = 3;
      td.appendChild(inner);
      tr.appendChild(td);
      return tr;
    }

    const bar = document.createElement("div");
    bar.className = "feedmute-collapsed-bar";
    bar.appendChild(inner);
    return bar;
  }

  const seenObserver = new IntersectionObserver(
    (entries) => {
      if (!settings.hideSeen) return;
      for (const entry of entries) {
        const id = entry.target.dataset.feedmuteSeenId;
        if (!id || seenIds.has(id)) continue;
        if (entry.isIntersecting) {
          if (!dwellTimers.has(id)) {
            const timer = setTimeout(async () => {
              dwellTimers.delete(id);
              if (!seenIds.has(id)) {
                seenIds.add(id);
                const list = Array.from(seenIds).slice(-1500);
                seenIds = new Set(list);
                await chrome.storage.local.set({ seenIds: list });
              }
            }, 2000);
            dwellTimers.set(id, timer);
          }
        } else if (dwellTimers.has(id)) {
          clearTimeout(dwellTimers.get(id));
          dwellTimers.delete(id);
        }
      }
    },
    { threshold: 0.5 }
  );

  async function requestLlmBatchIfNeeded(entries) {
    if (!settings.enabled || !settings.llm?.enabled || !settings.llm?.rulesPrompt?.trim()) {
      return;
    }
    if (settings.disabledSites.includes(adapter.id)) {
      return;
    }
    const candidates = entries
      .map((e) => e.item)
      .filter((item) => !llmRequested.has(item.id) && !llmVerdicts[item.id]);

    if (candidates.length === 0) return;
    candidates.forEach((c) => llmRequested.add(c.id));

    try {
      const response = await chrome.runtime.sendMessage({
        type: "CLASSIFY_BATCH",
        items: candidates,
        settings,
      });
      if (response && response.verdicts && Object.keys(response.verdicts).length > 0) {
        Object.assign(llmVerdicts, response.verdicts);
        applyFilterPass();
      }
    } catch {
      // ignore transient service worker reload errors
    }
  }

  function applyFilterPass() {
    clearAllFiltering();
    const entries = extractFeedItems(document, adapter);
    const curLang = lang();
    let mutedCount = 0;

    for (const { el, item } of entries) {
      ensureTriggerButton(el, item);
      if (settings.hideSeen && !el.dataset.feedmuteSeenId) {
        el.dataset.feedmuteSeenId = item.id;
        seenObserver.observe(el);
      }

      const targets = adapter.getTargets(el);
      removePlaceholder(el);

      if (temporarilyRevealed.has(item.id)) {
        continue;
      }

      const result = evaluateItem(item, settings, { seenIds, llmVerdicts });
      if (!result.muted) {
        continue;
      }

      mutedCount += 1;
      for (const target of targets) {
        target.classList.add("feedmute-hidden");
      }

      if (settings.displayMode === "collapse" && targets[0]?.parentNode) {
        const reasonText = formatMuteReason(curLang, result);
        const placeholder = createCollapsedPlaceholder(el, item, reasonText);
        targets[0].parentNode.insertBefore(placeholder, targets[0]);
        itemPlaceholders.set(el, placeholder);
      }
    }

    chrome.runtime.sendMessage({ type: "UPDATE_BADGE", count: mutedCount }).catch(() => {});
    requestLlmBatchIfNeeded(entries);
  }

  function scheduleFilterPass() {
    if (rescanTimer) {
      clearTimeout(rescanTimer);
    }
    rescanTimer = setTimeout(() => {
      rescanTimer = null;
      applyFilterPass();
    }, 180);
  }

  async function init() {
    const stored = await chrome.storage.local.get(["settings", "seenIds"]);
    settings = mergeSettings(stored.settings || {});
    seenIds = new Set(Array.isArray(stored.seenIds) ? stored.seenIds : []);
    applyFilterPass();

    const observer = new MutationObserver((mutations) => {
      const relevant = mutations.some((m) =>
        Array.from(m.addedNodes).some(
          (n) =>
            n.nodeType === 1 &&
            !n.classList?.contains("feedmute-collapsed-bar") &&
            !n.classList?.contains("feedmute-collapsed-row") &&
            !n.classList?.contains("feedmute-trigger-wrap")
        )
      );
      if (relevant) {
        scheduleFilterPass();
      }
    });
    observer.observe(document.body, { childList: true, subtree: true });

    chrome.storage.onChanged.addListener((changes, areaName) => {
      if (areaName !== "local") return;
      if (changes.settings) {
        const prevPrompt = settings.llm?.rulesPrompt || "";
        settings = mergeSettings(changes.settings.newValue || {});
        if ((settings.llm?.rulesPrompt || "") !== prevPrompt) {
          for (const key of Object.keys(llmVerdicts)) delete llmVerdicts[key];
          llmRequested.clear();
        }
        applyFilterPass();
      }
      if (changes.seenIds) {
        seenIds = new Set(Array.isArray(changes.seenIds.newValue) ? changes.seenIds.newValue : []);
        applyFilterPass();
      }
    });
  }

  init();
}
