export enum GameCode {
  DOUBLE_COLOR_BALL = "ssq",
  SUPER_LOTTO = "dlt",
}

export enum GenerateMode {
  RANDOM = "random",
  EXCLUDE_HISTORY = "excludeHistory",
  MODEL_PREDICTION = "modelPrediction",
}

export enum ComplexPreference {
  SINGLE = "single",
  CONSERVATIVE = "conservative",
  BALANCED = "balanced",
  AGGRESSIVE = "aggressive",
}

export enum MembershipStatus {
  INACTIVE = "inactive",
  ACTIVE = "active",
  EXPIRED = "expired",
}

export enum OrderStatus {
  PENDING = "pending",
  PAID = "paid",
  FAILED = "failed",
  REFUNDED = "refunded",
  CLOSED = "closed",
}

export enum JobType {
  SYNC_SSQ = "sync_ssq",
  SYNC_DLT = "sync_dlt",
  TRAIN_SSQ = "train_ssq",
  TRAIN_DLT = "train_dlt",
  RECONCILE_PAYMENTS = "reconcile_payments",
  HEALTHCHECK_SOURCES = "healthcheck_sources",
}
