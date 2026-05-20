import { ComplexPreference, GameCode, GenerateMode, JobType, MembershipStatus, OrderStatus } from "./enums";

export interface GameDefinition {
  code: GameCode;
  name: string;
  primaryLabel: string;
  secondaryLabel: string;
  primaryRange: [number, number];
  secondaryRange: [number, number];
  primaryPick: number;
  secondaryPick: number;
  ticketPrice: number;
  baseFirstPrize: number;
  ruleSourceUrl: string;
  drawSourceUrl: string;
}

export interface DrawRecord {
  gameCode: GameCode;
  issue: string;
  drawDate: string | null;
  primaryNumbers: number[];
  secondaryNumbers: number[];
  prizeTiers: Array<Record<string, unknown>>;
  sourceUrl: string;
  sourceHash: string;
}

export interface HistoricalDraw {
  issue: string;
  primaryNumbers: ReadonlySet<number>;
  secondaryNumbers: ReadonlySet<number>;
}

export interface ModelProfile {
  modelVersion?: string | null;
  algorithm?: string | null;
  featureWeights?: Record<string, number> | null;
  training?: Record<string, unknown> | null;
  diagnostics?: Record<string, unknown> | null;
}

export interface GeneratedCandidate {
  gameCode: GameCode;
  primaryNumbers: number[];
  secondaryNumbers: number[];
  totalBets: number;
  stakeMultiplier: number;
  totalCost: number;
  maxPrize: number;
  modelScore?: number | null;
  excludedHistoryIssue?: string | null;
}

export interface GenerateRequestContract {
  gameCode: GameCode;
  mode: GenerateMode;
  count: number;
  budgetMin?: number | null;
  budgetMax?: number | null;
  complexPreference: ComplexPreference;
  excludeHighPrizeHistory: boolean;
  targetPrizeMode: boolean;
  randomSeed?: number | null;
}

export interface GenerateResponseContract {
  mode: GenerateMode;
  candidates: GeneratedCandidate[];
  dataVersion: string;
  modelVersion?: string | null;
  memberFeature: boolean;
  riskTips: string[];
  modelReport?: Record<string, unknown> | null;
}

export interface GameSummary {
  code: GameCode;
  name: string;
  ticketPrice: number;
  ruleSourceUrl: string;
  drawSourceUrl: string;
  latestIssue: string | null;
  drawCount: number;
}

export interface StatsResponseContract {
  gameCode: GameCode;
  drawCount: number;
  latestIssue: string | null;
  primaryFrequency: Record<number, number>;
  secondaryFrequency: Record<number, number>;
  primaryMissingPeriods: Record<number, number>;
  secondaryMissingPeriods: Record<number, number>;
  dataVersion: string;
}

export interface UserProfile {
  id: string;
  openId: string;
  unionId?: string | null;
  nickname?: string | null;
  avatarUrl?: string | null;
  isAdmin: boolean;
}

export interface MembershipSummary {
  status: MembershipStatus;
  productId?: string | null;
  expiresAt?: string | null;
  source: "gift" | "wechatPay" | "system";
}

export interface ProductSummary {
  id: string;
  code: string;
  name: string;
  priceFen: number;
  durationDays: number;
  active: boolean;
}

export interface OrderSummary {
  orderNo: string;
  productId: string;
  productName: string;
  priceFen: number;
  status: OrderStatus;
  createdAt: string;
  paidAt?: string | null;
  expiresAt?: string | null;
}

export interface PaymentPrepayRequestContract {
  productCode: string;
}

export interface PaymentPrepayResponseContract {
  orderNo: string;
  prepayId: string;
  timeStamp: string;
  nonceStr: string;
  packageValue: string;
  signType: "RSA";
  paySign: string;
}

export interface PaymentNotifyPayload {
  id: string;
  createTime: string;
  eventType: string;
  resourceType: string;
  summary: string;
  resource: {
    algorithm: string;
    ciphertext: string;
    associatedData: string;
    nonce: string;
    originalType: string;
  };
}

export interface BootstrapLoginResponse {
  token: string;
  expiresIn: number;
  profile: UserProfile;
}

export interface AdminJobRun {
  id: string;
  jobType: JobType;
  startedAt: string;
  finishedAt?: string | null;
  status: "pending" | "running" | "succeeded" | "failed";
  payload?: Record<string, unknown> | null;
  result?: Record<string, unknown> | null;
}

export interface SyncRequestContract {
  gameCode: GameCode;
  limit: number;
}

export interface TrainRequestContract {
  gameCode: GameCode;
  rollingWindow: number;
  trainingWindow: number;
  minTrainingSamples: number;
  randomSeed: number;
}
