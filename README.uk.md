[English](README.md)

# FeedMute

Двомовне (UA/EN) розширення для Chrome (Manifest V3) та інтерактивне вебдемо, яке додає кнопку «Mute» до стрічок новин. Приховує небажані теми, домени, paywall-сайти, клікбейт, AI-слоп та вже переглянуті пости локально без власного сервера.

**Онлайн-демо:** [marianzaiachuk.github.io/feedmute](https://marianzaiachuk.github.io/feedmute/)

## Підтримувані сайти

- Hacker News (`news.ycombinator.com`)
- Reddit (`reddit.com`, `old.reddit.com`)
- X (`x.com`, `twitter.com`)
- Google News (`news.google.com`)
- DOU (`dou.ua`)
- Українська правда (`pravda.com.ua`, `epravda.com.ua`, `eurointegration.com.ua`)
- Суспільне Новини (`suspilne.media`)
- ТСН (`tsn.ua`)

## Можливості

- Вбудована кнопка `Заглушити` біля кожного поста: сховати пост, замутити домен або додати ключове слово
- Режим згортання в компактний рядок із причиною та кнопкою `Показати` або повне приховування
- Вбудований список paywall-доменів (міжнародні та українські медіа) + власний список
- Локальні евристики для клікбейту й AI-слопу (українською та англійською)
- Фільтрація за ключовими словами, доменами/піддоменами та regex
- Приховування вже переглянутих постів (`IntersectionObserver`)
- Опціональний фільтр звичайною мовою через локальну LLM (LM Studio / Ollama) або власний API-ключ (OpenAI / Gemini) із кешуванням результатів
- Експорт/імпорт налаштувань у JSON та швидкий перемикач мови `EN / UA`

## Збірка та встановлення розширення

```bash
npm install
npm test
npm run build
```

Щоб встановити розширення в Chrome / Edge / Brave:

1. Відкрийте `chrome://extensions`
2. Увімкніть **Режим розробника** (**Developer mode**)
3. Натисніть **Завантажити розпаковане** (**Load unpacked**) і виберіть папку `dist/extension`

## Запуск вебдемо

```bash
npm run dev
```

Статична збірка вебдемо зберігається в `dist/demo` (`npm run build:demo`).

## Ліцензія

[MIT](LICENSE)
