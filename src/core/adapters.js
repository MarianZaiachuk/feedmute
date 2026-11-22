import { normalizeDomain } from "./engine.js";

function simpleHash(input) {
  let hash = 5381;
  for (let i = 0; i < input.length; i += 1) {
    hash = ((hash << 5) + hash + input.charCodeAt(i)) | 0;
  }
  return (hash >>> 0).toString(36);
}

function resolveHref(href, baseOrigin) {
  if (!href) return "";
  try {
    return new URL(href, baseOrigin).toString();
  } catch {
    return href;
  }
}

export const ADAPTERS = [
  {
    id: "hackernews",
    name: "Hacker News",
    hosts: ["news.ycombinator.com"],
    itemSelector: "tr.athing",
    getTargets(el) {
      const subRow = el.nextElementSibling;
      const spacer = subRow?.nextElementSibling;
      const targets = [el];
      if (subRow && !subRow.classList.contains("athing")) {
        targets.push(subRow);
      }
      if (spacer && spacer.classList.contains("spacer")) {
        targets.push(spacer);
      }
      return targets;
    },
    getMountPoint(el) {
      const subRow = el.nextElementSibling;
      return subRow?.querySelector(".subline, .subtext") || el.querySelector(".titleline");
    },
    extract(el) {
      const link = el.querySelector(".titleline > a") || el.querySelector(".title a");
      const title = (link?.textContent || "").trim();
      if (!title) return null;

      const rawHref = link?.getAttribute("href") || "";
      const url = resolveHref(rawHref, "https://news.ycombinator.com/");
      const sitestr = el.querySelector(".sitestr")?.textContent?.trim() || "";
      const domain = normalizeDomain(sitestr || url);
      const subRow = el.nextElementSibling;
      const author = subRow?.querySelector(".hnuser")?.textContent?.trim() || "";
      const id = el.getAttribute("id")
        ? `hn:${el.getAttribute("id")}`
        : `hn:${simpleHash(title + url)}`;

      return { id, title, url, domain, author, snippet: "", siteId: "hackernews" };
    },
  },
  {
    id: "reddit",
    name: "Reddit",
    hosts: ["reddit.com", "www.reddit.com", "old.reddit.com", "sh.reddit.com"],
    itemSelector: "shreddit-post, div.thing.link",
    getTargets(el) {
      return [el];
    },
    getMountPoint(el) {
      if (el.tagName.toLowerCase() === "shreddit-post") {
        return el.querySelector('[slot="credit-bar"]') || el;
      }
      return el.querySelector("ul.flat-list.buttons") || el.querySelector("p.tagline") || el;
    },
    extract(el) {
      if (el.tagName.toLowerCase() === "shreddit-post") {
        const title =
          el.getAttribute("post-title") ||
          el.querySelector('[slot="title"]')?.textContent?.trim() ||
          "";
        if (!title) return null;
        const contentHref = el.getAttribute("content-href") || "";
        const permalink = el.getAttribute("permalink") || "";
        const url = resolveHref(contentHref || permalink, "https://www.reddit.com/");
        const domain = normalizeDomain(el.getAttribute("domain") || contentHref || url);
        const author = el.getAttribute("author") || "";
        const sub = el.getAttribute("subreddit-prefixed-name") || "";
        const postId = el.getAttribute("id") || simpleHash(title + permalink);
        return {
          id: `reddit:${postId}`,
          title: title.trim(),
          url,
          domain,
          author,
          snippet: sub,
          siteId: "reddit",
        };
      }

      const titleEl = el.querySelector("a.title");
      const title = (titleEl?.textContent || "").trim();
      if (!title) return null;
      const rawHref = titleEl?.getAttribute("href") || "";
      const url = resolveHref(rawHref, "https://old.reddit.com/");
      const domain = normalizeDomain(el.querySelector(".domain a")?.textContent || url);
      const author = el.querySelector("a.author")?.textContent?.trim() || "";
      const sub = el.getAttribute("data-subreddit-prefixed") || "";
      const postId = el.getAttribute("data-fullname") || simpleHash(title + url);
      return {
        id: `reddit:${postId}`,
        title,
        url,
        domain,
        author,
        snippet: sub,
        siteId: "reddit",
      };
    },
  },
  {
    id: "x",
    name: "X (Twitter)",
    hosts: ["x.com", "www.x.com", "twitter.com", "www.twitter.com"],
    itemSelector: 'article[data-testid="tweet"]',
    getTargets(el) {
      const cell = el.closest('[data-testid="cellInnerDiv"]');
      return [cell || el];
    },
    getMountPoint(el) {
      return el.querySelector('[data-testid="User-Name"]') || el;
    },
    extract(el) {
      const tweetText = (el.querySelector('[data-testid="tweetText"]')?.textContent || "").trim();
      const cardText = (el.querySelector('[data-testid="card.wrapper"]')?.textContent || "").trim();
      const title = tweetText || cardText;
      if (!title) return null;

      const userBlock = (el.querySelector('[data-testid="User-Name"]')?.textContent || "").trim();
      const handleMatch = userBlock.match(/@[A-Za-z0-9_]+/);
      const author = handleMatch ? handleMatch[0] : "";

      const statusLink = el.querySelector('a[href*="/status/"]')?.getAttribute("href") || "";
      const extLink =
        el.querySelector('[data-testid="card.wrapper"] a[href^="http"]')?.getAttribute("href") || "";
      const url = resolveHref(extLink || statusLink, "https://x.com/");
      const domain = extLink ? normalizeDomain(extLink) : "x.com";
      const id = statusLink ? `x:${statusLink}` : `x:${simpleHash(author + title)}`;

      return { id, title, url, domain, author, snippet: "", siteId: "x" };
    },
  },
  {
    id: "googlenews",
    name: "Google News",
    hosts: ["news.google.com"],
    itemSelector: "article",
    getTargets(el) {
      return [el];
    },
    getMountPoint(el) {
      return el;
    },
    extract(el) {
      const headlineLink =
        el.querySelector('h3 a, h4 a, a[href*="./read"], a[href*="./articles"]') ||
        Array.from(el.querySelectorAll("a")).find((a) => (a.textContent || "").trim().length > 15);
      const title = (headlineLink?.textContent || "").trim();
      if (!title) return null;

      const rawHref = headlineLink?.getAttribute("href") || "";
      const url = resolveHref(rawHref, "https://news.google.com/");
      const sourceText =
        (el.querySelector("[data-n-tid], .vr1PYe, .wEwyrc")?.textContent || "").trim();
      const domain = normalizeDomain(sourceText) || "news.google.com";
      const id = `gn:${simpleHash(title + rawHref)}`;

      return { id, title, url, domain, author: sourceText, snippet: "", siteId: "googlenews" };
    },
  },
  {
    id: "dou",
    name: "DOU.ua",
    hosts: ["dou.ua", "www.dou.ua"],
    itemSelector: "article.b-postcard",
    getTargets(el) {
      return [el];
    },
    getMountPoint(el) {
      return el.querySelector(".b-info") || el.querySelector("h2.title, .title") || el;
    },
    extract(el) {
      const link = el.querySelector("h2.title a, .title a");
      const title = (link?.textContent || "").trim();
      if (!title) return null;

      const url = resolveHref(link?.getAttribute("href") || "", "https://dou.ua/");
      const author = (el.querySelector(".b-info .author")?.textContent || "").trim();
      const snippet = (el.querySelector("p.b-typo")?.textContent || "").trim();
      const id = `dou:${simpleHash(url || title)}`;

      return { id, title, url, domain: "dou.ua", author, snippet, siteId: "dou" };
    },
  },
  {
    id: "pravda",
    name: "Українська правда",
    hosts: [
      "pravda.com.ua",
      "www.pravda.com.ua",
      "epravda.com.ua",
      "www.epravda.com.ua",
      "eurointegration.com.ua",
      "www.eurointegration.com.ua",
    ],
    itemSelector: ".article_news_list, .article_news, .article_news_bold, .article_main, article",
    getTargets(el) {
      return [el];
    },
    getMountPoint(el) {
      return el.querySelector(".article_header, .article_title") || el;
    },
    extract(el) {
      const link =
        el.querySelector(".article_header a, .article_title a, h2 a, h3 a") ||
        el.querySelector("a[href]");
      const title = (link?.textContent || "").trim();
      if (!title || title.length < 8) return null;

      const url = resolveHref(link?.getAttribute("href") || "", "https://www.pravda.com.ua/");
      const domain = normalizeDomain(url) || "pravda.com.ua";
      const snippet = (el.querySelector(".article_subheader")?.textContent || "").trim();
      const id = `up:${simpleHash(url || title)}`;

      return { id, title, url, domain, author: "", snippet, siteId: "pravda" };
    },
  },
  {
    id: "suspilne",
    name: "Суспільне Новини",
    hosts: ["suspilne.media", "www.suspilne.media"],
    itemSelector: "article.c-article-card, article.c-article-card-bgimage",
    getTargets(el) {
      return [el];
    },
    getMountPoint(el) {
      return el;
    },
    extract(el) {
      const link =
        el.querySelector("a.c-article-card__headline, h3 a, h2 a, a[href]") || null;
      const title = (link?.textContent || "").trim();
      if (!title || title.length < 8) return null;

      const url = resolveHref(link?.getAttribute("href") || "", "https://suspilne.media/");
      const id = `suspilne:${simpleHash(url || title)}`;

      return { id, title, url, domain: "suspilne.media", author: "", snippet: "", siteId: "suspilne" };
    },
  },
  {
    id: "tsn",
    name: "ТСН",
    hosts: ["tsn.ua", "www.tsn.ua"],
    itemSelector: "article.c-entry",
    getTargets(el) {
      return [el];
    },
    getMountPoint(el) {
      return el.querySelector(".c-entry__footer, .c-entry__body") || el;
    },
    extract(el) {
      const link = el.querySelector("a.c-card__link, h3 a, h2 a, a[href]");
      const title = (link?.textContent || "").trim();
      if (!title || title.length < 8) return null;

      const url = resolveHref(link?.getAttribute("href") || "", "https://tsn.ua/");
      const id = `tsn:${simpleHash(url || title)}`;

      return { id, title, url, domain: "tsn.ua", author: "", snippet: "", siteId: "tsn" };
    },
  },
];

export const SITE_LIST = ADAPTERS.map((a) => ({ id: a.id, name: a.name }));

export function getAdapterForHost(hostname) {
  const norm = normalizeDomain(hostname);
  if (!norm) return null;
  return ADAPTERS.find((adapter) =>
    adapter.hosts.some((h) => normalizeDomain(h) === norm)
  ) || null;
}

export function extractFeedItems(root, adapter) {
  if (!root || !adapter) return [];
  const elements = Array.from(root.querySelectorAll(adapter.itemSelector));
  const results = [];
  for (const el of elements) {
    const item = adapter.extract(el);
    if (item && item.title) {
      results.push({ el, item });
    }
  }
  return results;
}
