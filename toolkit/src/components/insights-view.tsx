import type { InsightsReport } from "@/lib/insights";

export function InsightsView({ report }: { report: InsightsReport }) {
  return (
    <div className="flex flex-col gap-6" data-testid="priority-matrix-wrap">
      <div>
        <h3 className="mb-2 font-semibold">
          优先级矩阵（横=影响面，纵=严重度；右上角的先做）
        </h3>
        <div
          data-testid="priority-matrix"
          className="grid grid-cols-5 gap-1"
          aria-label="主题优先级矩阵"
        >
          {[5, 4, 3, 2, 1].map((sev) =>
            [1, 2, 3, 4, 5].map((imp) => (
              <div
                key={`${sev}-${imp}`}
                className="flex min-h-12 flex-wrap items-center justify-center gap-0.5 rounded bg-neutral-100 p-1"
              >
                {report.themes.map((t, i) =>
                  t.impact === imp && t.severity === sev ? (
                    <span
                      key={t.name}
                      title={`${t.name}：影响面 ${t.impact} / 严重度 ${t.severity}`}
                      className="rounded-full bg-blue-600 px-2 py-0.5 text-xs text-white"
                    >
                      {i + 1}
                    </span>
                  ) : null,
                )}
              </div>
            )),
          )}
        </div>
      </div>
      <ol className="flex flex-col gap-3">
        {report.themes.map((t, i) => (
          <li key={t.name} className="rounded border p-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-blue-600 px-2 text-xs text-white">{i + 1}</span>
              <h4 className="font-medium">{t.name}</h4>
              <span className="text-xs text-neutral-500">
                {t.count} 条 ·{" "}
                {t.sentiment === "negative" ? "负面" : t.sentiment === "positive" ? "正面" : "混合"} ·
                影响面 {t.impact}/5 · 严重度 {t.severity}/5
              </span>
            </div>
            <p className="mt-1 text-sm">{t.summary}</p>
            {t.quotes.length > 0 && (
              <ul className="mt-1 list-disc pl-5 text-sm text-neutral-600">
                {t.quotes.map((q) => (
                  <li key={q}>“{q}”</li>
                ))}
              </ul>
            )}
            {t.opportunities.length > 0 && (
              <p className="mt-1 text-sm text-green-700">机会点：{t.opportunities.join("；")}</p>
            )}
          </li>
        ))}
      </ol>
      {report.notableOutliers.length > 0 && (
        <div className="rounded border border-amber-300 bg-amber-50 p-3 text-sm">
          <h4 className="font-medium">未归类但值得注意</h4>
          <ul className="list-disc pl-5">
            {report.notableOutliers.map((o) => (
              <li key={o}>{o}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
