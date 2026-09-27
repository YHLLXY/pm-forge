import type { Metadata } from "next";
// 字体用 geist npm 包（本地文件）：next/font/google 在国内拉不到 Google Fonts，会让 build 直接失败
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import "./globals.css";

export const metadata: Metadata = {
  title: "PM Forge · AI 产品工具箱",
  description:
    "把产品经理的方法论变成可运行的流水线：竞品分析、用户反馈洞察、PRD 草稿，产出带证据链标注的报告。",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body
        className={`${GeistSans.variable} ${GeistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
