import { detectClickbaitOrSlop } from "./heuristics.js";
import { DEFAULT_PAYWALL_DOMAINS } from "./paywalls.js";

export const DEFAULT_SETTINGS = {
  enabled: true,
  language: "auto",
  displayMode: "collapse",
  mutePaywalls: true,
  muteClickbaitSlop: true,
  hideSeen: false,
  keywords: [],
  regexRules: [],
  mutedDomains: [],
  mutedItemIds: [],
  customPaywallDomains: [],
  disabledSites: [],
  llm: {
    enabled: false,
    provider: "openai_compatible",
    baseUrl: "http://127.0.0.1:1234/v1",
    apiKey: "",
    model: "local-model",
    rulesPrompt: "",
  },
};

export function createDefaultSettings() {
  return {
    ...DEFAULT_SETTINGS,
    keywords: [],
    regexRules: [],
    mutedDomains: [],
    mutedItemIds: [],
    customPaywallDomains: [],
    disabledSites: [],
    llm: { ...DEFAULT_SETTINGS.llm },
  };
}

export function normalizeDomain(input) {
  if (!input || typeof input !== "string") {
    return "";
  }
  let value = input.trim().toLowerCase();
  if (!value) {
    return "";
  }
  if (/^https?:\/\//i.test(value)) {
    try {
      value = new URL(value).hostname.toLowerCase();
    } catch {
      return "";
    }
  } else {
    value = value.split("/")[0].split(":")[0];
  }
  return value.replace(/^www\./, "");
}

export function domainMatches(host, ruleDomain) {
  const normHost = normalizeDomain(host);
  const normRule = normalizeDomain(ruleDomain);
  if (!normHost || !normRule) {
    return false;
  }
  return normHost === normRule || normHost.endsWith(`.${normRule}`);
}

export function compileRegexRule(pattern) {
  if (!pattern || typeof pattern !== "string") {
    return null;
  }
  const trimmed = pattern.trim();
  if (!trimmed) {
    return null;
  }

  try {
    const slashMatch = trimmed.match(/^\/(.+)\/([gimsuy]*)$/);
    if (slashMatch) {
      const flags = slashMatch[2].replace(/[gy]/g, "");
      return new RegExp(slashMatch[1], flags || "i");
    }
    return new RegExp(trimmed, "i");
  } catch {
    return null;
  }
}

export function mergeSettings(raw = {}) {
  const base = createDefaultSettings();
  if (!raw || typeof raw !== "object") {
    return base;
  }

  const strList = (val) =>
    Array.isArray(val)
      ? [...new Set(val.map((v) => String(v).trim()).filter(Boolean))]
      : [];

  return {
    enabled: raw.enabled !== undefined ? Boolean(raw.enabled) : base.enabled,
    language: ["auto", "en", "uk"].includes(raw.language) ? raw.language : base.language,
    displayMode: ["collapse", "hide"].includes(raw.displayMode) ? raw.displayMode : base.displayMode,
    mutePaywalls: raw.mutePaywalls !== undefined ? Boolean(raw.mutePaywalls) : base.mutePaywalls,
    muteClickbaitSlop:
      raw.muteClickbaitSlop !== undefined ? Boolean(raw.muteClickbaitSlop) : base.muteClickbaitSlop,
    hideSeen: raw.hideSeen !== undefined ? Boolean(raw.hideSeen) : base.hideSeen,
    keywords: strList(raw.keywords),
    regexRules: strList(raw.regexRules),
    mutedDomains: strList(raw.mutedDomains).map(normalizeDomain).filter(Boolean),
    mutedItemIds: strList(raw.mutedItemIds),
    customPaywallDomains: strList(raw.customPaywallDomains).map(normalizeDomain).filter(Boolean),
    disabledSites: strList(raw.disabledSites),
    llm: {
      enabled: raw.llm?.enabled !== undefined ? Boolean(raw.llm.enabled) : base.llm.enabled,
      provider: ["openai_compatible", "gemini"].includes(raw.llm?.provider)
        ? raw.llm.provider
        : base.llm.provider,
      baseUrl:
        typeof raw.llm?.baseUrl === "string" && raw.llm.baseUrl.trim()
          ? raw.llm.baseUrl.trim()
          : base.llm.baseUrl,
      apiKey: typeof raw.llm?.apiKey === "string" ? raw.llm.apiKey.trim() : "",
      model:
        typeof raw.llm?.model === "string" && raw.llm.model.trim()
          ? raw.llm.model.trim()
          : base.llm.model,
      rulesPrompt: typeof raw.llm?.rulesPrompt === "string" ? raw.llm.rulesPrompt : "",
    },
  };
}

