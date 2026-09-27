"use client";

import { useState } from "react";
import { Field } from "./field";
import { prdInputSchema } from "@/tools/schemas";

export function PrdForm({
  onSubmit,
  disabled,
}: {
  onSubmit(input: unknown): void;
  disabled?: boolean;
}) {
  const [moduleName, setModuleName] = useState("");
  const [requirementName, setRequirementName] = useState("");
  const [background, setBackground] = useState("");
  const [users, setUsers] = useState("");
  const [constraints, setConstraints] = useState("");
  const [materials, setMaterials] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = prdInputSchema.safeParse({
      moduleName,
      requirementName,
      background,
      users,
      constraints,
      materials,
    });
    if (!parsed.success) {
      const map: Record<string, string> = {};
      for (const issue of parsed.error.issues) map[issue.path.join(".")] = issue.message;
      setErrors(map);
      return;
    }
    setErrors({});
    onSubmit(parsed.data);
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="flex flex-wrap gap-4">
        <Field label="产品/模块" htmlFor="moduleName" error={errors["moduleName"]}>
          <input
            id="moduleName"
            value={moduleName}
            onChange={(e) => setModuleName(e.target.value)}
            className="w-full rounded border p-2"
          />
        </Field>
        <Field label="需求名称" htmlFor="requirementName" error={errors["requirementName"]}>
          <input
            id="requirementName"
            value={requirementName}
            onChange={(e) => setRequirementName(e.target.value)}
            className="w-full rounded border p-2"
          />
        </Field>
      </div>
      <Field
        label="背景描述"
        htmlFor="background"
        error={errors["background"]}
        hint="为什么做：问题、机会、为什么现在做"
      >
        <textarea
          id="background"
          value={background}
          onChange={(e) => setBackground(e.target.value)}
          className="min-h-24 w-full rounded border p-2"
        />
      </Field>
      <Field label="目标用户与场景" htmlFor="users" error={errors["users"]} hint="谁在什么情况下用它解决什么问题">
        <textarea
          id="users"
          value={users}
          onChange={(e) => setUsers(e.target.value)}
          className="min-h-20 w-full rounded border p-2"
        />
      </Field>
      <Field label="已知约束（选填）" htmlFor="constraints" hint="技术、合规、时间等限制条件">
        <textarea
          id="constraints"
          value={constraints}
          onChange={(e) => setConstraints(e.target.value)}
          className="min-h-16 w-full rounded border p-2"
        />
      </Field>
      <Field label="补充材料（选填）" htmlFor="materials" hint="已有调研、数据、用户反馈等">
        <textarea
          id="materials"
          value={materials}
          onChange={(e) => setMaterials(e.target.value)}
          className="min-h-16 w-full rounded border p-2"
        />
      </Field>
      <button
        type="submit"
        disabled={disabled}
        className="rounded bg-blue-600 px-4 py-2 font-medium text-white disabled:opacity-50"
      >
        生成 PRD 草稿
      </button>
    </form>
  );
}
