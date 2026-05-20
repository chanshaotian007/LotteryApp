from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session

from app.core.rate_limit import check_generate_rate_limit
from app.core.security import is_member, require_admin
from app.db.session import get_db
from app.domain.games import GAME_DEFINITIONS, ComplexPreference, GameCode, GenerateMode
from app.schemas.api import (
    DrawResponse,
    GameResponse,
    GenerateRequest,
    GenerateResponse,
    StatsResponse,
    SyncRequest,
    SyncResponse,
    EntitlementVerifyRequest,
    EntitlementVerifyResponse,
    TrainRequest,
    TrainResponse,
)
from app.services.billing import verify_entitlement
from app.services.generator import generate_candidates
from app.services.modeling import (
    latest_model_profile,
    latest_model_report,
    latest_model_version,
    train_model,
)
from app.services.repository import (
    data_version,
    draw_count,
    ensure_games,
    latest_issue,
    list_draws,
    list_games,
)
from app.services.stats import build_stats
from app.services.sync import sync_game


router = APIRouter(prefix="/v1")


def _generate_with_compatibility_fallback(
    payload: GenerateRequest,
    draws: list,
    exclude: bool,
    model_profile: dict | None,
) -> tuple[list[dict], dict | None]:
    attempts: list[dict] = [
        {
            "preference": payload.complex_preference,
            "target_prize_mode": payload.target_prize_mode,
            "budget_min": payload.budget_min,
            "budget_max": payload.budget_max,
            "exclude_history": exclude,
            "fallback_reason": None,
        }
    ]
    if payload.target_prize_mode:
        attempts.append(
            {
                "preference": payload.complex_preference,
                "target_prize_mode": False,
                "budget_min": payload.budget_min,
                "budget_max": payload.budget_max,
                "exclude_history": exclude,
                "fallback_reason": "disabled target_prize_mode because it exceeded the requested budget",
            }
        )
    for preference in (
        ComplexPreference.SINGLE,
        ComplexPreference.CONSERVATIVE,
        ComplexPreference.BALANCED,
    ):
        if preference == payload.complex_preference and not payload.target_prize_mode:
            continue
        attempts.append(
            {
                "preference": preference,
                "target_prize_mode": False,
                "budget_min": payload.budget_min,
                "budget_max": payload.budget_max,
                "exclude_history": exclude,
                "fallback_reason": f"reduced complex_preference to {preference.value} to satisfy budget constraints",
            }
        )
    if exclude:
        attempts.append(
            {
                "preference": ComplexPreference.SINGLE,
                "target_prize_mode": False,
                "budget_min": payload.budget_min,
                "budget_max": payload.budget_max,
                "exclude_history": False,
                "fallback_reason": "disabled history exclusion after stricter attempts produced no candidates",
            }
        )
    if payload.budget_min is not None or payload.budget_max is not None:
        attempts.append(
            {
                "preference": ComplexPreference.SINGLE,
                "target_prize_mode": False,
                "budget_min": None,
                "budget_max": None,
                "exclude_history": False,
                "fallback_reason": "relaxed budget constraints because no legal ticket matched the requested range",
            }
        )

    seen: set[tuple] = set()
    for attempt in attempts:
        key = (
            attempt["preference"],
            attempt["target_prize_mode"],
            attempt["budget_min"],
            attempt["budget_max"],
            attempt["exclude_history"],
        )
        if key in seen:
            continue
        seen.add(key)
        candidates, model_report = generate_candidates(
            game_code=payload.game_code,
            mode=payload.mode,
            count=payload.count,
            preference=attempt["preference"],
            budget_min=attempt["budget_min"],
            budget_max=attempt["budget_max"],
            exclude_history=attempt["exclude_history"],
            target_prize_mode=attempt["target_prize_mode"],
            random_seed=payload.random_seed,
            draws=draws,
            model_profile=model_profile,
        )
        if candidates:
            if attempt["fallback_reason"]:
                model_report = model_report or {}
                model_report["compatibility_fallback"] = {
                    "reason": attempt["fallback_reason"],
                    "applied_preference": attempt["preference"].value,
                    "target_prize_mode": attempt["target_prize_mode"],
                    "budget_min": attempt["budget_min"],
                    "budget_max": attempt["budget_max"],
                    "exclude_history": attempt["exclude_history"],
                }
            return candidates, model_report
    return [], None


@router.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@router.get("/games", response_model=list[GameResponse])
def get_games(db: Session = Depends(get_db)) -> list[dict]:
    games = list_games(db)
    return [
        {
            "code": game.code,
            "name": game.name,
            "ticket_price": game.ticket_price,
            "rule_source_url": game.rule_source_url,
            "draw_source_url": game.draw_source_url,
            "latest_issue": latest_issue(db, GameCode(game.code)),
            "draw_count": draw_count(db, GameCode(game.code)),
        }
        for game in games
    ]


