from app.domain.exclusion import Candidate, HistoricalDraw, would_match_historical_high_prize
from app.domain.games import GameCode


def test_double_color_ball_excludes_any_complex_covering_historical_red_set() -> None:
    historical = [
        HistoricalDraw(
            issue="2026001",
            primary_numbers=frozenset({1, 2, 3, 4, 5, 6}),
            secondary_numbers=frozenset({16}),
        )
    ]
    candidate = Candidate(
        GameCode.DOUBLE_COLOR_BALL,
        primary_numbers=(1, 2, 3, 4, 5, 6, 9),
        secondary_numbers=(1,),
    )

    excluded, issue = would_match_historical_high_prize(candidate, historical)

    assert excluded is True
    assert issue == "2026001"


def test_super_lotto_requires_front_cover_and_at_least_one_back_match() -> None:
    historical = [
        HistoricalDraw(
            issue="25001",
            primary_numbers=frozenset({1, 2, 3, 4, 5}),
            secondary_numbers=frozenset({6, 7}),
        )
    ]
    covered_front_without_back = Candidate(
        GameCode.SUPER_LOTTO,
        primary_numbers=(1, 2, 3, 4, 5, 9),
        secondary_numbers=(1, 2),
    )
    covered_front_with_back = Candidate(
        GameCode.SUPER_LOTTO,
        primary_numbers=(1, 2, 3, 4, 5, 9),
        secondary_numbers=(1, 6),
    )

    assert would_match_historical_high_prize(covered_front_without_back, historical) == (
        False,
        None,
    )
    assert would_match_historical_high_prize(covered_front_with_back, historical) == (
        True,
        "25001",
    )

