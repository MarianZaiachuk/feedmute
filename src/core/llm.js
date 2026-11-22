export const ALLOWED_LLM_ORIGINS = [
  "http://127.0.0.1/*",
  "http://localhost/*",
  "https://api.openai.com/*",
  "https://generativelanguage.googleapis.com/*",
  "https://openrouter.ai/*",
];

export function getLlmOriginPattern(llmConfig) {
  if (llmConfig?.provider === "gemini") {
    return "https://generativelanguage.googleapis.com/*";
  }
  const rawUrl = (llmConfig?.baseUrl || "").trim() || "http://127.0.0.1:1234/v1";
  try {
    const parsed = new URL(rawUrl);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return null;
    }
    if (!parsed.hostname) {
      return null;
    }
    return `${parsed.protocol}//${parsed.hostname.toLowerCase()}/*`;
  } catch {
    return null;
  }
}

export function isSupportedLlmOrigin(originPattern) {
  return Boolean(originPattern && ALLOWED_LLM_ORIGINS.includes(originPattern));
}

export function computeRulesHash(rulesPrompt) {
  const str = (rulesPrompt || "").trim();
  let hash = 2166136261;
  for (let i = 0; i < str.length; i += 1) {
    hash ^= str.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16);
}

export function parseLlmBatchResponse(rawText) {
  if (!rawText || typeof rawText !== "string") {
    return {};
  }

  let cleaned = rawText.trim();
  const fenceMatch = cleaned.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenceMatch) {
    cleaned = fenceMatch[1].trim();
  }

  const startIdx = cleaned.indexOf("[");
  const endIdx = cleaned.lastIndexOf("]");
  if (startIdx === -1 || endIdx === -1 || endIdx <= startIdx) {
    return {};
  }

  try {
    const arr = JSON.parse(cleaned.slice(startIdx, endIdx + 1));
    if (!Array.isArray(arr)) {
      return {};
    }
    const verdicts = {};
    for (const entry of arr) {
      if (entry && entry.id !== undefined) {
        verdicts[String(entry.id)] = {
          mute: Boolean(entry.mute),
          reason: typeof entry.reason === "string" ? entry.reason.trim().slice(0, 60) : "",
        };
      }
    }
    return verdicts;
  } catch {
    return {};
  }
}

function buildClassificationPrompt(items, rulesPrompt) {
  const compactItems = items.slice(0, 15).map((item) => ({
    id: String(item.id),
    title: String(item.title || "").slice(0, 200),
    domain: String(item.domain || ""),
    author: String(item.author || ""),
  }));

  return {
    system:
      "You classify news feed posts against user mute rules. " +
      "Return ONLY a JSON array of objects: [{\"id\":\"...\",\"mute\":true|false,\"reason\":\"short 2-5 words\"}]. " +
      "Be strict and concise. Only set mute=true if the item clearly matches the user's rules.",
    user: `User rules:\n${rulesPrompt.trim()}\n\nItems:\n${JSON.stringify(compactItems)}`,
  };
}

export async function classifyItemsWithLlm(items, llmConfig, fetchImpl = fetch) {
  const rulesPrompt = (llmConfig?.rulesPrompt || "").trim();
  if (!rulesPrompt || !Array.isArray(items) || items.length === 0) {
    return { verdicts: {}, error: null };
  }

  const batch = items.slice(0, 15);
  const { system, user } = buildClassificationPrompt(batch, rulesPrompt);
  const provider = llmConfig?.provider || "openai_compatible";
  const model = (llmConfig?.model || "local-model").trim();
  const apiKey = (llmConfig?.apiKey || "").trim();

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 25000);

  try {
    if (provider === "gemini") {
      if (!apiKey) {
        return { verdicts: {}, error: "Missing Gemini API key" };
      }
      const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`;
      const res = await fetchImpl(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: system }] },
          contents: [{ role: "user", parts: [{ text: user }] }],
          generationConfig: { temperature: 0.1 },
        }),
      });
      if (!res.ok) {
        return { verdicts: {}, error: `Gemini HTTP ${res.status}` };
      }
      const data = await res.json();
      const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || "";
      return { verdicts: parseLlmBatchResponse(text), error: null };
    }

    const baseUrl = (llmConfig?.baseUrl || "http://127.0.0.1:1234/v1").replace(/\/+$/, "");
    const headers = { "Content-Type": "application/json" };
    if (apiKey) {
      headers.Authorization = `Bearer ${apiKey}`;
    } else if (baseUrl.includes("127.0.0.1") || baseUrl.includes("localhost")) {
      headers.Authorization = "Bearer lm-studio";
    }

    const res = await fetchImpl(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers,
      signal: controller.signal,
      body: JSON.stringify({
        model,
        temperature: 0.1,
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
      }),
    });

    if (!res.ok) {
      return { verdicts: {}, error: `LLM HTTP ${res.status}` };
    }
    const data = await res.json();
    const text = data?.choices?.[0]?.message?.content || "";
    return { verdicts: parseLlmBatchResponse(text), error: null };
  } catch (err) {
    const msg = err?.name === "AbortError" ? "LLM request timed out" : err?.message || "LLM request failed";
    return { verdicts: {}, error: msg };
  } finally {
    clearTimeout(timer);
  }
}

export async function testLlmConnection(llmConfig, fetchImpl = fetch) {
  const provider = llmConfig?.provider || "openai_compatible";
  const model = (llmConfig?.model || "local-model").trim();
  const apiKey = (llmConfig?.apiKey || "").trim();

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8000);

  try {
    if (provider === "gemini") {
      if (!apiKey) {
        return { ok: false, message: "API key required for Gemini" };
      }
      const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`;
      const res = await fetchImpl(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          contents: [{ role: "user", parts: [{ text: "Reply with OK" }] }],
          generationConfig: { maxOutputTokens: 5 },
        }),
      });
      return res.ok
        ? { ok: true, message: `Gemini OK (${model})` }
        : { ok: false, message: `HTTP ${res.status}` };
    }

    const baseUrl = (llmConfig?.baseUrl || "http://127.0.0.1:1234/v1").replace(/\/+$/, "");
    const headers = {};
    if (apiKey) {
      headers.Authorization = `Bearer ${apiKey}`;
    }
    const res = await fetchImpl(`${baseUrl}/models`, {
      method: "GET",
      headers,
      signal: controller.signal,
    });
    if (!res.ok) {
      return { ok: false, message: `HTTP ${res.status}` };
    }
    const data = await res.json().catch(() => ({}));
    const count = Array.isArray(data?.data) ? data.data.length : 0;
    return { ok: true, message: count > 0 ? `Connected (${count} model(s))` : "Connected" };
  } catch (err) {
    return {
      ok: false,
      message: err?.name === "AbortError" ? "Connection timed out" : err?.message || "Connection failed",
    };
  } finally {
    clearTimeout(timer);
  }
}
