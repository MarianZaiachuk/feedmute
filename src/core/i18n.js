const DICTIONARY = {
  en: {
    appName: "FeedMute",
    tagline: "Mute keywords, domains, paywalls, clickbait and AI slop across news feeds",
    enabled: "Extension active",
    siteStatusOn: "Active on {site}",
    siteStatusOff: "Paused on {site}",
    siteUnsupported: "Feed not matched on this page",
    mutedCount: "{count} muted",
    quickFilters: "Built-in filters",
    mutePaywalls: "Mute paywalled sites",
    muteClickbaitSlop: "Mute clickbait & AI slop",
    hideSeen: "Hide already seen posts",
    displayMode: "When muted",
    modeCollapse: "Collapse to a bar",
    modeHide: "Hide completely",
    keywords: "Muted keywords",
    keywordPlaceholder: "Add keyword or phrase...",
    domains: "Muted domains",
    domainPlaceholder: "Add domain (e.g. medium.com)...",
    regexRules: "Regex rules",
    regexPlaceholder: "Add regex (e.g. /\\bcrypto\\b/i)...",
    add: "Add",
    naturalRules: "Plain-language rules (LLM)",
    naturalPlaceholder: "e.g. Hide AI hype, crypto promos, and culture war bait",
    enableLlm: "Enable LLM filter",
    presetAi: "No AI hype",
    presetAds: "No promo / ads",
    presetPolitics: "No politics",
    presetAiText: "Hide AI slop, LLM hype, and ChatGPT prompt threads",
    presetAdsText: "Hide sponsored posts, promo codes, and disguised ads",
    presetPoliticsText: "Hide election drama and partisan politics",
    openOptions: "Full settings",
    exportJson: "Export JSON",
    importJson: "Import JSON",
    resetMuted: "Reset muted posts",
    resetDone: "Muted posts cleared",
    muteBtn: "Mute",
    mutePost: "Hide this post",
    muteDomain: "Mute {domain}",
    muteKeywordPrompt: "Mute by keyword...",
    showPost: "Show",
    reasonItem: "Muted manually",
    reasonDomain: "Muted domain: {value}",
    reasonPaywall: "Paywall: {value}",
    reasonKeyword: "Keyword: {value}",
    reasonRegex: "Regex: {value}",
    reasonClickbait: "Clickbait / AI slop",
    reasonSeen: "Already seen",
    reasonLlm: "Rule: {value}",
    optionsTitle: "FeedMute Settings",
    sitesHeading: "Supported sites",
    paywallsHeading: "Custom paywall domains",
    llmHeading: "Plain-language LLM filter (optional)",
    llmProvider: "Provider",
    llmOpenAi: "OpenAI-compatible (LM Studio / Ollama / OpenAI)",
    llmGemini: "Google Gemini",
    llmBaseUrl: "Base URL",
    llmModel: "Model",
    llmApiKey: "API key (optional for local)",
    testConnection: "Test connection",
    regexTester: "Test regex against sample title",
    clearSeen: "Clear seen history",
    saved: "Saved",
    demoTitle: "FeedMute Interactive Demo",
    demoSubtitle: "Same filtering engine as the Chrome extension — running locally in your browser",
    demoVisible: "Visible",
    demoMuted: "Muted",
    demoTotal: "Total",
    demoMarkSeen: "Mark visible as seen",
    demoReset: "Reset demo",
    demoAllSites: "All feeds",
    demoUaNews: "UA News (DOU / UP / Suspilne / TSN)",
    demoLlmNote: "Uses built-in intent matching offline; enable real endpoint in extension options or below.",
    demoUseRealLlm: "Send to local/API LLM endpoint",
    demoEmpty: "All items in this view are muted. Adjust filters or reset the demo.",
  },
  uk: {
    appName: "FeedMute",
    tagline: "Приховуйте теми, домени, paywall-сайти, клікбейт та AI-слоп у стрічках новин",
    enabled: "Розширення увімкнено",
    siteStatusOn: "Активно на {site}",
    siteStatusOff: "Вимкнено на {site}",
    siteUnsupported: "Цей сайт не входить до списку стрічок",
    mutedCount: "Приховано: {count}",
    quickFilters: "Швидкі фільтри",
    mutePaywalls: "Приховувати paywall-сайти",
    muteClickbaitSlop: "Приховувати клікбейт та AI-слоп",
    hideSeen: "Приховувати вже переглянуті",
    displayMode: "Як приховувати",
    modeCollapse: "Згортати в рядок",
    modeHide: "Прибирати повністю",
    keywords: "Заглушені слова",
    keywordPlaceholder: "Додайте слово або фразу...",
    domains: "Заглушені домени",
    domainPlaceholder: "Домен (напр. medium.com)...",
    regexRules: "Regex-правила",
    regexPlaceholder: "Додайте regex (напр. /\\bкрипт/i)...",
    add: "Додати",
    naturalRules: "Правила звичайною мовою (LLM)",
    naturalPlaceholder: "Напр.: Приховуй AI-слоп, приховану рекламу та політику",
    enableLlm: "Увімкнути LLM-фільтр",
    presetAi: "Без AI-гайпу",
    presetAds: "Без реклами",
    presetPolitics: "Без політики",
    presetAiText: "Приховуй AI-слоп, гайп навколо LLM та однотипні пости про ChatGPT",
    presetAdsText: "Приховуй приховану рекламу, промокоди та партнерські матеріали",
    presetPoliticsText: "Приховуй передвиборчі скандали та політичні суперечки",
    openOptions: "Усі налаштування",
    exportJson: "Експорт JSON",
    importJson: "Імпорт JSON",
    resetMuted: "Скинути сховані пости",
    resetDone: "Список схованих постів очищено",
    muteBtn: "Заглушити",
    mutePost: "Сховати цей пост",
    muteDomain: "Заглушити {domain}",
    muteKeywordPrompt: "Заглушити слово...",
    showPost: "Показати",
    reasonItem: "Приховано вручну",
    reasonDomain: "Домен: {value}",
    reasonPaywall: "Paywall: {value}",
    reasonKeyword: "Слово: {value}",
    reasonRegex: "Regex: {value}",
    reasonClickbait: "Клікбейт / AI-слоп",
    reasonSeen: "Уже переглянуто",
    reasonLlm: "Правило: {value}",
    optionsTitle: "Налаштування FeedMute",
    sitesHeading: "Підтримувані сайти",
    paywallsHeading: "Власні paywall-домени",
    llmHeading: "Фільтр звичайною мовою через LLM (опціонально)",
    llmProvider: "Провайдер",
    llmOpenAi: "OpenAI-сумісний (LM Studio / Ollama / OpenAI)",
    llmGemini: "Google Gemini",
    llmBaseUrl: "Base URL",
    llmModel: "Модель",
    llmApiKey: "API-ключ (для локальних можна порожньо)",
    testConnection: "Перевірити з'єднання",
    regexTester: "Перевірка regex на прикладі заголовка",
    clearSeen: "Очистити історію переглянутих",
    saved: "Збережено",
    demoTitle: "FeedMute — Інтерактивне демо",
    demoSubtitle: "Той самий рушій фільтрації, що й у Chrome-розширенні — працює прямо в браузері",
    demoVisible: "Видимі",
    demoMuted: "Приховані",
    demoTotal: "Всього",
    demoMarkSeen: "Позначити видимі як переглянуті",
    demoReset: "Скинути демо",
    demoAllSites: "Усі стрічки",
    demoUaNews: "Укр. медіа (DOU / УП / Суспільне / ТСН)",
    demoLlmNote: "Офлайн працює через вбудований інтент-матчер; або увімкніть локальний/API LLM нижче.",
    demoUseRealLlm: "Надсилати на локальний або API LLM",
    demoEmpty: "Усі пости в цьому фільтрі приховані. Змініть правила або натисніть «Скинути демо».",
  },
};

