from collections import Counter, defaultdict
from dataclasses import dataclass
from datetime import datetime
from math import ceil
import random
from typing import Mapping

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db.models import Draw, ModelRun
from app.domain.games import GameCode, get_game_definition


MODEL_VERSION_PREFIX = "ranker-v2"
ALGORITHM_NAME = "sliding-window supervised candidate ranker with explainable features and optional LightGBM hook"
FEATURE_KEYS = (
    "hot_score",
    "missing_score",
    "balance_score",
    "cooccurrence_score",
    "recent_decay_score",
)
DEFAULT_FEATURE_WEIGHTS = {
    "hot_score": 0.30,
    "missing_score": 0.20,
    "balance_score": 0.20,
    "cooccurrence_score": 0.15,
    "recent_decay_score": 0.15,
}


@dataclass(frozen=True)
class CandidateFeatures:
    hot_score: float
    missing_score: float
    balance_score: float
    cooccurrence_score: float
    recent_decay_score: float

    @property
    def total(self) -> float:
        return self.weighted_total(DEFAULT_FEATURE_WEIGHTS)

    def as_dict(self) -> dict[str, float]:
        return {
            "hot_score": self.hot_score,
            "missing_score": self.missing_score,
            "balance_score": self.balance_score,
            "cooccurrence_score": self.cooccurrence_score,
            "recent_decay_score": self.recent_decay_score,
        }

    def weighted_total(self, weights: Mapping[str, float] | None = None) -> float:
        normalized = normalize_feature_weights(weights)
        weighted = sum(self.as_dict()[key] * normalized[key] for key in FEATURE_KEYS)
        return max(0.0, min(1.0, weighted))


@dataclass(frozen=True)
class TrainingDataset:
    samples: list[dict[str, float]]
    labels: list[int]
    summary: dict


def normalize_feature_weights(weights: Mapping[str, float] | None = None) -> dict[str, float]:
    if not weights:
        return dict(DEFAULT_FEATURE_WEIGHTS)
    cleaned = {
        key: max(0.0, float(weights.get(key, 0.0)))
        for key in FEATURE_KEYS
    }
    total = sum(cleaned.values())
    if total <= 0:
        return dict(DEFAULT_FEATURE_WEIGHTS)
    return {key: round(cleaned[key] / total, 6) for key in FEATURE_KEYS}


def latest_model_version(db: Session, game_code: GameCode) -> str | None:
    return db.scalar(
        select(ModelRun.version)
        .where(ModelRun.game_code == game_code.value)
        .order_by(ModelRun.created_at.desc())
        .limit(1)
    )


def latest_model_report(db: Session, game_code: GameCode) -> dict | None:
    run = db.scalar(
        select(ModelRun)
        .where(ModelRun.game_code == game_code.value)
        .order_by(ModelRun.created_at.desc())
        .limit(1)
    )
    if run is None:
        return None
    return {
        "model_version": run.version,
        "algorithm": run.algorithm,
        "feature_summary": run.feature_summary,
        "backtest_report": run.backtest_report,
    }


def latest_model_profile(db: Session, game_code: GameCode) -> dict | None:
    run = db.scalar(
        select(ModelRun)
        .where(ModelRun.game_code == game_code.value)
        .order_by(ModelRun.created_at.desc())
        .limit(1)
    )
    if run is None:
        return None
    trained = run.feature_summary.get("trained_model", {})
    return {
        "model_version": run.version,
        "algorithm": run.algorithm,
        "feature_weights": normalize_feature_weights(trained.get("feature_weights")),
        "training": run.feature_summary.get("training", {}),
        "diagnostics": trained.get("diagnostics", {}),
    }


def _normalize(value: float, max_value: float) -> float:
    if max_value <= 0:
        return 0.0
    return max(0.0, min(1.0, value / max_value))


