from dataclasses import dataclass

from app.domain.games import GameCode


@dataclass(frozen=True)
class HistoricalDraw:
    issue: str
    primary_numbers: frozenset[int]
    secondary_numbers: frozenset[int]


@dataclass(frozen=True)
class Candidate:
    game_code: GameCode
    primary_numbers: tuple[int, ...]
    secondary_numbers: tuple[int, ...]

    @property
    def primary_set(self) -> frozenset[int]:
        return frozenset(self.primary_numbers)

    @property
    def secondary_set(self) -> frozenset[int]:
        return frozenset(self.secondary_numbers)


def would_match_historical_high_prize(
    candidate: Candidate,
    historical_draws: list[HistoricalDraw],
) -> tuple[bool, str | None]:
    primary = candidate.primary_set
    secondary = candidate.secondary_set

    for draw in historical_draws:
        if candidate.game_code == GameCode.DOUBLE_COLOR_BALL:
            if draw.primary_numbers.issubset(primary):
                return True, draw.issue
        elif candidate.game_code == GameCode.SUPER_LOTTO:
            if draw.primary_numbers.issubset(primary) and draw.secondary_numbers & secondary:
                return True, draw.issue
    return False, None

