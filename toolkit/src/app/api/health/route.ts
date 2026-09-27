import { NextResponse } from "next/server";
import { serverLlmConfig } from "@/lib/config";

export async function GET() {
  const cfg = serverLlmConfig();
  const mode = cfg.forceMock || !cfg.apiKey ? "mock" : "live";
  return NextResponse.json({ mode, model: mode === "live" ? cfg.model : null });
}
