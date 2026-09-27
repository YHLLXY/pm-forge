"use client";

import { useRef, useState } from "react";
import { Field } from "./field";
import { feedbackInputSchema } from "@/tools/schemas";

export function FeedbackForm({
  onSubmit,
  disabled,
}: {
  onSubmit(input: unknown): void;
  disabled?: boolean;
}) {
  const [productContext, setProductContext] = useState("");
  const [text, setText] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const fileRef = useRef<HTMLInputElement>(null);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const feedbacks = text
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean);
    const parsed = feedbackInputSchema.safeParse({ productContext, feedbacks });
    if (!parsed.success) {
      const map: Record<string, string> = {};
      for (const issue of parsed.error.issues) map[issue.path.join(".")] = issue.message;
      setErrors(map);
      return;
    }
    setErrors({});
    onSubmit(parsed.data);
  }

  async function handleFile(file: File) {
    const content = await file.text();
    if (content.includes("\uFFFD")) {
      setErrors({
        file:
          "文件不是 UTF-8 编码（Excel 导出的 CSV 常见）。请用记事本打开，另存为 UTF-8 后重试；或直接复制内容粘贴到文本框。",
      });
      return;
    }
    setErrors({});
    setText(content.split(/\r?\n/).map((l) => l.trim()).filter(Boolean).join("\n"));
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <Field label="产品背景（选填）" htmlFor="productContext" hint="一句话说明产品是什么，能让聚类更准">
        <input
          id="productContext"
          value={productContext}
          onChange={(e) => setProductContext(e.target.value)}
          className="w-full rounded border p-2"
        />
      </Field>
      <Field
        label="反馈列表"
        htmlFor="feedbacks"
        error={errors["feedbacks"]}
        hint="每行一条；至少 5 条、最多 200 条。从表格粘贴时请先删掉与内容无关的列"
      >
        <textarea
          id="feedbacks"
          value={text}
          onChange={(e) => setText(e.target.value)}
          className="min-h-56 w-full rounded border p-2 font-mono text-sm"
        />
      </Field>
      <Field label="从 CSV/TXT 导入" htmlFor="file" error={errors["file"]} hint="仅支持 UTF-8 编码，整文件按行导入">
        <input
          id="file"
          ref={fileRef}
          type="file"
          accept=".csv,.txt"
          className="text-sm"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void handleFile(f);
          }}
        />
      </Field>
      <button
        type="submit"
        disabled={disabled}
        className="rounded bg-blue-600 px-4 py-2 font-medium text-white disabled:opacity-50"
      >
        开始分析
      </button>
    </form>
  );
}
