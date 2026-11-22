import { describe, expect, it } from "vitest";
import {
  compileRegexRule,
  createDefaultSettings,
  domainMatches,
  evaluateItem,
  exportSettingsJson,
  importSettingsJson,
  normalizeDomain,
} from "../src/core/engine.js";
import { evaluateNaturalRulesFallback } from "../src/core/heuristics.js";

describe("domain helpers", () => {
  it("normalizes domains and strips www prefix", () => {
    expect(normalizeDomain("https://www.nytimes.com/2026/news")).toBe("nytimes.com");
    expect(normalizeDomain("  WWW.Forbes.UA/money  ")).toBe("forbes.ua");
    expect(normalizeDomain("sub.wsj.com:443")).toBe("sub.wsj.com");
  });

  it("matches exact domains and subdomains", () => {
    expect(domainMatches("www.nytimes.com", "nytimes.com")).toBe(true);
    expect(domainMatches("cooking.nytimes.com", "nytimes.com")).toBe(true);
    expect(domainMatches("fakenytimes.com", "nytimes.com")).toBe(false);
  });
});

describe("evaluateItem filtering engine", () => {
  it("respects global and per-site disabled flags", () => {
    const settings = createDefaultSettings();
    settings.keywords = ["rust"];
    settings.enabled = false;
    const item = { id: "1", title: "Rust 2.0 released", domain: "rust-lang.org", siteId: "hackernews" };
    expect(evaluateItem(item, settings).muted).toBe(false);

    settings.enabled = true;
    settings.disabledSites = ["hackernews"];
    expect(evaluateItem(item, settings).muted).toBe(false);
  });

  it("detects default and custom paywall domains", () => {
    const settings = createDefaultSettings();
    expect(
      evaluateItem(
        { id: "p1", title: "Market wrap", domain: "www.bloomberg.com", siteId: "hackernews" },
        settings
      )
    ).toMatchObject({ muted: true, ruleType: "paywall", reason: "bloomberg.com" });

    settings.customPaywallDomains = ["theverge.com"];
    expect(
      evaluateItem(
        { id: "p2", title: "Review", domain: "theverge.com", siteId: "reddit" },
        settings
      )
    ).toMatchObject({ muted: true, ruleType: "paywall", reason: "theverge.com" });
  });

  it("matches EN and Cyrillic UA keywords case-insensitively", () => {
    const settings = createDefaultSettings();
    settings.keywords = ["крипт", "kubernetes"];

    expect(
      evaluateItem(
        { id: "k1", title: "Новини про Криптовалюту та ринок", domain: "tsn.ua", siteId: "tsn" },
        settings
      )
    ).toMatchObject({ muted: true, ruleType: "keyword", reason: "крипт" });

    expect(
      evaluateItem(
        { id: "k2", title: "Why we left KUBERNETES behind", domain: "dou.ua", siteId: "dou" },
        settings
      )
    ).toMatchObject({ muted: true, ruleType: "keyword", reason: "kubernetes" });
  });

  it("evaluates regex rules and ignores invalid regex syntax safely", () => {
    expect(compileRegexRule("[unclosed(")).toBeNull();

    const settings = createDefaultSettings();
    settings.regexRules = ["[unclosed(", "/\\b(web3|airdrop)\\b/i"];

    const res = evaluateItem(
      { id: "r1", title: "Huge token AIRDROP live", domain: "x.com", siteId: "x" },
      settings
    );
    expect(res).toMatchObject({ muted: true, ruleType: "regex" });
  });

  it("detects EN and UA clickbait and AI-slop heuristics", () => {
    const settings = createDefaultSettings();

    expect(
      evaluateItem(
        { id: "c1", title: "You won't believe what happened next in production", domain: "ex.com", siteId: "reddit" },
        settings
      )
    ).toMatchObject({ muted: true, ruleType: "clickbait", reason: "clickbait" });

    expect(
      evaluateItem(
        { id: "c2", title: "ШОК! Ось чому про це мовчать розробники", domain: "tsn.ua", siteId: "tsn" },
        settings
      )
    ).toMatchObject({ muted: true, ruleType: "clickbait", reason: "clickbait" });

    expect(
      evaluateItem(
        { id: "a1", title: "Delve into how this tool will revolutionize the way teams ship", domain: "ex.com", siteId: "hn" },
        settings
      )
    ).toMatchObject({ muted: true, ruleType: "clickbait", reason: "ai_slop" });

    expect(
      evaluateItem(
        { id: "a2", title: "У сучасному швидкоплинному світі це ключ до успіху", domain: "dou.ua", siteId: "dou" },
        settings
      )
    ).toMatchObject({ muted: true, ruleType: "clickbait", reason: "ai_slop" });
  });

  it("supports hideSeen, mutedItemIds, and LLM verdict priority", () => {
    const settings = createDefaultSettings();
    settings.hideSeen = true;
    settings.mutedItemIds = ["manual-1"];
    settings.llm.enabled = true;

    const itemManual = { id: "manual-1", title: "SQLite notes", domain: "sqlite.org", siteId: "hackernews" };
    expect(evaluateItem(itemManual, settings)).toMatchObject({ muted: true, ruleType: "item" });

    const itemSeen = { id: "seen-1", title: "Postgres 18", domain: "postgresql.org", siteId: "hackernews" };
    expect(
      evaluateItem(itemSeen, settings, { seenIds: new Set(["seen-1"]) })
    ).toMatchObject({ muted: true, ruleType: "seen" });

    const itemLlm = { id: "llm-1", title: "Hot drama thread", domain: "x.com", siteId: "x" };
    expect(
      evaluateItem(itemLlm, settings, { llmVerdicts: { "llm-1": { mute: true, reason: "drama" } } })
    ).toMatchObject({ muted: true, ruleType: "llm", reason: "drama" });
  });

  it("matches plain-language fallback intents for demo", () => {
    const res = evaluateNaturalRulesFallback(
      { title: "Sponsored promo code for Web3 launch", snippet: "", author: "", domain: "ex.com" },
      "Hide sponsored promo ads",
      "en"
    );
    expect(res).toMatchObject({ mute: true });
  });

  it("exports and imports settings JSON cleanly without leaking API key by default", () => {
    const settings = createDefaultSettings();
    settings.keywords = ["nft"];
    settings.llm.apiKey = "secret-key";

    const exported = exportSettingsJson(settings);
    const imported = importSettingsJson(exported);
    expect(imported.keywords).toEqual(["nft"]);
    expect(imported.llm.apiKey).toBe("");
    expect(() => importSettingsJson("{invalid")).toThrow();
  });
});