def _number_stats(draws: list[Draw], attr: str) -> tuple[Counter[int], dict[int, int]]:
    frequency: Counter[int] = Counter()
    missing: dict[int, int] = defaultdict(lambda: len(draws))
    for index, draw in enumerate(draws):
        values = getattr(draw, attr)
        frequency.update(values)
        for value in values:
            if missing[value] == len(draws):
                missing[value] = index
    return frequency, dict(missing)


def _cooccurrence(draws: list[Draw], attr: str) -> Counter[tuple[int, int]]:
    counter: Counter[tuple[int, int]] = Counter()
    for draw in draws:
        values = sorted(getattr(draw, attr))
        for left_index, left in enumerate(values):
            for right in values[left_index + 1 :]:
                counter[(left, right)] += 1
    return counter


def score_candidate(
    draws: list[Draw],
    primary_numbers: list[int],
    secondary_numbers: list[int],
    weights: Mapping[str, float] | None = None,
) -> tuple[float, dict]:
    if not draws:
        normalized_weights = normalize_feature_weights(weights)
        report = {
            "features": {
                "hot_score": 0.5,
                "missing_score": 0.5,
                "balance_score": 0.5,
                "cooccurrence_score": 0.5,
                "recent_decay_score": 0.5,
            },
            "feature_weights": normalized_weights,
        }
        return 0.5, report

    primary_frequency, primary_missing = _number_stats(draws, "primary_numbers")
    secondary_frequency, secondary_missing = _number_stats(draws, "secondary_numbers")
    pair_counts = _cooccurrence(draws, "primary_numbers")
    max_frequency = max(primary_frequency.values() or [1])
    max_missing = max(len(draws), 1)

    all_numbers = primary_numbers + secondary_numbers
    hot = sum(primary_frequency[n] for n in primary_numbers)
    hot += sum(secondary_frequency[n] for n in secondary_numbers)
    hot_score = _normalize(hot, max_frequency * len(all_numbers))

    missing = sum(primary_missing.get(n, len(draws)) for n in primary_numbers)
    missing += sum(secondary_missing.get(n, len(draws)) for n in secondary_numbers)
    missing_score = _normalize(missing, max_missing * len(all_numbers))

    odd_ratio = sum(n % 2 for n in all_numbers) / len(all_numbers)
    odd_even_score = 1.0 - abs(0.5 - odd_ratio)
    number_sum = sum(primary_numbers)
    expected_sum = (min(primary_numbers) + max(primary_numbers)) * len(primary_numbers) / 2
    sum_score = 1.0 - min(1.0, abs(number_sum - expected_sum) / max(expected_sum, 1.0))
    tails = len({n % 10 for n in all_numbers}) / len(all_numbers)
    consecutive_penalty = sum(
        1 for left, right in zip(sorted(primary_numbers), sorted(primary_numbers)[1:]) if right - left == 1
    )
    balance_score = max(0.0, (odd_even_score + sum_score + tails) / 3 - consecutive_penalty * 0.05)

    pair_score_raw = 0
    for left_index, left in enumerate(sorted(primary_numbers)):
        for right in sorted(primary_numbers)[left_index + 1 :]:
            pair_score_raw += pair_counts[(left, right)]
    cooccurrence_score = _normalize(pair_score_raw, max(pair_counts.values() or [1]) * 3)

    recent_window = draws[: min(20, len(draws))]
    recent_hits = 0.0
    for index, draw in enumerate(recent_window):
        decay = 1.0 / (index + 1)
        recent_hits += len(set(primary_numbers) & set(draw.primary_numbers)) * decay
        recent_hits += len(set(secondary_numbers) & set(draw.secondary_numbers)) * decay
    recent_decay_score = _normalize(recent_hits, len(all_numbers) * 2)

    features = CandidateFeatures(
        hot_score=hot_score,
        missing_score=missing_score,
        balance_score=balance_score,
        cooccurrence_score=cooccurrence_score,
        recent_decay_score=recent_decay_score,
    )
    normalized_weights = normalize_feature_weights(weights)
    return features.weighted_total(normalized_weights), {
        "features": {
            "hot_score": round(features.hot_score, 4),
            "missing_score": round(features.missing_score, 4),
            "balance_score": round(features.balance_score, 4),
            "cooccurrence_score": round(features.cooccurrence_score, 4),
            "recent_decay_score": round(features.recent_decay_score, 4),
        },
        "feature_weights": normalized_weights,
    }


