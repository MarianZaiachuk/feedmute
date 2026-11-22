import { describe, expect, it } from "vitest";
import {
  classifyItemsWithLlm,
  computeRulesHash,
  getLlmOriginPattern,
  isSupportedLlmOrigin,
  parseLlmBatchResponse,
} from "../src/core/llm.js";

describe("LLM classification helpers", () => {
  it("resolves and validates supported LLM origin patterns", () => {
    expect(getLlmOriginPattern({ provider: "gemini" })).toBe("https://generativelanguage.googleapis.com/*");
    expect(getLlmOriginPattern({ provider: "openai_compatible", baseUrl: "http://127.0.0.1:1234/v1" })).toBe(
      "http://127.0.0.1/*"
    );
    expect(getLlmOriginPattern({ provider: "openai_compatible", baseUrl: "http://localhost:11434/v1" })).toBe(
      "http://localhost/*"
    );
    expect(getLlmOriginPattern({ provider: "openai_compatible", baseUrl: "https://api.openai.com/v1" })).toBe(
      "https://api.openai.com/*"
    );
    expect(getLlmOriginPattern({ provider: "openai_compatible", baseUrl: "https://openrouter.ai/api/v1" })).toBe(
      "https://openrouter.ai/*"
    );

    expect(isSupportedLlmOrigin("https://generativelanguage.googleapis.com/*")).toBe(true);
    expect(isSupportedLlmOrigin("http://127.0.0.1/*")).toBe(true);
    expect(isSupportedLlmOrigin("http://localhost/*")).toBe(true);
    expect(isSupportedLlmOrigin("https://api.openai.com/*")).toBe(true);
    expect(isSupportedLlmOrigin("https://openrouter.ai/*")).toBe(true);

    const unsupported = getLlmOriginPattern({ provider: "openai_compatible", baseUrl: "https://example.com/v1" });
    expect(unsupported).toBe("https://example.com/*");
    expect(isSupportedLlmOrigin(unsupported)).toBe(false);

    expect(getLlmOriginPattern({ provider: "openai_compatible", baseUrl: "not-a-url" })).toBeNull();
    expect(isSupportedLlmOrigin(null)).toBe(false);
  });

  it("computes deterministic rules hash", () => {
    expect(computeRulesHash("no crypto")).toBe(computeRulesHash("  no crypto  "));
    expect(computeRulesHash("no crypto")).not.toBe(computeRulesHash("no politics"));
  });

  it("parses fenced and plain JSON arrays safely", () => {
    const raw = '```json\n[{"id":"1","mute":true,"reason":"AI slop"},{"id":"2","mute":false,"reason":""}]\n```';
    expect(parseLlmBatchResponse(raw)).toEqual({
      "1": { mute: true, reason: "AI slop" },
      "2": { mute: false, reason: "" },
    });
    expect(parseLlmBatchResponse("not json at all")).toEqual({});
  });

  it("classifies batches via OpenAI-compatible endpoint", async () => {
    const mockFetch = async () => ({
      ok: true,
      json: async () => ({
        choices: [{ message: { content: '[{"id":"hn-1","mute":true,"reason":"crypto hype"}]' } }],
      }),
    });

    const res = await classifyItemsWithLlm(
      [{ id: "hn-1", title: "Buy this coin", domain: "x.com", author: "@bot" }],
      { provider: "openai_compatible", baseUrl: "http://127.0.0.1:1234/v1", model: "local", rulesPrompt: "Hide crypto" },
      mockFetch
    );

    expect(res.error).toBeNull();
    expect(res.verdicts["hn-1"]).toEqual({ mute: true, reason: "crypto hype" });
  });

  it("classifies batches via Gemini endpoint and handles network errors", async () => {
    const mockGeminiFetch = async () => ({
      ok: true,
      json: async () => ({
        candidates: [{ content: { parts: [{ text: '[{"id":"a1","mute":true,"reason":"politics"}]' }] } }],
      }),
    });

    const okRes = await classifyItemsWithLlm(
      [{ id: "a1", title: "Election debate", domain: "news.com", author: "" }],
      { provider: "gemini", apiKey: "test-key", model: "gemini-2.5-flash", rulesPrompt: "No politics" },
      mockGeminiFetch
    );
    expect(okRes.error).toBeNull();
    expect(okRes.verdicts.a1).toEqual({ mute: true, reason: "politics" });

    const failingFetch = async () => {
      throw new Error("Connection refused");
    };
    const errRes = await classifyItemsWithLlm(
      [{ id: "a1", title: "Test", domain: "ex.com", author: "" }],
      { provider: "openai_compatible", rulesPrompt: "No ads" },
      failingFetch
    );
    expect(errRes.verdicts).toEqual({});
    expect(errRes.error).toContain("Connection refused");
  });
});
