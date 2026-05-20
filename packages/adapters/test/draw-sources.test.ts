import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { parseCwlDrawNotice, parseSportteryHistory } from "../src/draw-sources";

function fixture(name: string): Record<string, unknown> {
  const filePath = resolve(__dirname, "../../../server/tests/fixtures", name);
  return JSON.parse(readFileSync(filePath, "utf8")) as Record<string, unknown>;
}

describe("draw source parsers", () => {
  it("parses sporttery history", () => {
    const draws = parseSportteryHistory(fixture("sporttery_dlt_history.json"), "fixture://sporttery");

    expect(draws).toHaveLength(1);
    expect(draws[0]).toMatchObject({
      issue: "25055",
      drawDate: "2025-05-14",
      primaryNumbers: [1, 7, 12, 25, 35],
      secondaryNumbers: [3, 11],
      sourceUrl: "fixture://sporttery",
    });
    expect(draws[0].sourceHash).toMatch(/^[a-f0-9]{64}$/);
  });

  it("parses cwl draw notice", () => {
    const draws = parseCwlDrawNotice(fixture("cwl_ssq_draw_notice.json"), "fixture://cwl");

    expect(draws).toHaveLength(1);
    expect(draws[0]).toMatchObject({
      issue: "2025055",
      drawDate: "2025-05-13",
      primaryNumbers: [1, 5, 12, 18, 23, 31],
      secondaryNumbers: [9],
      sourceUrl: "fixture://cwl",
    });
    expect(draws[0].sourceHash).toMatch(/^[a-f0-9]{64}$/);
  });
});