def _sample_single_candidate(game_code: GameCode, rng: random.Random) -> tuple[list[int], list[int]]:
    definition = get_game_definition(game_code)
    primary = sorted(rng.sample(list(definition.primary_range), definition.primary_pick))
    secondary = sorted(rng.sample(list(definition.secondary_range), definition.secondary_pick))
    return primary, secondary


def _feature_sample(
    history: list[Draw],
    primary_numbers: list[int],
    secondary_numbers: list[int],
) -> dict[str, float]:
    _, report = score_candidate(history, primary_numbers, secondary_numbers)
    return {
        key: float(report["features"][key])
        for key in FEATURE_KEYS
    }


def build_sliding_window_training_dataset(
    draws: list[Draw],
    game_code: GameCode,
    training_window: int,
    min_training_samples: int,
    random_seed: int,
) -> TrainingDataset:
    chronological = list(reversed(draws))
    if len(chronological) < 2:
        return TrainingDataset(
            samples=[],
            labels=[],
            summary={
                "training_window": training_window,
                "effective_window": 0,
                "historical_draws": len(draws),
                "training_periods": 0,
                "requested_min_samples": min_training_samples,
                "actual_samples": 0,
                "positive_samples": 0,
                "negative_samples": 0,
                "negative_samples_per_period": 0,
                "meets_min_samples": False,
                "note": "at least 2 historical draws are required for supervised rolling-window samples",
            },
        )

    rng = random.Random(random_seed)
    effective_window = min(max(1, training_window), len(chronological) - 1)
    training_periods = len(chronological) - effective_window
    requested_min = max(0, min_training_samples)
    negatives_per_period = 1
    if training_periods > 0 and requested_min > training_periods:
        negatives_per_period = max(1, ceil((requested_min - training_periods) / training_periods))

    samples: list[dict[str, float]] = []
    labels: list[int] = []
    positive_samples = 0
    negative_samples = 0

    for target_index in range(effective_window, len(chronological)):
        history = list(reversed(chronological[target_index - effective_window : target_index]))
        target = chronological[target_index]
        samples.append(_feature_sample(history, target.primary_numbers, target.secondary_numbers))
        labels.append(1)
        positive_samples += 1

        target_key = (tuple(target.primary_numbers), tuple(target.secondary_numbers))
        for _ in range(negatives_per_period):
            primary, secondary = _sample_single_candidate(game_code, rng)
            for _attempt in range(8):
                if (tuple(primary), tuple(secondary)) != target_key:
                    break
                primary, secondary = _sample_single_candidate(game_code, rng)
            samples.append(_feature_sample(history, primary, secondary))
            labels.append(0)
            negative_samples += 1

    return TrainingDataset(
        samples=samples,
        labels=labels,
        summary={
            "training_window": training_window,
            "effective_window": effective_window,
            "historical_draws": len(draws),
            "training_periods": training_periods,
            "requested_min_samples": requested_min,
            "actual_samples": len(samples),
            "positive_samples": positive_samples,
            "negative_samples": negative_samples,
            "negative_samples_per_period": negatives_per_period,
            "meets_min_samples": len(samples) >= requested_min,
            "sample_method": (
                "for each target draw, score the actual next draw as label=1 "
                "and uniformly sampled legal combinations as label=0"
            ),
        },
    )


