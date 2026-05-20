import { GameCode, type DrawRecord, type StatsResponseContract } from "@lottery/contracts";
import { getGameDefinition, listInclusiveRange } from "./games";

function frequency(draws: DrawRecord[], key: "primaryNumbers" | "secondaryNumbers"): Record<number, number> {
  const counter = new Map<number, number>();
  for (const draw of draws) {
    for (const number of draw[key]) {
      counter.set(number, (counter.get(number) ?? 0) + 1);
    }
  }
  return Object.fromEntries([...counter.entries()].sort((left, right) => left[0] - right[0]));
}

function missingPeriods(
  draws: DrawRecord[],
  key: "primaryNumbers" | "secondaryNumbers",
  range: [number, number],
): Record<number, number> {
  const missing = new Map<number, number>();
  for (const number of listInclusiveRange(range)) {
    missing.set(number, draws.length);
  }
  draws.forEach((draw, index) => {
    for (const number of draw[key]) {
      if ((missing.get(number) ?? draws.length) === draws.length) {
        missing.set(number, index);
      }
    }
  });
  return Object.fromEntries([...missing.entries()].sort((left, right) => left[0] - right[0]));
}

export function buildStats(gameCode: GameCode, draws: DrawRecord[], dataVersion: string): StatsResponseContract {
  const definition = getGameDefinition(gameCode);
  return {
    gameCode,
    drawCount: draws.length,
    latestIssue: draws[0]?.issue ?? null,
    primaryFrequency: frequency(draws, "primaryNumbers"),
    secondaryFrequency: frequency(draws, "secondaryNumbers"),
    primaryMissingPeriods: missingPeriods(draws, "primaryNumbers", definition.primaryRange),
    secondaryMissingPeriods: missingPeriods(draws, "secondaryNumbers", definition.secondaryRange),
    dataVersion,
  };
}
