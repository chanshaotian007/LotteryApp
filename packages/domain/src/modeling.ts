import { GameCode, type DrawRecord, type ModelProfile } from "@lottery/contracts";
import { getGameDefinition, listInclusiveRange } from "./games";
import { createRandom } from "./random";

export const modelVersionPrefix = "ranker-v2";
export const algorithmName =
  "sliding-window supervised candidate ranker with explainable features and optional LightGBM hook";
export const featureKeys = [
  "hotScore",
  "missingScore",
  "balanceScore",
  "cooccurrenceScore",
  "recentDecayScore",
] as const;

export type FeatureKey = (typeof featureKeys)[number];

export interface CandidateFeatures {
  hotScore: number;
  missingScore: number;
  balanceScore: number;
  cooccurrenceScore: number;
  recentDecayScore: number;
}

export interface TrainingDataset {
  samples: Array<Record<FeatureKey, number>>;
  labels: number[];
  summary: Record<string, unknown>;
}

export interface ModelRunDraft {
  gameCode: GameCode;
  version: string;
  algorithm: string;
  featureSummary: Record<string, unknown>;
  backtestReport: Record<string, unknown>;
}

export const defaultFeatureWeights: Record<FeatureKey, number> = {
  hotScore: 0.3,
  missingScore: 0.2,
  balanceScore: 0.2,
  cooccurrenceScore: 0.15,
  recentDecayScore: 0.15,
};

export function normalizeFeatureWeights(weights?: Record<string, number> | null): Record<FeatureKey, number> {
  if (!weights) {
    return { ...defaultFeatureWeights };
  }
  const cleaned = Object.fromEntries(
    featureKeys.map((key) => [key, Math.max(0, Number(weights[key] ?? 0))]),
  ) as Record<FeatureKey, number>;
  const total = Object.values(cleaned).reduce((sum, value) => sum + value, 0);
  if (total <= 0) {
    return { ...defaultFeatureWeights };
  }
  return Object.fromEntries(
    featureKeys.map((key) => [key, Number((cleaned[key] / total).toFixed(6))]),
  ) as Record<FeatureKey, number>;
}

function normalize(value: number, maxValue: number): number {
  if (maxValue <= 0) {
    return 0;
  }
  return Math.max(0, Math.min(1, value / maxValue));
}

function numberStats(draws: DrawRecord[], key: "primaryNumbers" | "secondaryNumbers"): [Map<number, number>, Map<number, number>] {
  const frequency = new Map<number, number>();
  const missing = new Map<number, number>();
  draws.forEach((draw, index) => {
    for (const value of draw[key]) {
      frequency.set(value, (frequency.get(value) ?? 0) + 1);
      if (!missing.has(value)) {
        missing.set(value, index);
      }
    }
  });
  return [frequency, missing];
}

function cooccurrence(draws: DrawRecord[], key: "primaryNumbers" | "secondaryNumbers"): Map<string, number> {
  const counter = new Map<string, number>();
  for (const draw of draws) {
    const values = [...draw[key]].sort((left, right) => left - right);
    for (let leftIndex = 0; leftIndex < values.length; leftIndex += 1) {
      for (let rightIndex = leftIndex + 1; rightIndex < values.length; rightIndex += 1) {
        const pairKey = `${values[leftIndex]}:${values[rightIndex]}`;
        counter.set(pairKey, (counter.get(pairKey) ?? 0) + 1);
      }
    }
  }
  return counter;
}

