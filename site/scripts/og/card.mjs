// site/scripts/og/card.mjs —— 单张 OG 卡的 satori 元素树（1200×630）
// 布局刻意对齐 Cover.astro 的 banner 变体：左侧板块色竖条 + 纸面点阵 + kicker/日期 + 大标题 + 副标题 + facts。
import { T } from "./tokens.mjs";

const h = (type, style, children) => ({ type, props: { style, children } });

// 与 Cover.astro 完全同逻辑：中文按 1em、拉丁按 0.56em 估宽
const isCJK = ch => /[\u3000-\u9fff\uff00-\uffef]/.test(ch);
const widthOf = ch => (isCJK(ch) ? 1 : 0.56);

export function clip(text, maxEm) {
  let em = 0;
  let out = "";
  for (const ch of String(text ?? "")) {
    const w = widthOf(ch);
    if (em + w > maxEm) return out + "…";
    em += w;
    out += ch;
  }
  return out;
}

export function fitSize(text, maxWidth, max, min) {
  let em = 0;
  for (const ch of String(text ?? "")) em += widthOf(ch);
  if (em === 0) return max;
  return Math.max(min, Math.min(max, Math.floor(maxWidth / em)));
}

// 目录 → 集合口径（与四个 [slug] 详情页的 EntryHeader 取值一一对应）
export const COLLECTIONS = {
  "case-studies": { section: "case", kicker: "CASE STUDY" },
  analysis: { section: "analysis", kicker: "DATA ANALYSIS" },
  dissections: { section: "dissection", kicker: "AI TEARDOWN" },
  "toolkit-reports": { section: "toolbox", kicker: "TOOL REPORT" },
};

/** 从 frontmatter 推出卡片数据（唯一口径；生成器与门禁共用，保证陈旧检测与产物同源） */
export function deriveCardData(dir, fm) {
  const meta = COLLECTIONS[dir];
  if (!meta) throw new Error("未知集合目录：" + dir);
  const sec = meta.section;
  const m = fm.metrics ?? [];
  let headline, subline, facts;
  if (sec === "case") {
    headline = m[0]?.value ?? "产品案例";
    subline = m[0]?.label ?? "案例研究";
    facts = m.slice(1, 4).map(x => ({ value: String(x.value), label: String(x.label) }));
  } else if (sec === "analysis") {
    headline = String(fm.dataset ?? "数据分析");
    subline = "数据分析报告";
    facts = [];
  } else if (sec === "dissection") {
    const claims = fm.claims ?? {};
    const v = claims.verdicts ?? {};
    headline = String(claims.recordCount ?? "");
    subline = "条实测任务";
    facts = [
      { value: String(v["成功"] ?? 0), label: "成功" },
      { value: String(v["部分"] ?? 0), label: "部分" },
      { value: String(v["失败"] ?? 0), label: "失败" },
    ];
  } else {
    headline = String(fm.toolName ?? "工具箱报告");
    subline = String(fm.generatedBy ?? "");
    facts = fm.promptVersion ? [{ value: String(fm.promptVersion), label: "提示词版本" }] : [];
  }
  return {
    section: sec,
    kicker: meta.kicker,
    headline,
    subline,
    title: String(fm.title ?? ""),
    description: String(fm.description ?? ""),
    dateText: String(fm.pubDatetime ?? "").slice(0, 10),
    facts,
    domain: "yuhailinlxy.com",
  };
}

/** 陈旧检测用的内容指纹：卡片上渲染的每一个字段都进哈希 */
export function entryHash(d) {
  return [d.section, d.kicker, d.title, d.description, d.dateText, d.headline, d.subline, JSON.stringify(d.facts)]
    .join("|")
    .replace(/\s+/g, " ");
}

/**
 * 卡片上会出现的一切字符串（用于字体子集）。
 * **必须先 sanitize 再入集**：否则 `->` 里的 `>` 是运行时才出现的字符，字体子集里没有它，
 * 就会渲染成一个空白缺口（这个坑实测踩过两次）。`…` 同理——它是 clip() 在运行时追加的。
 */
export function collectTexts(d) {
  const raw = [d.kicker, d.dateText, d.title, d.description, d.domain, d.headline, d.subline, ...d.facts.flatMap(f => [f.value, f.label])].join("");
  return sanitize(raw) + "…";
}

