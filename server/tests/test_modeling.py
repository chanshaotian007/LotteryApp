from sqlalchemy.orm import Session

from app.db.models import Draw
from app.domain.games import GameCode
from app.services.modeling import (
    build_sliding_window_training_dataset,
    normalize_feature_weights,
    train_feature_weights,
    train_model,
)


def _cycle_numbers(index: int, max_number: int, count: int, step: int) -> list[int]:
    numbers: list[int] = []
    cursor = index
    while len(numbers) < count:
        number = cursor % max_number + 1
        if number not in numbers:
            numbers.append(number)
        cursor += step
    return sorted(numbers)


def _synthetic_ssq_draws(count: int) -> list[Draw]:
    chronological = [
        Draw(
            game_code="ssq",
            issue=f"2026{index:04d}",
            draw_date=None,
            primary_numbers=_cycle_numbers(index, 33, 6, 7),
            secondary_numbers=_cycle_numbers(index, 16, 1, 5),
            prize_tiers=[],
            source_url=f"fixture://ssq/{index}",
            source_hash=f"hash-{index}",
        )
        for index in range(count)
    ]
    return list(reversed(chronological))


def test_sliding_window_training_dataset_reaches_requested_sample_size() -> None:
    dataset = build_sliding_window_training_dataset(
        draws=_synthetic_ssq_draws(105),
        game_code=GameCode.DOUBLE_COLOR_BALL,
        training_window=100,
        min_training_samples=10_000,
        random_seed=7,
    )

    assert dataset.summary["effective_window"] == 100
    assert dataset.summary["training_periods"] == 5
    assert dataset.summary["actual_samples"] >= 10_000
    assert dataset.summary["meets_min_samples"] is True
    assert sum(dataset.labels) == dataset.summary["positive_samples"]


def test_train_feature_weights_returns_normalized_weights() -> None:
    dataset = build_sliding_window_training_dataset(
        draws=_synthetic_ssq_draws(105),
        game_code=GameCode.DOUBLE_COLOR_BALL,
        training_window=100,
        min_training_samples=500,
        random_seed=11,
    )
    trained = train_feature_weights(dataset)
    weights = normalize_feature_weights(trained["feature_weights"])

    assert round(sum(weights.values()), 4) == 1.0
    assert set(weights) == {
        "hot_score",
        "missing_score",
        "balance_score",
        "cooccurrence_score",
        "recent_decay_score",
    }
    assert "score_gap" in trained["diagnostics"]


def test_train_model_persists_training_report(db_session: Session) -> None:
    run = train_model(
        db=db_session,
        game_code=GameCode.DOUBLE_COLOR_BALL,
        draws=_synthetic_ssq_draws(105),
        rolling_window=100,
        random_seed=13,
        training_window=100,
        min_training_samples=500,
    )

    assert run.version.startswith("ranker-v2-ssq-")
    assert run.feature_summary["training"]["actual_samples"] >= 500
    assert run.feature_summary["training"]["effective_window"] == 100
    assert round(sum(run.feature_summary["trained_model"]["feature_weights"].values()), 4) == 1.0
    assert run.backtest_report["evaluated_periods"] == 5
