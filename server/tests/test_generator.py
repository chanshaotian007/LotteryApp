from sqlalchemy.orm import Session

from app.domain.games import ComplexPreference, GameCode, GenerateMode
from app.services.generator import generate_candidates
from app.services.repository import list_draws


def test_budget_generation_respects_cost_bounds(seeded_db: Session) -> None:
    candidates, _ = generate_candidates(
        game_code=GameCode.DOUBLE_COLOR_BALL,
        mode=GenerateMode.RANDOM,
        count=3,
        preference=ComplexPreference.CONSERVATIVE,
        budget_min=14,
        budget_max=60,
        exclude_history=False,
        target_prize_mode=False,
        random_seed=42,
        draws=list_draws(seeded_db, GameCode.DOUBLE_COLOR_BALL, 100),
    )

    assert len(candidates) == 3
    assert all(14 <= candidate["total_cost"] <= 60 for candidate in candidates)


def test_history_exclusion_filters_seeded_high_prize_match(seeded_db: Session) -> None:
    draws = list_draws(seeded_db, GameCode.DOUBLE_COLOR_BALL, 100)
    candidates, _ = generate_candidates(
        game_code=GameCode.DOUBLE_COLOR_BALL,
        mode=GenerateMode.EXCLUDE_HISTORY,
        count=5,
        preference=ComplexPreference.CONSERVATIVE,
        budget_min=None,
        budget_max=None,
        exclude_history=True,
        target_prize_mode=False,
        random_seed=3,
        draws=draws,
    )

    historical_red = set(draws[0].primary_numbers)
    assert len(candidates) == 5
    assert all(not historical_red.issubset(candidate["primary_numbers"]) for candidate in candidates)


def test_target_prize_mode_applies_stake_multiplier_and_cost(seeded_db: Session) -> None:
    candidates, _ = generate_candidates(
        game_code=GameCode.DOUBLE_COLOR_BALL,
        mode=GenerateMode.RANDOM,
        count=1,
        preference=ComplexPreference.SINGLE,
        budget_min=None,
        budget_max=None,
        exclude_history=False,
        target_prize_mode=True,
        random_seed=5,
        draws=list_draws(seeded_db, GameCode.DOUBLE_COLOR_BALL, 100),
    )

    candidate = candidates[0]
    assert candidate["total_bets"] == 1
    assert candidate["stake_multiplier"] == 10
    assert candidate["total_cost"] == 20
    assert candidate["max_prize"] == 50_000_000
