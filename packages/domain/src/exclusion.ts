import { GameCode, type HistoricalDraw } from "@lottery/contracts";

export interface Candidate {
  gameCode: GameCode;
  primaryNumbers: readonly number[];
  secondaryNumbers: readonly number[];
}

export function asHistoricalDraws(
  draws: Array<{
    issue: string;
    primaryNumbers: number[];
    secondaryNumbers: number[];
  }>,
): HistoricalDraw[] {
  return draws.map((draw) => ({
    issue: draw.issue,
    primaryNumbers: new Set(draw.primaryNumbers),
    secondaryNumbers: new Set(draw.secondaryNumbers),
  }));
}

export function wouldMatchHistoricalHighPrize(
  candidate: Candidate,
  historicalDraws: HistoricalDraw[],
): { excluded: boolean; issue: string | null } {
  const primary = new Set(candidate.primaryNumbers);
  const secondary = new Set(candidate.secondaryNumbers);

  for (const draw of historicalDraws) {
    if (candidate.gameCode === GameCode.DOUBLE_COLOR_BALL) {
      if (isSubset(draw.primaryNumbers, primary)) {
        return { excluded: true, issue: draw.issue };
      }
      continue;
    }
    if (isSubset(draw.primaryNumbers, primary) && intersects(draw.secondaryNumbers, secondary)) {
      return { excluded: true, issue: draw.issue };
    }
  }
  return { excluded: false, issue: null };
}

function isSubset(source: ReadonlySet<number>, target: ReadonlySet<number>): boolean {
  for (const value of source) {
    if (!target.has(value)) {
      return false;
    }
  }
  return true;
}

function intersects(left: ReadonlySet<number>, right: ReadonlySet<number>): boolean {
  for (const value of left) {
    if (right.has(value)) {
      return true;
    }
  }
  return false;
}
