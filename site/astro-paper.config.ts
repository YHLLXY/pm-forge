import { defineAstroPaperConfig } from "./src/types/config";

export default defineAstroPaperConfig({
  site: {
    url: "https://yuhailinlxy.com",
    title: "余翰林 · 产品作品集",
    description:
      "数据驱动的产品候选人余翰林：产品案例研究、数据分析报告与自研 AI PM 工具箱，每个结论都有证据链。",
    author: "余翰林",
    profile: "https://github.com/YHLLXY",
    ogImage: "default-og.jpg",
    lang: "zh-CN",
    timezone: "Asia/Shanghai",
    dir: "ltr",
  },
  features: {
    lightAndDarkMode: true,
    dynamicOgImage: false,
    showArchives: false,
    showBackButton: true,
    editPost: { enabled: false },
    search: false,
  },
  socials: [{ name: "github", url: "https://github.com/YHLLXY" }],
  shareLinks: [],
});
