import json
from pathlib import Path

from app.services.data_sources import (
    parse_cwl_draw_notice,
    parse_cwl_notice_html,
    parse_sporttery_history,
)


FIXTURES = Path(__file__).parent / "fixtures"


def test_parse_sporttery_super_lotto_fixture() -> None:
    payload = json.loads((FIXTURES / "sporttery_dlt_history.json").read_text())
    draws = parse_sporttery_history(payload, "fixture://sporttery")

    assert len(draws) == 1
    assert draws[0].issue == "25055"
    assert draws[0].primary_numbers == [1, 7, 12, 25, 35]
    assert draws[0].secondary_numbers == [3, 11]
    assert draws[0].source_url == "fixture://sporttery"
    assert len(draws[0].source_hash) == 64


def test_parse_cwl_double_color_ball_fixture() -> None:
    payload = json.loads((FIXTURES / "cwl_ssq_draw_notice.json").read_text())
    draws = parse_cwl_draw_notice(payload, "fixture://cwl")

    assert len(draws) == 1
    assert draws[0].issue == "2025055"
    assert draws[0].primary_numbers == [1, 5, 12, 18, 23, 31]
    assert draws[0].secondary_numbers == [9]
    assert len(draws[0].source_hash) == 64


def test_parse_cwl_notice_html_fallback_keeps_source_hash() -> None:
    html = "2025055 双色球 开奖号码 01 05 12 18 23 31 蓝球 09"
    draws = parse_cwl_notice_html(html, "fixture://cwl-html")

    assert len(draws) == 1
    assert draws[0].issue == "2025055"
    assert draws[0].primary_numbers == [1, 5, 12, 18, 23, 31]
    assert draws[0].secondary_numbers == [9]
    assert draws[0].source_url == "fixture://cwl-html"
    assert len(draws[0].source_hash) == 64
