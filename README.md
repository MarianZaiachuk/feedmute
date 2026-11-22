[Українською](README.uk.md)

# FeedMute

Bilingual (EN/UA) Chrome Manifest V3 extension and interactive web demo that adds a mute button to news feeds. Filter out unwanted topics, domains, paywalled articles, clickbait, AI slop, and already-seen posts locally with zero backend required.

**Live demo:** [marianzaiachuk.github.io/feedmute](https://marianzaiachuk.github.io/feedmute/)

## Supported Sites

- Hacker News (`news.ycombinator.com`)
- Reddit (`reddit.com`, `old.reddit.com`)
- X (`x.com`, `twitter.com`)
- Google News (`news.google.com`)
- DOU.ua (`dou.ua`)
- Ukrainska Pravda (`pravda.com.ua`, `epravda.com.ua`, `eurointegration.com.ua`)
- Suspilne (`suspilne.media`)
- TSN (`tsn.ua`)

## Features

- Inline `Mute` menu on each feed item: hide the post, mute its domain, or add a keyword immediately
- Soft collapse bar with mute reason and a one-click `Show` button (or full `display: none` hide mode)
- Built-in paywall domain list (international + Ukrainian outlets) and custom paywall domains
- Zero-latency EN/UA clickbait and AI-slop phrase heuristics
- Keyword, domain/subdomain, and regex filtering
- `Hide seen` mode using `IntersectionObserver`
- Optional plain-language filtering via local LLM (LM Studio / Ollama OpenAI-compatible API) or BYOK cloud endpoint (OpenAI / Gemini) with response caching
- JSON settings export/import and instant EN/UA language toggle

## Build & Load Extension

```bash
npm install
npm test
npm run build
```

Load the unpacked extension in Chrome / Edge / Brave:

1. Open `chrome://extensions`
2. Enable **Developer mode**
3. Click **Load unpacked** and select `dist/extension`

## Run Interactive Web Demo

```bash
npm run dev
```

Built static output goes to `dist/demo` (`npm run build:demo`).

## Privacy

FeedMute runs locally with zero telemetry. See [PRIVACY.md](PRIVACY.md) for details on local storage, permissions, and optional LLM requests.

## License

[MIT](LICENSE)
