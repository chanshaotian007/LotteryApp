import {
  ComplexPreference,
  GameCode,
  GenerateMode,
  type DrawRecord,
  type GeneratedCandidate,
} from "@lottery/contracts";
import { calculateBets } from "./combinatorics";
import { asHistoricalDraws, wouldMatchHistoricalHighPrize } from "./exclusion";
import { countRanges, getGameDefinition, listInclusiveRange } from "./games";
import { normalizeFeatureWeights, scoreCandidate } from "./modeling";
import { createRandom } from "./random";

export const targetFirstPrize = 50_000_000;

export function requiredStakeMultiplier(baseFirstPrize: number, targetPrize = targetFirstPrize): number {
  return Math.floor((targetPrize + baseFirstPrize - 1) / baseFirstPrize);
}

function buildCandidate(
  rng: ReturnType<typeof createRandom>,
  gameCode: GameCode,
  preference: ComplexPreference,
): { primary: number[]; secondary: number[] } {
  const definition = getGameDefinition(gameCode);
  const [primaryRange, secondaryRange] = countRanges(gameCode, preference);
  const primaryCount = rng.int(primaryRange[0], primaryRange[1]);
  const secondaryCount = rng.int(secondaryRange[0], secondaryRange[1]);
  return {
    primary: rng.sample(listInclusiveRange(definition.primaryRange), primaryCount).sort((a, b) => a - b),
    secondary: rng.sample(listInclusiveRange(definition.secondaryRange), secondaryCount).sort((a, b) => a - b),
  };
}

export function generateCandidates(input: {
  gameCode: GameCode;
  mode: GenerateMode;
  count: number;
  preference: ComplexPreference;
  budgetMin?: number | null;
  budgetMax?: number | null;
  excludeHistory: boolean;
  targetPrizeMode: boolean;
  randomSeed?: number | null;
  draws: DrawRecord[];
  modelProfile?: { featureWeights?: Record<string, number> | null } | null;
}): { candidates: GeneratedCandidate[]; report: Record<string, unknown> | null } {
  const rng = createRandom(input.randomSeed);
  const definition = getGameDefinition(input.gameCode);
  const historical = asHistoricalDraws(input.draws);
  const generated: GeneratedCandidate[] = [];
  const modelReports: Array<Record<string, unknown>> = [];
  const modelWeights = normalizeFeatureWeights(input.modelProfile?.featureWeights ?? null);
  const poolMultiplier = input.mode === GenerateMode.MODEL_PREDICTION ? 80 : 1;
  let attempts = 0;
  const maxAttempts = Math.max(5000, input.count * poolMultiplier * 50);

  while (attempts < maxAttempts && generated.length < input.count * poolMultiplier) {
    attempts += 1;
    const { primary, secondary } = buildCandidate(rng, input.gameCode, input.preference);
    const totalBets = calculateBets(primary.length, secondary.length, definition.primaryPick, definition.secondaryPick);
    const stakeMultiplier = input.targetPrizeMode ? requiredStakeMultiplier(definition.baseFirstPrize) : 1;
    const totalCost = totalBets * definition.ticketPrice * stakeMultiplier;
    const maxPrize = definition.baseFirstPrize * stakeMultiplier;
    if (input.budgetMin !== undefined && input.budgetMin !== null && totalCost < input.budgetMin) {
      continue;
    }
    if (input.budgetMax !== undefined && input.budgetMax !== null && totalCost > input.budgetMax) {
      continue;
    }

    let excludedHistoryIssue: string | null = null;
    if (input.excludeHistory) {
      const exclusion = wouldMatchHistoricalHighPrize(
        { gameCode: input.gameCode, primaryNumbers: primary, secondaryNumbers: secondary },
        historical,
      );
      if (exclusion.excluded) {
        continue;
      }
      excludedHistoryIssue = exclusion.issue;
    }

    let modelScore: number | undefined;
    if (input.mode === GenerateMode.MODEL_PREDICTION) {
      const scored = scoreCandidate(input.draws, primary, secondary, modelWeights);
      modelScore = Number(scored.score.toFixed(4));
      modelReports.push(scored.report);
    }

    generated.push({
      gameCode: input.gameCode,
      primaryNumbers: primary,
      secondaryNumbers: secondary,
      totalBets,
      stakeMultiplier,
      totalCost,
      maxPrize,
      modelScore,
      excludedHistoryIssue,
    });
  }

  const candidatePoolSize = generated.length;
  const finalCandidates =
    input.mode === GenerateMode.MODEL_PREDICTION ? diverseTop(generated.sort(sortCandidates), input.count) : generated.slice(0, input.count);
  let report: Record<string, unknown> | null = null;
  if (input.mode === GenerateMode.MODEL_PREDICTION) {
    report = {
      candidatePoolSize,
      scoring: "trained explainable frequency, missing, balance, cooccurrence, recent decay",
      featureWeights: modelWeights,
      topFeatureSample: modelReports[0]?.features ?? {},
    };
  }
  return { candidates: finalCandidates, report };
}

function sortCandidates(left: GeneratedCandidate, right: GeneratedCandidate): number {
  return (right.modelScore ?? 0) - (left.modelScore ?? 0);
}

function diverseTop(candidates: GeneratedCandidate[], count: number): GeneratedCandidate[] {
  const selected: GeneratedCandidate[] = [];
  const seen = new Set<string>();
  for (const candidate of candidates) {
    const key = candidate.primaryNumbers.slice(0, 3).join(",");
    if (seen.has(key) && candidates.length >= count * 2) {
      continue;
    }
    selected.push(candidate);
    seen.add(key);
    if (selected.length === count) {
      break;
    }
  }
  return selected;
}
