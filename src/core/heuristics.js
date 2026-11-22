const CLICKBAIT_PATTERNS = [
  /you won['’]?t believe/i,
  /here['’]?s why/i,
  /this one trick/i,
  /mind[- ]?blowing/i,
  /shocking truth/i,
  /what happened next/i,
  /number \d+ will/i,
  /ви не повірите/i,
  /шок[!?: ]/i,
  /^шок\b/i,
  /терміново[!?: ]/i,
  /^сенсація\b/i,
  /розкрито правду/i,
  /ось чому/i,
  /що сталося далі/i,
  /про це мовчать/i,
];

const AI_SLOP_PATTERNS = [
  /\bdelve into\b/i,
  /\bin today['’]?s fast[- ]paced\b/i,
  /\bgame[- ]?changer\b/i,
  /\brevolutionize the way\b/i,
  /\bunleash the power\b/i,
  /\bit['’]?s not just\b.{2,50}\bit['’]?s\b/i,
  /\btapestry of\b/i,
  /\bcomprehensive guide to\b/i,
  /у сучасному швидкоплинному світі/i,
  /революціонізує/i,
  /розкрийте потенціал/i,
  /ключ до успіху/i,
];

export function detectClickbaitOrSlop(title, snippet = "") {
  const combined = `${title || ""} ${snippet || ""}`.trim();
  if (!combined) {
    return { matched: false, label: null };
  }

  for (const pattern of CLICKBAIT_PATTERNS) {
    if (pattern.test(combined)) {
      return { matched: true, label: "clickbait" };
    }
  }

  for (const pattern of AI_SLOP_PATTERNS) {
    if (pattern.test(combined)) {
      return { matched: true, label: "ai_slop" };
    }
  }

  return { matched: false, label: null };
}

const TOPIC_INTENTS = [
  {
    id: "ai",
    ruleMatcher: /\b(ai|llm|gpt|chatgpt|claude|gemini|slop|нейромереж|штучн|ші|слоп)\b/i,
    textMatcher: /\b(ai|llm|gpt|chatgpt|agentic|prompt|openai|anthropic|штучн|нейромереж|ші)\b/i,
    reasonEn: "AI / LLM topic",
    reasonUk: "Тема AI / LLM",
  },
  {
    id: "crypto",
    ruleMatcher: /\b(crypto|bitcoin|btc|web3|nft|blockchain|крипт|біткоїн|блокчейн)\b/i,
    textMatcher: /\b(crypto|bitcoin|btc|eth|web3|token|airdrop|memecoin|крипт|біткоїн|токен)\b/i,
    reasonEn: "Crypto / Web3 topic",
    reasonUk: "Крипта / Web3",
  },
  {
    id: "politics",
    ruleMatcher: /\b(politic|election|senate|congress|політик|вибор|парламент|депутат)\b/i,
    textMatcher: /\b(election|senate|congress|parliament|tariff|campaign|вибор|парламент|депутат|політик|коаліці)\b/i,
    reasonEn: "Politics",
    reasonUk: "Політика",
  },
  {
    id: "ads",
    ruleMatcher: /\b(ad|ads|promo|sponsor|advert|реклам|промо|партнерськ|спонсор|джинс)\b/i,
    textMatcher: /\b(sponsored|promoted|partner post|discount|promo code|use code|реклам|промокод|партнерський матеріал|знижк)\b/i,
    reasonEn: "Promo / Sponsored",
    reasonUk: "Реклама / промо",
  },
  {
    id: "clickbait_slop",
    ruleMatcher: /\b(clickbait|slop|engagement|bait|клікбейт|слоп|жовт)\b/i,
    textMatcher: /\b(unpopular opinion|hot take|thread 🧵|10x|secret trick|сенсац|шок|не повірите)\b/i,
    reasonEn: "Clickbait / Engagement bait",
    reasonUk: "Клікбейт / байт",
  },
  {
    id: "sports",
    ruleMatcher: /\b(sport|football|soccer|betting|спорт|футбол|ставк)\b/i,
    textMatcher: /\b(champions league|premier league|transfer|betting|ліга чемпіонів|футбол|букмекер)\b/i,
    reasonEn: "Sports / Betting",
    reasonUk: "Спорт / ставки",
  },
  {
    id: "drama",
    ruleMatcher: /\b(drama|gossip|celebrity|скандал|шоу[- ]?біз|плітк)\b/i,
    textMatcher: /\b(scandal|celebrity|breakup|feud|скандал|зірк|розлучил)\b/i,
    reasonEn: "Celebrity / Drama",
    reasonUk: "Скандали / шоу-біз",
  },
];

export function evaluateNaturalRulesFallback(item, naturalRulesText, lang = "en") {
  const prompt = (naturalRulesText || "").trim();
  if (!prompt) {
    return null;
  }

  const content = `${item.title || ""} ${item.snippet || ""} ${item.author || ""} ${item.domain || ""}`;

  for (const intent of TOPIC_INTENTS) {
    if (intent.ruleMatcher.test(prompt) && intent.textMatcher.test(content)) {
      return {
        mute: true,
        reason: lang === "uk" ? intent.reasonUk : intent.reasonEn,
      };
    }
  }

  // Fallback for explicit literal words >= 4 chars inside custom prompt
  const stopWords = new Set([
    "hide", "mute", "block", "posts", "about", "with", "from", "that", "this",
    "articles", "news", "ховай", "приховуй", "пости", "новини", "про", "всі", "без",
  ]);
  const tokens = prompt
    .toLowerCase()
    .split(/[^\p{L}\p{N}_-]+/u)
    .filter((tok) => tok.length >= 4 && !stopWords.has(tok));

  const lowerContent = content.toLowerCase();
  for (const token of tokens) {
    if (lowerContent.includes(token)) {
      return {
        mute: true,
        reason: token,
      };
    }
  }

  return null;
}