export function resolveLanguage(pref = "auto", navLang) {
  if (pref === "en" || pref === "uk") {
    return pref;
  }
  const detected =
    navLang ||
    (typeof navigator !== "undefined" ? navigator.language || navigator.userLanguage : "en") ||
    "en";
  return detected.toLowerCase().startsWith("uk") ? "uk" : "en";
}

export function t(lang, key, params = {}) {
  const dict = DICTIONARY[lang === "uk" ? "uk" : "en"];
  let text = dict[key] || DICTIONARY.en[key] || key;
  for (const [k, v] of Object.entries(params)) {
    text = text.replaceAll(`{${k}}`, String(v ?? ""));
  }
  return text;
}

export function formatMuteReason(lang, result) {
  if (!result || !result.muted) {
    return "";
  }
  switch (result.ruleType) {
    case "item":
      return t(lang, "reasonItem");
    case "domain":
      return t(lang, "reasonDomain", { value: result.reason });
    case "paywall":
      return t(lang, "reasonPaywall", { value: result.reason });
    case "keyword":
      return t(lang, "reasonKeyword", { value: result.reason });
    case "regex":
      return t(lang, "reasonRegex", { value: result.reason });
    case "clickbait":
      return t(lang, "reasonClickbait");
    case "seen":
      return t(lang, "reasonSeen");
    case "llm":
      return t(lang, "reasonLlm", { value: result.reason });
    default:
      return String(result.reason || "");
  }
}
