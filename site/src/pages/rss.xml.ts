import rss from "@astrojs/rss";
import { getCollection } from "astro:content";
import { sortEntries } from "@/utils/sortEntries";
import { entryUrl, toolkitReportUrl } from "@/utils/entryUrl";
import config from "@/config";

export async function GET() {
  const [cases, analyses, reports] = await Promise.all([
    getCollection("caseStudies"),
    getCollection("analysis"),
    getCollection("toolkitReports"),
  ]);

  const items = [
    ...sortEntries(cases).map(e => ({
      link: entryUrl("case-studies", e.id),
      title: e.data.title,
      description: e.data.description,
      pubDate: new Date(e.data.modDatetime ?? e.data.pubDatetime),
    })),
    ...sortEntries(analyses).map(e => ({
      link: entryUrl("analysis", e.id),
      title: e.data.title,
      description: e.data.description,
      pubDate: new Date(e.data.modDatetime ?? e.data.pubDatetime),
    })),
    ...sortEntries(reports).map(e => ({
      link: toolkitReportUrl(e.id),
      title: e.data.title,
      description: e.data.description,
      pubDate: new Date(e.data.pubDatetime),
    })),
  ]
    .sort((a, b) => b.pubDate.getTime() - a.pubDate.getTime())
    .slice(0, 20);

  return rss({
    title: config.site.title,
    description: config.site.description,
    site: config.site.url,
    items,
  });
}
