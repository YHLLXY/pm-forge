import { notFound } from "next/navigation";
import { getTool, TOOL_IDS } from "@/tools/registry";
import { ToolWorkbench } from "@/components/tool-workbench";

export function generateStaticParams() {
  return TOOL_IDS.map((tool) => ({ tool }));
}

export default async function ToolPage({
  params,
}: {
  params: Promise<{ tool: string }>;
}) {
  const { tool } = await params;
  if (!getTool(tool)) notFound();
  return <ToolWorkbench toolId={tool} />;
}
