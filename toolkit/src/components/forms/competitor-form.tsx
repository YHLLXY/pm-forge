"use client";

import { useState } from "react";
import { Field } from "./field";
import { competitorInputSchema, type CompetitorInput } from "@/tools/schemas";

export function CompetitorForm({
  onSubmit,
  disabled,
}: {
  onSubmit(input: unknown): void;
  disabled?: boolean;
}) {
  const [purpose, setPurpose] = useState("");
  const [myProduct, setMyProduct] = useState("");
  const [competitors, setCompetitors] = useState([{ name: "", notes: "" }]);
  const [materials, setMaterials] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = competitorInputSchema.safeParse({
      purpose,
      myProduct,
      competitors: competitors.filter((c) => c.name.trim() !== ""),
      materials,
    });
    if (!parsed.success) {
      const map: Record<string, string> = {};
      for (const issue of parsed.error.issues) map[issue.path.join(".")] = issue.message;
      setErrors(map);
      return;
    }
    setErrors({});
    onSubmit(parsed.data satisfies CompetitorInput);
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <Field
        label="分析目的"
        htmlFor="purpose"
        error={errors["purpose"]}
        hint="为了什么决策？例：为 Q4 迭代选择差异化方向"
      >
        <textarea
          id="purpose"
          value={purpose}
          onChange={(e) => setPurpose(e.target.value)}
          className="min-h-20 w-full rounded border p-2"
        />
      </Field>
      <Field
        label="我方产品"
        htmlFor="myProduct"
        error={errors["myProduct"]}
        hint="名称 + 一句话定位 + 现状（有数据更好）"
      >
        <textarea
          id="myProduct"
          value={myProduct}
          onChange={(e) => setMyProduct(e.target.value)}
          className="min-h-24 w-full rounded border p-2"
        />
      </Field>
      {competitors.map((c, i) => (
        <div key={i} className="flex flex-wrap items-end gap-2">
          <Field
            label={i === 0 ? "竞品名称" : `竞品 ${i + 1} 名称`}
            htmlFor={`comp-${i}`}
            error={errors[`competitors.${i}.name`]}
          >
            <input
              id={`comp-${i}`}
              value={c.name}
              className="rounded border p-2"
              onChange={(e) =>
                setCompetitors(competitors.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)))
              }
            />
          </Field>
          <Field label={`竞品 ${i + 1} 备注（选填）`} htmlFor={`notes-${i}`}>
            <input
              id={`notes-${i}`}
              value={c.notes}
              className="rounded border p-2"
              onChange={(e) =>
                setCompetitors(competitors.map((x, j) => (j === i ? { ...x, notes: e.target.value } : x)))
              }
            />
          </Field>
          {competitors.length > 1 && (
            <button
              type="button"
              onClick={() => setCompetitors(competitors.filter((_, j) => j !== i))}
              className="pb-2 text-sm text-neutral-500"
            >
              删除
            </button>
          )}
        </div>
      ))}
      {competitors.length < 5 && (
        <button
          type="button"
          onClick={() => setCompetitors([...competitors, { name: "", notes: "" }])}
          className="self-start text-sm text-blue-600"
        >
          + 添加竞品
        </button>
      )}
      <Field
        label="补充材料（选填）"
        htmlFor="materials"
        hint="评分、用户反馈、新闻…证据只来自这里和行业常识，模型会逐条标注"
      >
        <textarea
          id="materials"
          value={materials}
          onChange={(e) => setMaterials(e.target.value)}
          className="min-h-24 w-full rounded border p-2"
        />
      </Field>
      <button
        type="submit"
        disabled={disabled}
        className="rounded bg-blue-600 px-4 py-2 font-medium text-white disabled:opacity-50"
      >
        生成报告
      </button>
    </form>
  );
}