@router.get("/draws", response_model=list[DrawResponse])
def get_draws(
    game_code: GameCode,
    limit: int = 50,
    db: Session = Depends(get_db),
) -> list[dict]:
    draws = list_draws(db, game_code, max(1, min(limit, 500)))
    return [
        {
            "game_code": draw.game_code,
            "issue": draw.issue,
            "draw_date": draw.draw_date,
            "primary_numbers": draw.primary_numbers,
            "secondary_numbers": draw.secondary_numbers,
            "source_url": draw.source_url,
            "source_hash": draw.source_hash,
            "prize_tiers": draw.prize_tiers,
        }
        for draw in draws
    ]


@router.get("/stats", response_model=StatsResponse)
def get_stats(
    game_code: GameCode,
    db: Session = Depends(get_db),
) -> dict:
    draws = list_draws(db, game_code, 5000)
    return build_stats(game_code, draws, data_version(db, game_code))


@router.post("/generate", response_model=GenerateResponse)
def post_generate(
    request: Request,
    payload: GenerateRequest,
    db: Session = Depends(get_db),
    member: bool = Depends(is_member),
) -> dict:
    check_generate_rate_limit(request)
    uses_member_feature = (
        payload.mode != GenerateMode.RANDOM
        or payload.exclude_high_prize_history
        or payload.budget_min is not None
        or payload.budget_max is not None
    )
    if uses_member_feature and not member:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="membership is required for history exclusion, model prediction, and budget generation",
        )

    draws = list_draws(db, payload.game_code, 20_000)
    exclude = payload.exclude_high_prize_history or payload.mode in {
        GenerateMode.EXCLUDE_HISTORY,
        GenerateMode.MODEL_PREDICTION,
    }
    candidates, model_report = _generate_with_compatibility_fallback(
        payload=payload,
        draws=draws,
        exclude=exclude,
        model_profile=latest_model_profile(db, payload.game_code),
    )
    if not candidates:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="no candidate matched the requested budget and exclusion constraints",
        )
    stored_model_report = latest_model_report(db, payload.game_code)
    response_model_report = model_report
    if stored_model_report:
        response_model_report = response_model_report or {}
        response_model_report["latest_model_backtest"] = stored_model_report
    return {
        "mode": payload.mode,
        "candidates": candidates,
        "data_version": data_version(db, payload.game_code),
        "model_version": latest_model_version(db, payload.game_code),
        "member_feature": uses_member_feature,
        "risk_tips": [
            "Generated numbers are statistical recommendations, not a winning guarantee.",
            "This service does not sell lottery tickets, broker purchases, issue tickets, or process betting payments.",
            "Use official rules and announcements as the final source of truth.",
        ],
        "model_report": response_model_report,
    }


@router.post("/entitlements/verify", response_model=EntitlementVerifyResponse)
def post_entitlement_verify(payload: EntitlementVerifyRequest) -> dict:
    result = verify_entitlement(payload)
    return {
        "active": result.active,
        "platform": result.platform,
        "product_id": result.product_id,
        "entitlement": result.entitlement,
        "entitlement_token": result.entitlement_token,
        "source": result.source,
        "message": result.message,
        "raw_state": result.raw_state,
    }


@router.post(
    "/admin/sync",
    response_model=SyncResponse,
    dependencies=[Depends(require_admin)],
)
def post_admin_sync(payload: SyncRequest, db: Session = Depends(get_db)) -> dict:
    result = sync_game(db, payload.game_code, payload.limit)
    return {
        "game_code": payload.game_code,
        "fetched": result.fetched,
        "inserted": result.inserted,
        "updated": result.updated,
        "data_version": result.data_version,
    }


@router.post(
    "/admin/train",
    response_model=TrainResponse,
    dependencies=[Depends(require_admin)],
)
def post_admin_train(payload: TrainRequest, db: Session = Depends(get_db)) -> dict:
    draws = list_draws(db, payload.game_code, 20_000)
    run = train_model(
        db,
        payload.game_code,
        draws,
        payload.rolling_window,
        payload.random_seed,
        payload.training_window,
        payload.min_training_samples,
    )
    return {
        "game_code": payload.game_code,
        "model_version": run.version,
        "algorithm": run.algorithm,
        "backtest_report": run.backtest_report,
        "training_report": run.feature_summary.get("training", {}),
    }


def seed_builtin_games(db: Session) -> None:
    ensure_games(db)
    missing = {code.value for code in GAME_DEFINITIONS} - {game.code for game in list_games(db)}
    if missing:
        ensure_games(db)
