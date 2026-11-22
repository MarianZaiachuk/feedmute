import { describe, expect, it } from "vitest";
import { extractFeedItems, getAdapterForHost } from "../src/core/adapters.js";

describe("site adapters", () => {
  it("extracts Hacker News story row + subtext + spacer targets", () => {
    document.body.innerHTML = `
      <table><tbody>
        <tr class="athing" id="42001">
          <td class="title"><span class="titleline"><a href="https://sqlite.org/wal2">SQLite WAL2</a> (<span class="sitestr">sqlite.org</span>)</span></td>
        </tr>
        <tr><td class="subtext"><span class="subline"><a class="hnuser">drh</a></span></td></tr>
        <tr class="spacer"></tr>
      </tbody></table>
    `;
    const adapter = getAdapterForHost("news.ycombinator.com");
    const items = extractFeedItems(document, adapter);
    expect(items).toHaveLength(1);
    expect(items[0].item).toMatchObject({
      id: "hn:42001",
      title: "SQLite WAL2",
      domain: "sqlite.org",
      author: "drh",
      siteId: "hackernews",
    });
    expect(adapter.getTargets(items[0].el)).toHaveLength(3);
  });

  it("extracts modern Reddit shreddit-post and old.reddit.com posts", () => {
    document.body.innerHTML = `
      <shreddit-post id="t3_abc" post-title="Postgres tuning guide" content-href="https://pg.org/guide" domain="pg.org" author="dba_user" subreddit-prefixed-name="r/PostgreSQL">
        <div slot="credit-bar"></div>
      </shreddit-post>
      <div class="thing link" data-fullname="t3_old" data-subreddit-prefixed="r/linux">
        <a class="title" href="https://lwn.net/Articles/1">Kernel 6.14 notes</a>
        <span class="domain">(<a href="#">lwn.net</a>)</span>
        <a class="author">torvalds</a>
      </div>
    `;
    const adapter = getAdapterForHost("www.reddit.com");
    const items = extractFeedItems(document, adapter);
    expect(items).toHaveLength(2);
    expect(items[0].item).toMatchObject({
      id: "reddit:t3_abc",
      title: "Postgres tuning guide",
      domain: "pg.org",
      author: "dba_user",
    });
    expect(items[1].item).toMatchObject({
      id: "reddit:t3_old",
      title: "Kernel 6.14 notes",
      domain: "lwn.net",
    });
  });

  it("extracts X tweets and external card links", () => {
    document.body.innerHTML = `
      <div data-testid="cellInnerDiv">
        <article data-testid="tweet">
          <div data-testid="User-Name">Alice @alice_dev</div>
          <div data-testid="tweetText">Minimalist Canvas renderer released</div>
          <a href="/alice_dev/status/999">1h</a>
          <div data-testid="card.wrapper"><a href="https://nytimes.com/tech">Article</a></div>
        </article>
      </div>
    `;
    const adapter = getAdapterForHost("x.com");
    const items = extractFeedItems(document, adapter);
    expect(items).toHaveLength(1);
    expect(items[0].item).toMatchObject({
      id: "x:/alice_dev/status/999",
      title: "Minimalist Canvas renderer released",
      domain: "nytimes.com",
      author: "@alice_dev",
    });
    expect(adapter.getTargets(items[0].el)[0].getAttribute("data-testid")).toBe("cellInnerDiv");
  });

  it("extracts DOU, TSN, Suspilne, and Ukrainska Pravda articles", () => {
    document.body.innerHTML = `
      <article class="b-postcard">
        <h2 class="title"><a href="https://dou.ua/lenta/news/test/">Мінцифри про кіберфахівців</a></h2>
        <div class="b-info"><a class="author">Редакція</a></div>
      </article>
    `;
    const douItems = extractFeedItems(document, getAdapterForHost("dou.ua"));
    expect(douItems[0].item).toMatchObject({
      title: "Мінцифри про кіберфахівців",
      domain: "dou.ua",
      siteId: "dou",
    });

    document.body.innerHTML = `
      <article class="c-entry">
        <h3><a class="c-card__link" href="https://tsn.ua/news/1">Офіційний курс НБУ на понеділок</a></h3>
      </article>
    `;
    const tsnItems = extractFeedItems(document, getAdapterForHost("tsn.ua"));
    expect(tsnItems[0].item).toMatchObject({
      title: "Офіційний курс НБУ на понеділок",
      domain: "tsn.ua",
      siteId: "tsn",
    });

    document.body.innerHTML = `
      <article class="c-article-card">
        <a class="c-article-card__headline" href="https://suspilne.media/123">У Львові відкрили нове відділення</a>
      </article>
    `;
    const suspilneItems = extractFeedItems(document, getAdapterForHost("suspilne.media"));
    expect(suspilneItems[0].item).toMatchObject({
      title: "У Львові відкрили нове відділення",
      domain: "suspilne.media",
      siteId: "suspilne",
    });

    document.body.innerHTML = `
      <div class="article_news_list">
        <div class="article_header"><a href="https://www.pravda.com.ua/news/1/">Оновлені графіки відключень</a></div>
      </div>
    `;
    const upItems = extractFeedItems(document, getAdapterForHost("www.pravda.com.ua"));
    expect(upItems[0].item).toMatchObject({
      title: "Оновлені графіки відключень",
      domain: "pravda.com.ua",
      siteId: "pravda",
    });
  });
});
