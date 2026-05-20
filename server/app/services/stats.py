from collections import Counter

from app.db.models import Draw
from app.domain.games import GameCode, get_game_definition


def _frequency(draws: list[Draw], attr: str) -> dict[int, int]:
    counter: Counter[int] = Counter()
    for draw in draws:
        counter.update(getattr(draw, attr))
    return dict(sorted(counter.items()))


def _missing_periods(draws: list[Draw], attr: str, number_range: range) -> dict[int, int]:
    missing = {number: len(draws) for number in number_range}
    for index, draw in enumerate(draws):
        for number in getattr(draw, attr):
            if missing[number] == len(draws):
                missing[number] = index
    return dict(sorted(missing.items()))


def build_stats(game_code: GameCode, draws: list[Draw], data_version: str) -> dict:
    definition = get_game_definition(game_code)
    return {
        "game_code": game_code,
        "draw_count": len(draws),
        "latest_issue": draws[0].issue if draws else None,
        "primary_frequency": _frequency(draws, "primary_numbers"),
        "secondary_frequency": _frequency(draws, "secondary_numbers"),
        "primary_missing_periods": _missing_periods(
            draws,
            "primary_numbers",
            definition.primary_range,
        ),
        "secondary_missing_periods": _missing_periods(
            draws,
            "secondary_numbers",
            definition.secondary_range,
        ),
        "data_version": data_version,
    }

