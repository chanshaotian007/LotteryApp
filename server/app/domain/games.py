from dataclasses import dataclass
from enum import StrEnum


class GameCode(StrEnum):
    DOUBLE_COLOR_BALL = "ssq"
    SUPER_LOTTO = "dlt"


class GenerateMode(StrEnum):
    RANDOM = "random"
    EXCLUDE_HISTORY = "exclude_history"
    MODEL_PREDICTION = "model_prediction"


class ComplexPreference(StrEnum):
    SINGLE = "single"
    CONSERVATIVE = "conservative"
    BALANCED = "balanced"
    AGGRESSIVE = "aggressive"


@dataclass(frozen=True)
class GameDefinition:
    code: GameCode
    name: str
    primary_label: str
    secondary_label: str
    primary_range: range
    secondary_range: range
    primary_pick: int
    secondary_pick: int
    ticket_price: int
    base_first_prize: int
    rule_source_url: str
    draw_source_url: str


GAME_DEFINITIONS: dict[GameCode, GameDefinition] = {
    GameCode.DOUBLE_COLOR_BALL: GameDefinition(
        code=GameCode.DOUBLE_COLOR_BALL,
        name="Double Color Ball",
        primary_label="red_balls",
        secondary_label="blue_balls",
        primary_range=range(1, 34),
        secondary_range=range(1, 17),
        primary_pick=6,
        secondary_pick=1,
        ticket_price=2,
        base_first_prize=5_000_000,
        rule_source_url="https://www.cwl.gov.cn/c/2018-10-12/417937.shtml",
        draw_source_url=(
            "https://www.cwl.gov.cn/cwl_admin/front/cwlkj/search/kjxx/"
            "findDrawNotice?name=ssq"
        ),
    ),
    GameCode.SUPER_LOTTO: GameDefinition(
        code=GameCode.SUPER_LOTTO,
        name="Super Lotto",
        primary_label="front_zone",
        secondary_label="back_zone",
        primary_range=range(1, 36),
        secondary_range=range(1, 13),
        primary_pick=5,
        secondary_pick=2,
        ticket_price=2,
        base_first_prize=10_000_000,
        rule_source_url="https://m.lottery.gov.cn/ksjz/m/yxgz_dlt/",
        draw_source_url=(
            "https://webapi.sporttery.cn/gateway/lottery/"
            "getHistoryPageListV1.qry?gameNo=85"
        ),
    ),
}


def get_game_definition(game_code: GameCode | str) -> GameDefinition:
    return GAME_DEFINITIONS[GameCode(game_code)]