export function scoreCandidate(
  draws: DrawRecord[],
  primaryNumbers: number[],
  secondaryNumbers: number[],
  weights?: Record<string, number> | null,
): { score: number; report: Record<string, unknown> } {
  const normalizedWeights = normalizeFeatureWeights(weights);
  if (draws.length === 0) {
    return {
      score: 0.5,
      report: {
        features: {
          hotScore: 0.5,
          missingScore: 0.5,
          balanceScore: 0.5,
          cooccurrenceScore: 0.5,
          recentDecayScore: 0.5,
        },
        featureWeights: normalizedWeights,
      },
    };
  }

  const [primaryFrequency, primaryMissing] = numberStats(draws, "primaryNumbers");
  const [secondaryFrequency, secondaryMissing] = numberStats(draws, "secondaryNumbers");
  const pairCounts = cooccurrence(draws, "primaryNumbers");
  const maxFrequency = Math.max(...primaryFrequency.values(), 1);
  const maxMissing = Math.max(draws.length, 1);
  const allNumbers = [...primaryNumbers, ...secondaryNumbers];

  let hot = 0;
  for (const value of primaryNumbers) {
    hot += primaryFrequency.get(value) ?? 0;
  }
  for (const value of secondaryNumbers) {
    hot += secondaryFrequency.get(value) ?? 0;
  }
  const hotScore = normalize(hot, maxFrequency * allNumbers.length);

  let missing = 0;
  for (const value of primaryNumbers) {
    missing += primaryMissing.get(value) ?? draws.length;
  }
  for (const value of secondaryNumbers) {
    missing += secondaryMissing.get(value) ?? draws.length;
  }
  const missingScore = normalize(missing, maxMissing * allNumbers.length);

  const oddRatio = allNumbers.reduce((sum, value) => sum + (value % 2), 0) / allNumbers.length;
  const oddEvenScore = 1 - Math.abs(0.5 - oddRatio);
  const numberSum = primaryNumbers.reduce((sum, value) => sum + value, 0);
  const expectedSum =
    ((Math.min(...primaryNumbers) + Math.max(...primaryNumbers)) * primaryNumbers.length) / 2;
  const sumScore = 1 - Math.min(1, Math.abs(numberSum - expectedSum) / Math.max(expectedSum, 1));
  const tails = new Set(allNumbers.map((value) => value % 10)).size / allNumbers.length;
  let consecutivePenalty = 0;
  const sortedPrimary = [...primaryNumbers].sort((left, right) => left - right);
  for (let index = 1; index < sortedPrimary.length; index += 1) {
    if (sortedPrimary[index] - sortedPrimary[index - 1] === 1) {
      consecutivePenalty += 1;
    }
  }
  const balanceScore = Math.max(0, (oddEvenScore + sumScore + tails) / 3 - consecutivePenalty * 0.05);

  let pairScoreRaw = 0;
  for (let leftIndex = 0; leftIndex < sortedPrimary.length; leftIndex += 1) {
    for (let rightIndex = leftIndex + 1; rightIndex < sortedPrimary.length; rightIndex += 1) {
      pairScoreRaw += pairCounts.get(`${sortedPrimary[leftIndex]}:${sortedPrimary[rightIndex]}`) ?? 0;
    }
  }
  const pairMax = Math.max(...pairCounts.values(), 1);
  const cooccurrenceScore = normalize(pairScoreRaw, pairMax * 3);

  const recentWindow = draws.slice(0, Math.min(20, draws.length));
  let recentHits = 0;
  recentWindow.forEach((draw, index) => {
    const decay = 1 / (index + 1);
    recentHits += intersectionSize(primaryNumbers, draw.primaryNumbers) * decay;
    recentHits += intersectionSize(secondaryNumbers, draw.secondaryNumbers) * decay;
  });
  const recentDecayScore = normalize(recentHits, allNumbers.length * 2);

  const features: Record<FeatureKey, number> = {
    hotScore,
    missingScore,
    balanceScore,
    cooccurrenceScore,
    recentDecayScore,
  };
  const score = clamp01(
    featureKeys.reduce((sum, key) => sum + features[key] * normalizedWeights[key], 0),
  );
  return {
    score,
    report: {
      features: Object.fromEntries(featureKeys.map((key) => [key, Number(features[key].toFixed(4))])),
      featureWeights: normalizedWeights,
    },
  };
}

function weightedFeatureScore(sample: Record<FeatureKey, number>, weights: Record<FeatureKey, number>): number {
  return clamp01(featureKeys.reduce((sum, key) => sum + sample[key] * weights[key], 0));
}

