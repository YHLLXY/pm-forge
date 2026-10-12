// site/scripts/og/tokens.mjs
// 色值**逐条抄自** site/src/styles/theme.css（浅色档），不要用任何文档里的转述值。
// satori 不解析 CSS 变量，所以这里必须是字面量。
export const T = {
  background: "#fbfaf8",
  foreground: "#1c1b1a",
  accent: "#0b6bcb",
  muted: "#f0ede8",
  "muted-foreground": "#6b655c",
  border: "#e6e2db",
  "surface-1": "#ffffff",
  "surface-2": "#f5f2ed",
  warm: "#a24d05",
  "section-case": "#0b5fa5",
  "section-analysis": "#0f6b73",
  "section-dissection": "#4f46b8",
  "section-story": "#a24d05",
  "section-toolbox": "#2a6b45",
};

// 注：Cover.astro 的纸面点阵在 satori 里**用不了**——两种写法都实测报错：
//   data: URI → 'Image source must be an absolute URL'；file:// 绝对 URL → 同样在 satori 渲染期抛错。
// 所以 OG 卡用纯净的 surface-2 底 + 板块色竖条，不再假装有纸纹。

