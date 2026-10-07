import { describe, expect, it } from "vitest";
import { DecodeError, decodeUpload } from "@/lib/decode-upload";

const GBK_LINE = new Uint8Array([
  0xb5, 0xc8, 0xc1, 0xcb, 0xca, 0xae, 0xb7, 0xd6, 0xd6, 0xd3, 0xc3, 0xbb, 0xc8, 0xcb, 0xbd, 0xd3, 0xb5, 0xa5,
]);

describe("decodeUpload", () => {
  it("UTF-8 中文按 utf-8 解码", () => {
    const buf = new TextEncoder().encode("界面很好看\n支付总是失败").buffer;
    expect(decodeUpload(buf)).toEqual({ text: "界面很好看\n支付总是失败", encoding: "utf-8" });
  });

  it("剥离 UTF-8 BOM", () => {
    const bytes = new Uint8Array([0xef, 0xbb, 0xbf, ...new TextEncoder().encode("界面很好看")]);
    expect(decodeUpload(bytes.buffer).text).toBe("界面很好看");
  });

  it("GBK 文件自动按 gbk 解码（Excel 导出场景）", () => {
    expect(decodeUpload(GBK_LINE.buffer)).toEqual({ text: "等了十分钟没人接单", encoding: "gbk" });
  });

  it("两种解码都失败时抛 DecodeError", () => {
    const bad = new Uint8Array([0xff, 0xfe, 0x81, 0x40, 0xff, 0xff]);
    expect(() => decodeUpload(bad.buffer)).toThrow(DecodeError);
  });
});