def train_feature_weights(dataset: TrainingDataset) -> dict:
    positives = [sample for sample, label in zip(dataset.samples, dataset.labels) if label == 1]
    negatives = [sample for sample, label in zip(dataset.samples, dataset.labels) if label == 0]
    if not positives or not negatives:
        return {
            "feature_weights": dict(DEFAULT_FEATURE_WEIGHTS),
            "diagnostics": {
                "positive_average_score": 0.0,
                "negative_average_score": 0.0,
                "score_gap": 0.0,
                "reason": "not enough positive and negative samples; default weights used",
            },
            "feature_lift": {},
        }

    feature_lift: dict[str, dict[str, float]] = {}
    raw_weights: dict[str, float] = {}
    for key in FEATURE_KEYS:
        positive_average = sum(sample[key] for sample in positives) / len(positives)
        negative_average = sum(sample[key] for sample in negatives) / len(negatives)
        lift = positive_average - negative_average
        feature_lift[key] = {
            "positive_average": round(positive_average, 6),
            "negative_average": round(negative_average, 6),
            "lift": round(lift, 6),
        }
        raw_weights[key] = max(0.0, lift)

    if sum(raw_weights.values()) <= 0:
        raw_weights = {
            key: abs(values["lift"])
            for key, values in feature_lift.items()
        }
    weights = normalize_feature_weights(raw_weights)
    positive_scores = [_weighted_feature_score(sample, weights) for sample in positives]
    negative_scores = [_weighted_feature_score(sample, weights) for sample in negatives]
    positive_average_score = sum(positive_scores) / len(positive_scores)
    negative_average_score = sum(negative_scores) / len(negative_scores)
    return {
        "feature_weights": weights,
        "diagnostics": {
            "positive_average_score": round(positive_average_score, 6),
            "negative_average_score": round(negative_average_score, 6),
            "score_gap": round(positive_average_score - negative_average_score, 6),
        },
        "feature_lift": feature_lift,
    }


def _weighted_feature_score(sample: Mapping[str, float], weights: Mapping[str, float]) -> float:
    normalized = normalize_feature_weights(weights)
    return max(0.0, min(1.0, sum(float(sample.get(key, 0.0)) * normalized[key] for key in FEATURE_KEYS)))


def rolling_backtest(
    draws: list[Draw],
    game_code: GameCode,
    window: int,
    random_seed: int,
    weights: Mapping[str, float] | None = None,
    candidate_pool_size: int = 96,
    max_periods: int = 240,
) -> dict:
    chronological = list(reversed(draws))
    if len(chronological) < 2:
        return {
            "window": window,
            "effective_window": 0,
            "evaluated_periods": 0,
            "candidate_pool_size": candidate_pool_size,
            "model_average_primary_hits": 0.0,
            "model_average_secondary_hits": 0.0,
            "random_average_primary_hits": 0.0,
            "random_average_secondary_hits": 0.0,
            "note": "not enough historical draws for rolling forward backtest",
        }

    rng = random.Random(random_seed)
    effective_window = min(max(1, window), len(chronological) - 1)
    target_indexes = list(range(effective_window, len(chronological)))
    if len(target_indexes) > max_periods:
        target_indexes = target_indexes[-max_periods:]

    model_primary_hits: list[int] = []
    model_secondary_hits: list[int] = []
    random_primary_hits: list[int] = []
    random_secondary_hits: list[int] = []

    for index in target_indexes:
        history = list(reversed(chronological[index - effective_window : index]))
        target = chronological[index]
        candidates = [
            _sample_single_candidate(game_code, rng)
            for _ in range(max(1, candidate_pool_size))
        ]
        scored = [
            (
                score_candidate(history, primary, secondary, weights)[0],
                primary,
                secondary,
            )
            for primary, secondary in candidates
        ]
        _, model_primary, model_secondary = max(scored, key=lambda item: item[0])
        random_primary, random_secondary = _sample_single_candidate(game_code, rng)

        target_primary = set(target.primary_numbers)
        target_secondary = set(target.secondary_numbers)
        model_primary_hits.append(len(set(model_primary) & target_primary))
        model_secondary_hits.append(len(set(model_secondary) & target_secondary))
        random_primary_hits.append(len(set(random_primary) & target_primary))
        random_secondary_hits.append(len(set(random_secondary) & target_secondary))

    return {
        "window": window,
        "effective_window": effective_window,
        "evaluated_periods": len(model_primary_hits),
        "candidate_pool_size": candidate_pool_size,
        "model_average_primary_hits": round(sum(model_primary_hits) / len(model_primary_hits), 4),
        "model_average_secondary_hits": round(sum(model_secondary_hits) / len(model_secondary_hits), 4),
        "random_average_primary_hits": round(sum(random_primary_hits) / len(random_primary_hits), 4),
        "random_average_secondary_hits": round(sum(random_secondary_hits) / len(random_secondary_hits), 4),
        "baseline": "uniform random legal combination with fixed seed",
    }