function sampleSingleCandidate(gameCode: GameCode, randomSeed?: number | null): [number[], number[]] {
  const rng = createRandom(randomSeed);
  const definition = getGameDefinition(gameCode);
  const primary = rng.sample(listInclusiveRange(definition.primaryRange), definition.primaryPick).sort((a, b) => a - b);
  const secondary = rng
    .sample(listInclusiveRange(definition.secondaryRange), definition.secondaryPick)
    .sort((a, b) => a - b);
  return [primary, secondary];
}

function featureSample(history: DrawRecord[], primaryNumbers: number[], secondaryNumbers: number[]): Record<FeatureKey, number> {
  const { report } = scoreCandidate(history, primaryNumbers, secondaryNumbers);
  return report.features as Record<FeatureKey, number>;
}

export function buildSlidingWindowTrainingDataset(
  draws: DrawRecord[],
  gameCode: GameCode,
  trainingWindow: number,
  minTrainingSamples: number,
  randomSeed: number,
): TrainingDataset {
  const chronological = [...draws].reverse();
  if (chronological.length < 2) {
    return {
      samples: [],
      labels: [],
      summary: {
        trainingWindow,
        effectiveWindow: 0,
        historicalDraws: draws.length,
        trainingPeriods: 0,
        requestedMinSamples: minTrainingSamples,
        actualSamples: 0,
        positiveSamples: 0,
        negativeSamples: 0,
        negativeSamplesPerPeriod: 0,
        meetsMinSamples: false,
        note: "at least 2 historical draws are required for supervised rolling-window samples",
      },
    };
  }

  const rng = createRandom(randomSeed);
  const effectiveWindow = Math.min(Math.max(1, trainingWindow), chronological.length - 1);
  const trainingPeriods = chronological.length - effectiveWindow;
  const requestedMin = Math.max(0, minTrainingSamples);
  let negativesPerPeriod = 1;
  if (trainingPeriods > 0 && requestedMin > trainingPeriods) {
    negativesPerPeriod = Math.max(1, Math.ceil((requestedMin - trainingPeriods) / trainingPeriods));
  }

  const samples: Array<Record<FeatureKey, number>> = [];
  const labels: number[] = [];
  let positiveSamples = 0;
  let negativeSamples = 0;

  for (let targetIndex = effectiveWindow; targetIndex < chronological.length; targetIndex += 1) {
    const history = [...chronological.slice(targetIndex - effectiveWindow, targetIndex)].reverse();
    const target = chronological[targetIndex];
    samples.push(featureSample(history, target.primaryNumbers, target.secondaryNumbers));
    labels.push(1);
    positiveSamples += 1;

    const targetKey = `${target.primaryNumbers.join(",")}|${target.secondaryNumbers.join(",")}`;
    for (let index = 0; index < negativesPerPeriod; index += 1) {
      let primary: number[];
      let secondary: number[];
      let attempts = 0;
      do {
        primary = rng
          .sample(listInclusiveRange(getGameDefinition(gameCode).primaryRange), getGameDefinition(gameCode).primaryPick)
          .sort((a, b) => a - b);
        secondary = rng
          .sample(listInclusiveRange(getGameDefinition(gameCode).secondaryRange), getGameDefinition(gameCode).secondaryPick)
          .sort((a, b) => a - b);
        attempts += 1;
      } while (`${primary.join(",")}|${secondary.join(",")}` === targetKey && attempts < 8);
      samples.push(featureSample(history, primary, secondary));
      labels.push(0);
      negativeSamples += 1;
    }
  }

  return {
    samples,
    labels,
    summary: {
      trainingWindow,
      effectiveWindow,
      historicalDraws: draws.length,
      trainingPeriods,
      requestedMinSamples: requestedMin,
      actualSamples: samples.length,
      positiveSamples,
      negativeSamples,
      negativeSamplesPerPeriod: negativesPerPeriod,
      meetsMinSamples: samples.length >= requestedMin,
      sampleMethod:
        "for each target draw, score the actual next draw as label=1 and uniformly sampled legal combinations as label=0",
    },
  };
}

