import { describe, expect, it } from "vitest";
import { plainToRichText, richTextToPlain } from "./fields-inspector";

describe("rich text as paragraphs", () => {
  it("turns blank-line separated text into paragraphs and back", () => {
    const doc = plainToRichText("First line\n\nSecond one\n\n\n");
    expect(doc.blocks).toHaveLength(2);
    expect(doc.blocks[0]).toEqual({ kind: "p", inlines: [{ kind: "text", text: "First line", bold: false, italic: false, underline: false }] });
    expect(richTextToPlain(doc)).toBe("First line\n\nSecond one");
  });
});
