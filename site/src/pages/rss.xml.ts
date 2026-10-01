import rss from "@astrojs/rss";
import { getCollection, render, type CollectionEntry } from "astro:content";
import { experimental_AstroContainer as AstroContainer } from "astro/container";
import { sortEntries } from "@/utils/sortEntries";
import { entryUrl, toolkitReportUrl } from "@/utils/entryUrl";
import config from "@/config";

type Entry = CollectionEntry<"caseStudies"> | CollectionEntry<"analysis"> | CollectionEntry<"toolkitReports">;

// 全文 RSS（二期 E3）：容器 API 把条目渲染成 HTML 塞进 content:encoded。
// 正文里的根相对链接（src/href="/..."）改写为绝对 URL，否则阅读器内断链。
function absolutize(html: string, siteUrl: string): string {
  return html.replace(
    /(\s(?:src|href))="\/([^"]*)"/g,
    (_m, attr: string, path: string) => `${attr}="${siteUrl}/${path}"`,
  );
}

async function fullContent(container: Awaited<ReturnType<typeof AstroContainer.create>>, entry: Entry): Promise<string> {
  const { Content } = await render(entry);
  return absolutize(await container.renderToString(Content), config.site.url.replace(/\/$/, ""));
}

export async function GET() {
  const container = await AstroContainer.create();
  const [cases, analyses, reports] = await Promise.all([
    getCollection("caseStudies"),
    getCollection("analysis"),
    getCollection("toolkitReports"),
  ]);

  const items = [
    ...(await Promise.all(
      sortEntries(cases).map(async e => ({
        link: entryUrl("case-studies", e.id),
        title: e.data.title,
        description: e.data.description,
        pubDate: new Date(e.data.modDatetime ?? e.data.pubDatetime),
        content: await fullContent(container, e),
      })),
    )),
    ...(await Promise.all(
      sortEntries(analyses).map(async e => ({
        link: entryUrl("analysis", e.id),
        title: e.data.title,
        description: e.data.description,
        pubDate: new Date(e.data.modDatetime ?? e.data.pubDatetime),
        content: await fullContent(container, e),
      })),
    )),
    ...(await Promise.all(
      sortEntries(reports).map(async e => ({
        link: toolkitReportUrl(e.id),
        title: e.data.title,
        description: e.data.description,
        pubDate: new Date(e.data.pubDatetime),
        content: await fullContent(container, e),
      })),
    )),
  ]
    .sort((a, b) => b.pubDate.getTime() - a.pubDate.getTime())
    .slice(0, 20);

  return rss({
    title: config.site.title,
    description: config.site.description,
    site: config.site.url,
    items,
    customData: "<language>zh-cn</language>",
  });
}
