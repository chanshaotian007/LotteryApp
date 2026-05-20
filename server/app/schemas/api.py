from datetime import date

from typing import Any

from pydantic import BaseModel, Field, model_validator

from app.domain.games import ComplexPreference, GameCode, GenerateMode


class GameResponse(BaseModel):
    code: GameCode
    name: str
    ticket_price: int
    rule_source_url: str
    draw_source_url: str
    latest_issue: str | None = None
    draw_count: int = 0


class DrawResponse(BaseModel):
    game_code: GameCode
    issue: str
    draw_date: date | None = None
    primary_numbers: list[int]
    secondary_numbers: list[int]
    source_url: str
    source_hash: str
    prize_tiers: list[dict] = Field(default_factory=list)


class StatsResponse(BaseModel):
    game_code: GameCode
    draw_count: int
    latest_issue: str | None
    primary_frequency: dict[int, int]
    secondary_frequency: dict[int, int]
    primary_missing_periods: dict[int, int]
    secondary_missing_periods: dict[int, int]
    data_version: str


class GenerateRequest(BaseModel):
    game_code: GameCode
    mode: GenerateMode = GenerateMode.RANDOM
    count: int = Field(default=1, ge=1, le=20)
    budget_min: int | None = Field(default=None, ge=0)
    budget_max: int | None = Field(default=None, ge=1)
    complex_preference: ComplexPreference = ComplexPreference.BALANCED
    exclude_high_prize_history: bool = False
    target_prize_mode: bool = False
    random_seed: int | None = None

    @model_validator(mode="before")
    @classmethod
    def normalize_legacy_payload(cls, data: Any) -> Any:
        if not isinstance(data, dict):
            return data
        normalized = dict(data)
        aliases = {
            "game_code": ("gameCode", "lottery_type", "lotteryType", "type"),
            "mode": ("generate_mode", "generateMode"),
            "budget_min": ("budgetMin",),
            "budget_max": ("budgetMax",),
            "complex_preference": ("complexPreference", "preference", "complexity"),
            "exclude_high_prize_history": ("excludeHighPrizeHistory", "excludeHistory"),
            "target_prize_mode": ("targetPrizeMode", "highPrizeMode"),
            "random_seed": ("randomSeed",),
        }
        for canonical, legacy_names in aliases.items():
            if canonical in normalized:
                continue
            for legacy_name in legacy_names:
                if legacy_name in normalized:
                    normalized[canonical] = normalized[legacy_name]
                    break

        game_code = _lower_token(normalized.get("game_code"))
        if game_code in {"doublecolorball", "double_color_ball", "ssq", "shuangseqiu", "双色球"}:
            normalized["game_code"] = "ssq"
        elif game_code in {"superlotto", "super_lotto", "dlt", "daletou", "大乐透"}:
            normalized["game_code"] = "dlt"

        mode = _lower_token(normalized.get("mode"))
        if mode in {"prediction", "predict", "ai", "model", "modelprediction"}:
            normalized["mode"] = "model_prediction"
        elif mode in {"exclude", "history", "historyexclusion", "excludehistory"}:
            normalized["mode"] = "exclude_history"
        elif mode in {"random", "localrandom", "normal"}:
            normalized["mode"] = "random"

        preference = _lower_token(normalized.get("complex_preference"))
        if isinstance(normalized.get("complex_preference"), bool):
            normalized["complex_preference"] = "balanced" if normalized["complex_preference"] else "single"
        elif preference in {"simple", "single", "dan", "单式"}:
            normalized["complex_preference"] = "single"
        elif preference in {"low", "conservative", "small", "保守"}:
            normalized["complex_preference"] = "conservative"
        elif preference in {"high", "aggressive", "large", "激进"}:
            normalized["complex_preference"] = "aggressive"
        elif preference in {
            "complex",
            "compound",
            "highprize",
            "high_prize",
            "targetprize",
            "target_prize",
            "复式",
            "高奖",
        }:
            normalized["complex_preference"] = "balanced"

        for budget_key in ("budget_min", "budget_max"):
            value = normalized.get(budget_key)
            if value == "":
                normalized[budget_key] = None
            elif budget_key == "budget_max":
                try:
                    if value is not None and int(value) <= 0:
                        normalized[budget_key] = None
                except (TypeError, ValueError):
                    pass
        return normalized

    @model_validator(mode="after")
    def validate_budget(self) -> "GenerateRequest":
        if (
            self.budget_min is not None
            and self.budget_max is not None
            and self.budget_min > self.budget_max
        ):
            raise ValueError("budget_min must be less than or equal to budget_max")
        return self


def _lower_token(value: Any) -> str:
    if value is None:
        return ""
    return str(value).strip().lower().replace("-", "_").replace(" ", "").replace("__", "_")


class GeneratedCandidate(BaseModel):
    game_code: GameCode
    primary_numbers: list[int]
    secondary_numbers: list[int]
    total_bets: int
    stake_multiplier: int
    total_cost: int
    max_prize: int
    model_score: float | None = None
    excluded_history_issue: str | None = None


class GenerateResponse(BaseModel):
    mode: GenerateMode
    candidates: list[GeneratedCandidate]
    data_version: str
    model_version: str | None
    member_feature: bool
    risk_tips: list[str]
    model_report: dict | None = None


class SyncRequest(BaseModel):
    game_code: GameCode
    limit: int = Field(default=100, ge=1, le=5000)


class SyncResponse(BaseModel):
    game_code: GameCode
    fetched: int
    inserted: int
    updated: int
    data_version: str


class TrainRequest(BaseModel):
    game_code: GameCode
    rolling_window: int = Field(default=100, ge=10, le=1000)
    training_window: int = Field(default=100, ge=2, le=1000)
    min_training_samples: int = Field(default=10_000, ge=0, le=200_000)
    random_seed: int = 20260509


class TrainResponse(BaseModel):
    game_code: GameCode
    model_version: str
    algorithm: str
    backtest_report: dict
    training_report: dict


class EntitlementVerifyRequest(BaseModel):
    platform: str = Field(default="google_play")
    package_name: str | None = None
    product_id: str
    purchase_token: str = Field(min_length=1)
    product_type: str = Field(default="subscription")


class EntitlementVerifyResponse(BaseModel):
    active: bool
    platform: str
    product_id: str
    entitlement: str | None = None
    entitlement_token: str | None = None
    source: str
    message: str
    raw_state: dict | None = None
