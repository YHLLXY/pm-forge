// site/src/scripts/story/duckdb-loader.ts —— 全站唯一 import @duckdb/duckdb-wasm 的文件（懒加载边界）
// EHDR 单线程形态硬编码：只发布 eh 资产（copy-duckdb-assets.mjs 的 FILES 是唯一事实源），
// 不走 selectBundle——它的 mvp 兜底分支在未发布 mvp 文件时会 404；移动端不加载本模块，
// 桌面现代浏览器均支持 wasmExceptions，无需 selectBundle 的运行时探测。
import * as duckdb from "@duckdb/duckdb-wasm";

const PARQUET_NAME = "userbehavior_100k.parquet";
const PARQUET_URL = `/assets/data-stories/userbehavior/${PARQUET_NAME}`;
// 形状与 duckdb.DuckDBBundle 兼容；mainWorker 收窄为 string（Worker 构造不收 null）
const EHDR_BUNDLE = {
  mainModule: "/duckdb/duckdb-eh.wasm",
  mainWorker: "/duckdb/duckdb-browser-eh.worker.js",
  pthreadWorker: null,
} as const;

let dbPromise: Promise<duckdb.AsyncDuckDB> | null = null;

export function loadDuckDB(
  onProgress?: (bytesLoaded: number, bytesTotal: number) => void,
): Promise<duckdb.AsyncDuckDB> {
  dbPromise ??= (async () => {
    const db = new duckdb.AsyncDuckDB(
      new duckdb.ConsoleLogger(duckdb.LogLevel.WARNING),
      new Worker(EHDR_BUNDLE.mainWorker),
    );
    // 进度回调：instantiate 内部 fetch wasm（约 34MB），InstantiationProgress 字节级 loaded/total；
    // 第二参数显式 null——EHDR 单线程形态无 pthread worker
    await db.instantiate(
      EHDR_BUNDLE.mainModule,
      null,
      onProgress ? p => onProgress(p.bytesLoaded, p.bytesTotal) : undefined,
    );
    // EHDR 构建的 httpfs 不接管 URL 读取——自托管 parquet 须经 registerFileURL
    // 注册进 JS 侧虚拟文件系统（fetch 由主线程承接），SQL 里按文件名引用。
    await db.registerFileURL(PARQUET_NAME, PARQUET_URL, duckdb.DuckDBDataProtocol.HTTP, true);
    return db;
  })();
  return dbPromise;
}

// DuckDB int64 聚合结果以 BigInt 出来，JSON/图表边界只认 Number；
// 本数据集（10 万行计数、1M 级 ID）远在 Number.MAX_SAFE_INTEGER 内，收窄无损。
function toPlain<T>(rows: object[]): T[] {
  return rows.map(r =>
    Object.fromEntries(Object.entries(r).map(([k, v]) => [k, typeof v === "bigint" ? Number(v) : v])),
  ) as T[];
}

// 官方窗口（同 precompute_story.py / ingest.clean_window：上海墙钟 2017-11-25 00:00 ≤ x < 2017-12-04 00:00）
// 的 unix 秒端点。浏览器侧查询与构建期预置图表必须同口径，否则脏时间戳会混进查询结果。
const WINDOW_START = 1511539200;
const WINDOW_END = 1512316800;

export async function queryParquet<T = Record<string, unknown>>(
  sql: string,
  onProgress?: (bytesLoaded: number, bytesTotal: number) => void,
): Promise<T[]> {
  const db = await loadDuckDB(onProgress);
  const conn = await db.connect();
  try {
    await conn.query(
      `CREATE OR REPLACE VIEW events AS SELECT * FROM read_parquet('${PARQUET_NAME}') WHERE ts >= ${WINDOW_START} AND ts < ${WINDOW_END}`,
    );
    return toPlain<T>((await conn.query(sql)).toArray());
  } finally {
    await conn.close();
  }
}