// 布局常量（buildCard 与 estimateWidth 共用同一套，避免估宽和实际渲染脱钩）
const L = {
  padY: 64,
  padX: 80,
  barW: 14,
  titleMaxWidth: 1000,
  titleMax: 72,
  titleMin: 40,
  headlineValue: 38,
  headlineLabel: 20,
  factValue: 28,
  factLabel: 18,
  domain: 20,
  gap: 48,
  factMaxEm: 9,
};

// satori 的字体是整份 Noto Sans SC；实测 U+2192（→）在子集里没有字形，会渲染成一个空白缺口。
// 宁可换成 ASCII 箭头，也不要留一个看起来像排版错误的洞。
const SANITIZE = [[/\u2192/g, "->"]];
function sanitize(text) {
  let out = String(text ?? "");
  for (const [re, to] of SANITIZE) out = out.replace(re, to);
  return out;
}

const emWidth = text => {
  let em = 0;
  for (const ch of String(text ?? "")) em += widthOf(ch);
  return em;
};

/** 底排（headline + facts + 域名）的估算宽度，用于生成期打印利用率、避免出框 */
export function estimateWidth(d) {
  const facts = d.facts.slice(0, 3).map(f => ({ value: sanitize(clip(f.value, L.factMaxEm)), label: sanitize(f.label) }));
  const head = sanitize(clip(d.headline, 10));
  let w = emWidth(head) * L.headlineValue;
  for (const f of facts) w += L.gap + Math.max(emWidth(f.value) * L.factValue, emWidth(f.label) * L.factLabel);
  const domain = emWidth(d.domain) * L.domain;
  const available = 1200 - L.barW - L.padX * 2;
  return { used: w, available, domain, total: w + L.gap + domain };
}

export function buildCard(d) {
  const accent = T["section-" + d.section];
  const titleText = sanitize(clip(d.title, 28));
  const titleSize = fitSize(titleText, L.titleMaxWidth, L.titleMax, L.titleMin);
  const facts = d.facts.slice(0, 3).map(f => ({
    value: sanitize(clip(f.value, L.factMaxEm)),
    label: sanitize(clip(f.label, 8)),
  }));

  const stat = (value, label, valueSize, labelSize, color) =>
    h("div", { display: "flex", flexDirection: "column" }, [
      h("div", { fontSize: valueSize + "px", fontWeight: 700, color, lineHeight: 1.1 }, value),
      h("div", { fontSize: labelSize + "px", color: T["muted-foreground"], marginTop: "8px" }, label),
    ]);

  // 底排 = 封面头条（accnet 色，与站点封面的 headline 同义）+ 各 facts + 域名
  const stats = [];
  if (d.headline)
    stats.push(
      stat(sanitize(clip(d.headline, 10)), sanitize(clip(d.subline, 10)), L.headlineValue, L.headlineLabel, accent)
    );
  for (const f of facts) stats.push(stat(f.value, f.label, L.factValue, L.factLabel, T.foreground));

  return h(
    "div",
    {
      width: "1200px",
      height: "630px",
      display: "flex",
      backgroundColor: T["surface-2"],
      fontFamily: "Noto Sans SC",
    },
    [
      h("div", { width: L.barW + "px", height: "630px", backgroundColor: accent }, ""),
      h(
        "div",
        {
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          flex: 1,
          padding: L.padY + "px " + L.padX + "px",
        },
        [
          h("div", { display: "flex", flexDirection: "column" }, [
            h("div", { display: "flex", alignItems: "flex-start", justifyContent: "space-between" }, [
              h("div", { display: "flex", flexDirection: "column" }, [
                h("div", { fontSize: "24px", letterSpacing: "6px", fontWeight: 700, color: accent }, sanitize(d.kicker)),
                h("div", { width: "96px", height: "3px", backgroundColor: accent, marginTop: "14px" }, ""),
              ]),
              h("div", { fontSize: "24px", color: T["muted-foreground"] }, sanitize(d.dateText)),
            ]),
            h("div", { fontSize: titleSize + "px", fontWeight: 700, color: T.foreground, lineHeight: 1.2, marginTop: "44px" }, titleText),
            h("div", { fontSize: "26px", color: T["muted-foreground"], lineHeight: 1.55, marginTop: "20px" }, sanitize(clip(d.description, 76))),
          ]),
          h("div", { display: "flex", alignItems: "flex-end", justifyContent: "space-between" }, [
            h("div", { display: "flex", gap: L.gap + "px" }, stats),
            h("div", { fontSize: L.domain + "px", color: T["muted-foreground"] }, d.domain),
          ]),
        ]
      ),
    ]
  );
}