export function trainFeatureWeights(dataset: TrainingDataset): Record<string, unknown> {
  const positives = dataset.samples.filter((_, index) => dataset.labels[index] === 1);
  const negatives = dataset.samples.filter((_, index) => dataset.labels[index] === 0);
  if (positives.length === 0 || negatives.length === 0) {
    return {
      featureWeights: { ...defaultFeatureWeights },
      diagnostics: {
        positiveAverageScore: 0,
        negativeAverageScore: 0,
        scoreGap: 0,
        reason: "not enough positive and negative samples; default weights used",
      },
      featureLift: {},
    };
  }

  const featureLift: Record<string, Record<string, number>> = {};
  const rawWeights: Record<string, number> = {};
  for (const key of featureKeys) {
    const positiveAverage = positives.reduce((sum, sample) => sum + sample[key], 0) / positives.length;
    const negativeAverage = negatives.reduce((sum, sample) => sum + sample[key], 0) / negatives.length;
    const lift = positiveAverage - negativeAverage;
    featureLift[key] = {
      positiveAverage: Number(positiveAverage.toFixed(6)),
      negativeAverage: Number(negativeAverage.toFixed(6)),
      lift: Number(lift.toFixed(6)),
    };
    rawWeights[key] = Math.max(0, lift);
  }
  if (Object.values(rawWeights).reduce((sum, value) => sum + value, 0) <= 0) {
    for (const key of featureKeys) {
      rawWeights[key] = Math.abs(featureLift[key].lift);
    }
  }
  const weights = normalizeFeatureWeights(rawWeights);
  const positiveScores = positives.map((sample) => weightedFeatureScore(sample, weights));
  const negativeScores = negatives.map((sample) => weightedFeatureScore(sample, weights));
  const positiveAverageScore = positiveScores.reduce((sum, value) => sum + value, 0) / positiveScores.length;
  const negativeAverageScore = negativeScores.reduce((sum, value) => sum + value, 0) / negativeScores.length;
  return {
    featureWeights: weights,
    diagnostics: {
      positiveAverageScore: Number(positiveAverageScore.toFixed(6)),
      negativeAverageScore: Number(negativeAverageScore.toFixed(6)),
      scoreGap: Number((positiveAverageScore - negativeAverageScore).toFixed(6)),
    },
    featureLift,
  };
}

export function rollingBacktest(
  draws: DrawRecord[],
  gameCode: GameCode,
  window: number,
  randomSeed: number,
  weights?: Record<string, number> | null,
  candidatePoolSize = 96,
  maxPeriods = 240,
): Record<string, unknown> {
  const chronological = [...draws].reverse();
  if (chronological.length < 2) {
    return {
      window,
      effectiveWindow: 0,
      evaluatedPeriods: 0,
      candidatePoolSize,
      modelAveragePrimaryHits: 0,
      modelAverageSecondaryHits: 0,
      randomAveragePrimaryHits: 0,
      randomAverageSecondaryHits: 0,
      note: "not enough historical draws for rolling forward backtest",
    };
  }

  const rng = createRandom(randomSeed);
  const effectiveWindow = Math.min(Math.max(1, window), chronological.length - 1);
  let targetIndexes = Array.from({ length: chronological.length - effectiveWindow }, (_, index) => index + effectiveWindow);
  if (targetIndexes.length > maxPeriods) {
    targetIndexes = targetIndexes.slice(-maxPeriods);
  }

  const modelPrimaryHits: number[] = [];
  const modelSecondaryHits: number[] = [];
  const randomPrimaryHits: number[] = [];
  const randomSecondaryHits: number[] = [];
  const definition = getGameDefinition(gameCode);
  const primaryPool = listInclusiveRange(definition.primaryRange);
  const secondaryPool = listInclusiveRange(definition.secondaryRange);

  for (const targetIndex of targetIndexes) {
    const history = [...chronological.slice(targetIndex - effectiveWindow, targetIndex)].reverse();
    const target = chronological[targetIndex];
    const candidates = Array.from({ length: Math.max(1, candidatePoolSize) }, () => ({
      primary: rng.sample(primaryPool, definition.primaryPick).sort((a, b) => a - b),
      secondary: rng.sample(secondaryPool, definition.secondaryPick).sort((a, b) => a - b),
    }));
    const scored = candidates.map((candidate) => ({
      score: scoreCandidate(history, candidate.primary, candidate.secondary, weights).score,
      ...candidate,
    }));
    scored.sort((left, right) => right.score - left.score);
    const modelTop = scored[0];
    const randomChoice = {
      primary: rng.sample(primaryPool, definition.primaryPick).sort((a, b) => a - b),
      secondary: rng.sample(secondaryPool, definition.secondaryPick).sort((a, b) => a - b),
    };

    modelPrimaryHits.push(intersectionSize(modelTop.primary, target.primaryNumbers));
    modelSecondaryHits.push(intersectionSize(modelTop.secondary, target.secondaryNumbers));
    randomPrimaryHits.push(intersectionSize(randomChoice.primary, target.primaryNumbers));
    randomSecondaryHits.push(intersectionSize(randomChoice.secondary, target.secondaryNumbers));
  }

  return {
    window,
    effectiveWindow,
    evaluatedPeriods: modelPrimaryHits.length,
    candidatePoolSize,
    modelAveragePrimaryHits: Number(average(modelPrimaryHits).toFixed(4)),
    modelAverageSecondaryHits: Number(average(modelSecondaryHits).toFixed(4)),
    randomAveragePrimaryHits: Number(average(randomPrimaryHits).toFixed(4)),
    randomAverageSecondaryHits: Number(average(randomSecondaryHits).toFixed(4)),
    baseline: "uniform random legal combination with fixed seed",
  };
}

