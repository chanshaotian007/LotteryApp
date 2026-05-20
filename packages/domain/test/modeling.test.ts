import { GameCode, type DrawRecord } from "@lottery/contracts";
import { describe, expect, it } from "vitest";
import {
  buildSlidingWindowTrainingDataset,
  normalizeFeatureWeights,
  trainFeatureWeights,
  trainModelDraft,
} from "../src/modeling";

function cycleNumbers(index: number, maxNumber: number, count: number, step: number): number[] {
  const values: number[] = [];
  let cursor = index;
  while (values.length < count) {
    const value = (cursor % maxNumber) + 1;
    if (!values.includes(value)) {
      values.push(value);
    }
    cursor += step;
  }
  return values.sort((left, right) => left - right);
}

function syntheticSsqDraws(count: number): DrawRecord[] {
  const chronological = Array.from({ length: count }, (_, index) => ({
    gameCode: GameCode.DOUBLE_COLOR_BALL,
    issue: `2026${String(index).padStart(4, "0")}`,
    drawDate: null,
    primaryNumbers: cycleNumbers(index, 33, 6, 7),
    secondaryNumbers: cycleNumbers(index, 16, 1, 5),
    prizeTiers: [],
    sourceUrl: `fixture://ssq/${index}`,
    sourceHash: `hash-${index}`,
  }));
  return chronological.reverse();
}

describe("modeling", () => {
  it("reaches requested sample size for the sliding-window dataset", () => {
    const dataset = buildSlidingWindowTrainingDataset(
      syntheticSsqDraws(105),
      GameCode.DOUBLE_COLOR_BALL,
      100,
      10_000,
      7,
    );

    expect(dataset.summary).toMatchObject({
      effectiveWindow: 100,
      trainingPeriods: 5,
      meetsMinSamples: true,
    });
    expect(Number(dataset.summary.actualSamples)).toBeGreaterThanOrEqual(10_000);
    expect(dataset.labels.filter((value) => value === 1)).toHaveLength(Number(dataset.summary.positiveSamples));
  });

  it("returns normalized weights", () => {
    const dataset = buildSlidingWindowTrainingDataset(
      syntheticSsqDraws(105),
      GameCode.DOUBLE_COLOR_BALL,
      100,
      500,
      11,
    );
    const trained = trainFeatureWeights(dataset);
    const weights = normalizeFeatureWeights(trained.featureWeights as Record<string, number>);

    expect(Number(Object.values(weights).reduce((sum, value) => sum + value, 0).toFixed(4))).toBe(1);
    expect(Object.keys(weights)).toEqual([
      "hotScore",
      "missingScore",
      "balanceScore",
      "cooccurrenceScore",
      "recentDecayScore",
    ]);
    expect(trained.diagnostics).toHaveProperty("scoreGap");
  });

  it("builds a train model draft", () => {
    const run = trainModelDraft(
      GameCode.DOUBLE_COLOR_BALL,
      syntheticSsqDraws(105),
      100,
      13,
      100,
      500,
      new Date("2026-05-19T00:00:00Z"),
    );

    expect(run.version).toMatch(/^ranker-v2-ssq-/);
    expect(Number((run.featureSummary.training as Record<string, unknown>).actualSamples)).toBeGreaterThanOrEqual(500);
    expect((run.featureSummary.training as Record<string, unknown>).effectiveWindow).toBe(100);
    expect(
      Number(
        Object.values((run.featureSummary.trainedModel as Record<string, any>).featureWeights).reduce(
          (sum: number, value: number) => sum + value,
          0,
        ).toFixed(4),
      ),
    ).toBe(1);
    expect(run.backtestReport.evaluatedPeriods).toBe(5);
  });
});