def _window_features(history: list[Draw], max_number: int) -> list[float]:
    recent = history[-20:]
    frequencies = [0.0] * max_number
    missing = [float(len(recent))] * max_number
    for offset, draw in enumerate(reversed(recent)):
        for number in draw.primary_numbers:
            frequencies[number - 1] += 1.0
            missing[number - 1] = min(missing[number - 1], float(offset))
    max_frequency = max(frequencies) or 1.0
    max_missing = max(float(len(recent)), 1.0)
    normalized_frequency = [value / max_frequency for value in frequencies]
    normalized_missing = [value / max_missing for value in missing]
    return normalized_frequency + normalized_missing


def try_train_lightgbm_multilabel(
    draws: list[Draw],
    random_seed: int,
) -> dict:
    try:
        from lightgbm import LGBMClassifier
        from sklearn.multioutput import MultiOutputClassifier
        from sklearn.preprocessing import MultiLabelBinarizer
    except ImportError:
        return {
            "enabled": False,
            "reason": "optional LightGBM/scikit-learn dependencies are not installed",
        }

    chronological = list(reversed(draws))
    if len(chronological) < 12:
        return {
            "enabled": False,
            "reason": "at least 12 historical draws are required for multilabel training",
        }

    max_number = max(max(draw.primary_numbers) for draw in chronological)
    classes = list(range(1, max_number + 1))
    features: list[list[float]] = []
    labels: list[list[int]] = []
    for index in range(6, len(chronological)):
        history = chronological[:index]
        target = chronological[index]
        features.append(_window_features(history, max_number))
        labels.append(target.primary_numbers)

    encoder = MultiLabelBinarizer(classes=classes)
    encoded_labels = encoder.fit_transform(labels)
    model = MultiOutputClassifier(
        LGBMClassifier(
            n_estimators=30,
            learning_rate=0.05,
            random_state=random_seed,
            verbose=-1,
        )
    )
    model.fit(features, encoded_labels)
    return {
        "enabled": True,
        "samples": len(features),
        "labels": len(classes),
        "estimator": "MultiOutputClassifier(LGBMClassifier)",
        "artifact": "not persisted in v1; persisted model registry can be added after offline evaluation",
    }


def train_model(
    db: Session,
    game_code: GameCode,
    draws: list[Draw],
    rolling_window: int,
    random_seed: int,
    training_window: int = 100,
    min_training_samples: int = 10_000,
) -> ModelRun:
    version = f"{MODEL_VERSION_PREFIX}-{game_code.value}-{datetime.utcnow().strftime('%Y%m%d%H%M%S')}"
    dataset = build_sliding_window_training_dataset(
        draws=draws,
        game_code=game_code,
        training_window=training_window,
        min_training_samples=min_training_samples,
        random_seed=random_seed,
    )
    trained_model = train_feature_weights(dataset)
    report = rolling_backtest(
        draws=draws,
        game_code=game_code,
        window=rolling_window,
        random_seed=random_seed,
        weights=trained_model["feature_weights"],
    )
    ml_training = try_train_lightgbm_multilabel(draws, random_seed)
    run = ModelRun(
        game_code=game_code.value,
        version=version,
        algorithm=ALGORITHM_NAME,
        feature_summary={
            "features": [
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
            "candidate_pool": "monte_carlo",
            "training": dataset.summary,
            "trained_model": trained_model,
            "ml_training": ml_training,
        },
        backtest_report=report,
    )
    db.add(run)
    db.commit()
    db.refresh(run)
    return run
