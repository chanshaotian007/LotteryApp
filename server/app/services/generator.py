import random

from app.db.models import Draw
from app.domain.combinatorics import calculate_bets
from app.domain.exclusion import Candidate, would_match_historical_high_prize
from app.domain.games import ComplexPreference, GameCode, GenerateMode, get_game_definition
from app.services.modeling import normalize_feature_weights, score_candidate


TARGET_FIRST_PRIZE = 50_000_000


def _required_stake_multiplier(base_first_prize: int, target_prize: int = TARGET_FIRST_PRIZE) -> int:
    return (target_prize + base_first_prize - 1) // base_first_prize


def _count_ranges(game_code: GameCode, preference: ComplexPreference) -> tuple[range, range]:
    if game_code == GameCode.DOUBLE_COLOR_BALL:
        ranges = {
            ComplexPreference.SINGLE: (range(6, 7), range(1, 2)),
            ComplexPreference.CONSERVATIVE: (range(7, 9), range(1, 3)),
            ComplexPreference.BALANCED: (range(8, 11), range(2, 5)),
            ComplexPreference.AGGRESSIVE: (range(10, 13), range(3, 7)),
        }
        return ranges[preference]
    ranges = {
        ComplexPreference.SINGLE: (range(5, 6), range(2, 3)),
        ComplexPreference.CONSERVATIVE: (range(6, 8), range(2, 4)),
        ComplexPreference.BALANCED: (range(7, 10), range(3, 6)),
        ComplexPreference.AGGRESSIVE: (range(9, 12), range(4, 8)),
    }
    return ranges[preference]


def _historical(draws: list[Draw]):
    from app.services.repository import to_historical_draws

    return to_historical_draws(draws)


def _build_candidate(
    rng: random.Random,
    game_code: GameCode,
    preference: ComplexPreference,
) -> tuple[list[int], list[int]]:
    definition = get_game_definition(game_code)
    primary_range, secondary_range = _count_ranges(game_code, preference)
    primary_count = rng.choice(list(primary_range))
    secondary_count = rng.choice(list(secondary_range))
    primary = sorted(rng.sample(list(definition.primary_range), primary_count))
    secondary = sorted(rng.sample(list(definition.secondary_range), secondary_count))
    return primary, secondary


def generate_candidates(
    *,
    game_code: GameCode,
    mode: GenerateMode,
    count: int,
    preference: ComplexPreference,
    budget_min: int | None,
    budget_max: int | None,
    exclude_history: bool,
    target_prize_mode: bool,
    random_seed: int | None,
    draws: list[Draw],
    model_profile: dict | None = None,
) -> tuple[list[dict], dict | None]:
    rng = random.Random(random_seed)
    definition = get_game_definition(game_code)
    historical = _historical(draws)
    generated: list[dict] = []
    model_reports: list[dict] = []
    model_weights = normalize_feature_weights(
        (model_profile or {}).get("feature_weights")
    )
    pool_multiplier = 80 if mode == GenerateMode.MODEL_PREDICTION else 1
    attempts = 0
    max_attempts = max(5000, count * pool_multiplier * 50)

    while attempts < max_attempts and len(generated) < count * pool_multiplier:
        attempts += 1
        primary, secondary = _build_candidate(rng, game_code, preference)
        total_bets = calculate_bets(
            len(primary),
            len(secondary),
            definition.primary_pick,
            definition.secondary_pick,
        )
        stake_multiplier = (
            _required_stake_multiplier(definition.base_first_prize)
            if target_prize_mode
            else 1
        )
        total_cost = total_bets * definition.ticket_price * stake_multiplier
        max_prize = definition.base_first_prize * stake_multiplier
        if budget_min is not None and total_cost < budget_min:
            continue
        if budget_max is not None and total_cost > budget_max:
            continue
        excluded_issue = None
        if exclude_history:
            excluded, excluded_issue = would_match_historical_high_prize(
                Candidate(game_code, tuple(primary), tuple(secondary)),
                historical,
            )
            if excluded:
                continue
        score = None
        report = None
        if mode == GenerateMode.MODEL_PREDICTION:
            score, report = score_candidate(draws, primary, secondary, model_weights)
            model_reports.append(report)
        generated.append(
            {
                "game_code": game_code,
                "primary_numbers": primary,
                "secondary_numbers": secondary,
                "total_bets": total_bets,
                "stake_multiplier": stake_multiplier,
                "total_cost": total_cost,
                "max_prize": max_prize,
                "model_score": round(score, 4) if score is not None else None,
                "excluded_history_issue": excluded_issue,
            }
        )

    candidate_pool_size = len(generated)
    if mode == GenerateMode.MODEL_PREDICTION:
        generated.sort(key=lambda item: item["model_score"] or 0.0, reverse=True)
        generated = _diverse_top(generated, count)
    else:
        generated = generated[:count]

    report = None
    if mode == GenerateMode.MODEL_PREDICTION:
        report = {
            "candidate_pool_size": candidate_pool_size,
            "scoring": "trained explainable frequency, missing, balance, cooccurrence, recent decay",
            "feature_weights": model_weights,
            "model_training": (model_profile or {}).get("training", {}),
            "model_diagnostics": (model_profile or {}).get("diagnostics", {}),
            "top_feature_sample": model_reports[0]["features"] if model_reports else {},
        }
    return generated, report


def _diverse_top(candidates: list[dict], count: int) -> list[dict]:
    selected: list[dict] = []
    seen_primary: set[tuple[int, ...]] = set()
    for candidate in candidates:
        primary_key = tuple(candidate["primary_numbers"][:3])
        if primary_key in seen_primary and len(candidates) >= count * 2:
            continue
        selected.append(candidate)
        seen_primary.add(primary_key)
        if len(selected) == count:
            break
    return selected
