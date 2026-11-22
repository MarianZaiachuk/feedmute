# Privacy Policy

FeedMute runs locally in your browser. It has no backend server and does not collect, sell, or share analytics, telemetry, browsing history, or personal data.

## Local Storage

All extension state is saved on your device using `chrome.storage.local`:

- Filter rules and preferences (`settings`: keywords, muted domains, custom paywall domains, regex rules, disabled sites, UI language, and optional LLM configuration).
- Muted and seen post IDs (`mutedItemIds`, `seenIds` capped at the latest 1,500 entries when `Hide seen` is enabled).
- LLM verdict cache (`llmCache`, capped at 600 entries).

You can clear seen/muted IDs or export/import settings from the Options page at any time, or remove all data by uninstalling the extension.

## Optional LLM Filtering

Plain-language LLM filtering is off by default. If you choose to enable it, FeedMute sends only:

- Your filter rules prompt
- Post `id`, `title` (first 200 characters), `domain`, and `author`

These requests go directly from your browser to the endpoint you configured (a local server on `localhost` / `127.0.0.1`, or `api.openai.com`, `openrouter.ai`, `generativelanguage.googleapis.com` using your own API key). No third-party proxy is involved.

## Permissions

- `storage`: saves your rules, seen history, muted IDs, and LLM cache locally.
- `activeTab`: reads the current tab's hostname only when you open the popup so you can see muted counts and pause filtering on that site.
- Site access for supported feeds (`news.ycombinator.com`, `reddit.com`, `x.com` / `twitter.com`, `news.google.com`, `dou.ua`, `pravda.com.ua`, `suspilne.media`, `tsn.ua`): injects the inline `Mute` controls and applies your local filters on those pages.
- Optional host permissions (`http://127.0.0.1/*`, `http://localhost/*`, `https://api.openai.com/*`, `https://generativelanguage.googleapis.com/*`, `https://openrouter.ai/*`): requested at runtime only when you enable or test LLM filtering.

## Contact

Questions or issues can be reported at [github.com/MarianZaiachuk/feedmute/issues](https://github.com/MarianZaiachuk/feedmute/issues).
