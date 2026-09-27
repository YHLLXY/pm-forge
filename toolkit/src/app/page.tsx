import Link from "next/link";
import { TOOLS } from "@/tools/registry";
import { ModeBadge } from "@/components/mode-badge";

export default function Home() {
  return (
    <main className="mx-auto flex max-w-3xl flex-col gap-8 px-4 py-16">
      <header className="flex flex-col gap-3">
        <h1 className="text-3xl font-bold">PM Forge · AI 产品工具箱</h1>
        <p className="text-neutral-600">
          把产品经理的方法论变成可运行的流水线：输入材料，产出{" "}
          <strong>带证据链标注</strong>的报告。
        </p>
        <ModeBadge />
      </header>

      <nav className="grid gap-4">
        {TOOLS.map((t) => (
          <Link
            key={t.id}
            href={`/tools/${t.id}`}
            className="rounded-lg border p-5 transition-colors hover:border-blue-500"
          >
            <h2 className="font-semibold">{t.name}</h2>
            <p className="mt-1 text-sm text-neutral-600">{t.tagline}</p>
          </Link>
        ))}
      </nav>

      <footer className="text-xs text-neutral-500">
        数据不出浏览器：输入与运行历史只保存在本机。输出中的标注
        （【依据输入】/【行业常识】/【推断】）用于区分证据强度——用于真实决策前请先核实。
      </footer>
    </main>
  );
}