export function latestModelProfile(run?: {
  version: string;
  algorithm: string;
  featureSummary: Record<string, unknown>;
} | null): ModelProfile | null {
  if (!run) {
    return null;
  }
  const trained = (run.featureSummary.trainedModel as Record<string, unknown> | undefined) ?? {};
  return {
    modelVersion: run.version,
    algorithm: run.algorithm,
    featureWeights: normalizeFeatureWeights((trained.featureWeights as Record<string, number> | undefined) ?? null),
    training: (run.featureSummary.training as Record<string, unknown> | undefined) ?? {},
    diagnostics: (trained.diagnostics as Record<string, unknown> | undefined) ?? {},
  };
}

export function trainModelDraft(
  gameCode: GameCode,
  draws: DrawRecord[],
  rollingWindow: number,
  randomSeed: number,
  trainingWindow = 100,
  minTrainingSamples = 10_000,
  now = new Date(),
): ModelRunDraft {
  const version = `${modelVersionPrefix}-${gameCode}-${timestampFragment(now)}`;
  const dataset = buildSlidingWindowTrainingDataset(draws, gameCode, trainingWindow, minTrainingSamples, randomSeed);
  const trainedModel = trainFeatureWeights(dataset);
  const backtestReport = rollingBacktest(
    draws,
    gameCode,
    rollingWindow,
    randomSeed,
    trainedModel.featureWeights as Record<string, number>,
  );
  return {
    gameCode,
    version,
    algorithm: algorithmName,
    featureSummary: {
      features: [
        "hot_cold_frequency",
        "missing_periods",
        "sum",
        "odd_even_ratio",
        "zone_distribution",
        "consecutive_numbers",
        "tail_digits",
        "cooccurrence_matrix",
        "recent_decay",
      ],
      candidatePool: "monteCarlo",
      training: dataset.summary,
      trainedModel,
      mlTraining: {
        enabled: false,
        reason: "Node rewrite keeps explainable ranker only; optional gradient boosting can be added offline later",
      },
    },
    backtestReport,
  };
}

function average(values: number[]): number {
  return values.length === 0 ? 0 : values.reduce((sum, value) => sum + value, 0) / values.length;
}

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

function intersectionSize(left: readonly number[], right: readonly number[]): number {
  const rightSet = new Set(right);
  return left.reduce((sum, value) => sum + (rightSet.has(value) ? 1 : 0), 0);
}

function timestampFragment(date: Date): string {
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getUTCFullYear()}${pad(date.getUTCMonth() + 1)}${pad(date.getUTCDate())}${pad(date.getUTCHours())}${pad(date.getUTCMinutes())}${pad(date.getUTCSeconds())}`;
}
