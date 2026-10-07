// toolkit/src/lib/decode-upload.ts —— 上传文件解码：UTF-8 严格优先（含 BOM 剥离），
// GBK 兜底（WHATWG 标签 gbk 实为 gb18030 超集，覆盖 Excel 中文导出），都失败才报错。
// 严格模式（fatal: true）保证不产出静默 U+FFFD——宁可报错不可乱码。
export class DecodeError extends Error {}

export type DecodedUpload = { text: string; encoding: "utf-8" | "gbk" };

export function decodeUpload(buf: ArrayBuffer): DecodedUpload {
  const bytes = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
  try {
    return { text: new TextDecoder("utf-8", { fatal: true }).decode(bytes).replace(/^\uFEFF/, ""), encoding: "utf-8" };
  } catch {
    // 不是合法 UTF-8，尝试 GBK
  }
  try {
    return { text: new TextDecoder("gbk", { fatal: true }).decode(bytes).replace(/^\uFEFF/, ""), encoding: "gbk" };
  } catch {
    throw new DecodeError("无法识别的文件编码（仅支持 UTF-8 / GBK）");
  }
}