export function evaluateItem(item, settings, context = {}) {
  const cfg = settings || DEFAULT_SETTINGS;
  const siteId = item?.siteId || "";

  if (!cfg.enabled || (siteId && Array.isArray(cfg.disabledSites) && cfg.disabledSites.includes(siteId))) {
    return { muted: false, ruleType: "disabled", reason: null };
  }

  // 1. Direct post mute
  if (item?.id && Array.isArray(cfg.mutedItemIds) && cfg.mutedItemIds.includes(item.id)) {
    return { muted: true, ruleType: "item", reason: "item" };
  }

  // Resolve item domain
  const itemDomain = normalizeDomain(item?.domain || item?.url || "");

  // 2. Domain blocklist
  if (itemDomain && Array.isArray(cfg.mutedDomains)) {
    for (const ruleDomain of cfg.mutedDomains) {
      if (domainMatches(itemDomain, ruleDomain)) {
        return {
          muted: true,
          ruleType: "domain",
          reason: ruleDomain,
          matchedValue: ruleDomain,
        };
      }
    }
  }

  // 3. Paywall domain list
  if (cfg.mutePaywalls && itemDomain) {
    const paywalls = [
      ...DEFAULT_PAYWALL_DOMAINS,
      ...(Array.isArray(cfg.customPaywallDomains) ? cfg.customPaywallDomains : []),
    ];
    for (const pwDomain of paywalls) {
      if (domainMatches(itemDomain, pwDomain)) {
        return {
          muted: true,
          ruleType: "paywall",
          reason: pwDomain,
          matchedValue: pwDomain,
        };
      }
    }
  }

  const searchable = `${item?.title || ""} ${item?.snippet || ""} ${item?.author || ""}`;
  const lowerSearchable = searchable.toLowerCase();

  // 4. Keyword match
  if (Array.isArray(cfg.keywords)) {
    for (const kw of cfg.keywords) {
      const needle = (kw || "").trim().toLowerCase();
      if (needle && lowerSearchable.includes(needle)) {
        return {
          muted: true,
          ruleType: "keyword",
          reason: kw.trim(),
          matchedValue: kw.trim(),
        };
      }
    }
  }

  // 5. Regex match
  if (Array.isArray(cfg.regexRules)) {
    for (const rawPattern of cfg.regexRules) {
      const re = compileRegexRule(rawPattern);
      if (re && re.test(searchable)) {
        return {
          muted: true,
          ruleType: "regex",
          reason: rawPattern,
          matchedValue: rawPattern,
        };
      }
    }
  }

  // 6. Clickbait / AI-slop heuristic
  if (cfg.muteClickbaitSlop) {
    const heuristic = detectClickbaitOrSlop(item?.title, item?.snippet);
    if (heuristic.matched) {
      return {
        muted: true,
        ruleType: "clickbait",
        reason: heuristic.label,
        matchedValue: heuristic.label,
      };
    }
  }

  // 7. Hide seen
  if (cfg.hideSeen && item?.id && context.seenIds && context.seenIds.has(item.id)) {
    return { muted: true, ruleType: "seen", reason: "seen" };
  }

  // 8. LLM natural-language verdict
  const verdict = item?.id && context.llmVerdicts ? context.llmVerdicts[item.id] : null;
  if (verdict && verdict.mute) {
    return {
      muted: true,
      ruleType: "llm",
      reason: verdict.reason || "AI rule",
      matchedValue: verdict.reason || "AI rule",
    };
  }

  return { muted: false, ruleType: null, reason: null };
}

export function exportSettingsJson(settings, { includeApiKey = false } = {}) {
  const safe = mergeSettings(settings);
  if (!includeApiKey && safe.llm) {
    safe.llm.apiKey = "";
  }
  return JSON.stringify(safe, null, 2);
}

export function importSettingsJson(rawJson) {
  const parsed = JSON.parse(rawJson);
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("Invalid settings JSON object");
  }
  return mergeSettings(parsed);
}
