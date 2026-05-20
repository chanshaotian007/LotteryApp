import { ComplexPreference, GameCode, GenerateMode, type DrawRecord } from "@lottery/contracts";
import { describe, expect, it } from "vitest";
import { generateCandidates } from "../src/generator";

const seededDraws: DrawRecord[] = [
  {
    gameCode: GameCode.DOUBLE_COLOR_BALL,
    issue: "2026001",
    drawDate: null,
    primaryNumbers: [1, 2, 3, 4, 5, 6],
    secondaryNumbers: [7],
    prizeTiers: [],
    sourceUrl: "fixture://ssq/2026001",
    sourceHash: "hash-ssq-2026001",
  },
  {
    gameCode: GameCode.SUPER_LOTTO,
    issue: "25001",
    drawDate: null,
    primaryNumbers: [1, 2, 3, 4, 5],
    secondaryNumbers: [6, 7],
    prizeTiers: [],
    sourceUrl: "fixture://dlt/25001",
    sourceHash: "hash-dlt-25001",
  },
];

describe("generateCandidates", () => {
  it("respects budget bounds", () => {
    const result = generateCandidates({
      gameCode: GameCode.DOUBLE_COLOR_BALL,
      mode: GenerateMode.RANDOM,
      count: 3,
      preference: ComplexPreference.CONSERVATIVE,
      budgetMin: 14,
      budgetMax: 60,
      excludeHistory: false,
      targetPrizeMode: false,
      randomSeed: 42,
      draws: seededDraws.filter((draw) => draw.gameCode === GameCode.DOUBLE_COLOR_BALL),
    });

    expect(result.candidates).toHaveLength(3);
    expect(result.candidates.every((candidate) => candidate.totalCost >= 14 && candidate.totalCost <= 60)).toBe(true);
  });

  it("filters high-prize matches from history", () => {
    const result = generateCandidates({
      gameCode: GameCode.DOUBLE_COLOR_BALL,
      mode: GenerateMode.EXCLUDE_HISTORY,
      count: 5,
      preference: ComplexPreference.CONSERVATIVE,
      excludeHistory: true,
      targetPrizeMode: false,
      randomSeed: 3,
      draws: seededDraws.filter((draw) => draw.gameCode === GameCode.DOUBLE_COLOR_BALL),
    });

    const historicalPrimary = new Set([1, 2, 3, 4, 5, 6]);
    expect(result.candidates).toHaveLength(5);
    expect(
      result.candidates.every((candidate) => ![...historicalPrimary].every((number) => candidate.primaryNumbers.includes(number))),
    ).toBe(true);
  });

  it("applies target prize stake multiplier", () => {
    const result = generateCandidates({
      gameCode: GameCode.DOUBLE_COLOR_BALL,
      mode: GenerateMode.RANDOM,
      count: 1,
      preference: ComplexPreference.SINGLE,
      excludeHistory: false,
      targetPrizeMode: true,
      randomSeed: 5,
      draws: seededDraws.filter((draw) => draw.gameCode === GameCode.DOUBLE_COLOR_BALL),
    });

    expect(result.candidates[0]).toMatchObject({
      totalBets: 1,
      stakeMultiplier: 10,
      totalCost: 20,
      maxPrize: 50_000_000,
    });
  });
});
