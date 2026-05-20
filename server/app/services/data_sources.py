from dataclasses import dataclass
from datetime import date
from hashlib import sha256
import json
import re
from typing import Any

import httpx

from app.core.config import get_settings
from app.domain.games import GameCode


SPORTTERY_HISTORY_URL = (
    "https://webapi.sporttery.cn/gateway/lottery/getHistoryPageListV1.qry"
)
CWL_DRAW_NOTICE_URL = (
    "https://www.cwl.gov.cn/cwl_admin/front/cwlkj/search/kjxx/findDrawNotice"
)
CWL_ANNOUNCEMENT_URL = "https://www.cwl.gov.cn/ygkj/wqkjgg/ssq/"


@dataclass(frozen=True)
class FetchedDraw:
    issue: str
    draw_date: date | None
    primary_numbers: list[int]
    secondary_numbers: list[int]
    prize_tiers: list[dict]
    source_url: str
    source_hash: str


def _source_hash(raw: str) -> str:
    return sha256(raw.encode("utf-8")).hexdigest()


def _json_source_hash(payload: Any) -> str:
    raw = json.dumps(payload, ensure_ascii=False, sort_keys=True, separators=(",", ":"))
    return _source_hash(raw)


def _numbers(value: Any) -> list[int]:
    if value is None:
        return []
    if isinstance(value, list):
        return [int(item) for item in value]
    return [int(match) for match in re.findall(r"\d+", str(value))]


def _date(value: Any) -> date | None:
    if not value:
        return None
    text = str(value).replace("/", "-").strip()
    try:
        return date.fromisoformat(text[:10])
    except ValueError:
        return None


def parse_sporttery_history(payload: dict, source_url: str) -> list[FetchedDraw]:
    container = payload.get("value") or payload.get("data") or payload
    records = container.get("list") or container.get("drawList") or []
    source_hash = _json_source_hash(payload)
    draws: list[FetchedDraw] = []

    for item in records:
        issue = str(
            item.get("lotteryDrawNum")
            or item.get("drawNum")
            or item.get("issue")
            or item.get("code")
            or ""
        ).strip()
        result = _numbers(
            item.get("lotteryDrawResult")
            or item.get("drawResult")
            or item.get("result")
            or item.get("winningNumbers")
        )
        if not issue or len(result) < 7:
            continue
        draws.append(
            FetchedDraw(
                issue=issue,
                draw_date=_date(
                    item.get("lotteryDrawTime")
                    or item.get("drawTime")
                    or item.get("date")
                ),
                primary_numbers=sorted(result[:5]),
                secondary_numbers=sorted(result[5:7]),
                prize_tiers=list(
                    item.get("prizeLevelList")
                    or item.get("prizeTiers")
                    or item.get("prizeGrades")
                    or []
                ),
                source_url=source_url,
                source_hash=source_hash,
            )
        )
    return draws


def _cwl_records(payload: dict) -> list[dict]:
    candidates = [
        payload.get("result"),
        payload.get("data"),
        payload.get("list"),
        payload.get("rows"),
    ]
    for candidate in candidates:
        if isinstance(candidate, list):
            return candidate
        if isinstance(candidate, dict):
            for value in candidate.values():
                if isinstance(value, list):
                    return value
    return []


def parse_cwl_draw_notice(payload: dict, source_url: str) -> list[FetchedDraw]:
    source_hash = _json_source_hash(payload)
    draws: list[FetchedDraw] = []

    for item in _cwl_records(payload):
        issue = str(
            item.get("code")
            or item.get("issue")
            or item.get("lotteryDrawNum")
            or item.get("drawNum")
            or ""
        ).strip()
        red = _numbers(
            item.get("red")
            or item.get("redBalls")
            or item.get("frontWinningNum")
            or item.get("winningRed")
        )
        blue = _numbers(
            item.get("blue")
            or item.get("blueBalls")
            or item.get("backWinningNum")
            or item.get("winningBlue")
        )
        if not issue or len(red) < 6 or len(blue) < 1:
            continue
        draws.append(
            FetchedDraw(
                issue=issue,
                draw_date=_date(item.get("date") or item.get("drawDate") or item.get("day")),
                primary_numbers=sorted(red[:6]),
                secondary_numbers=sorted(blue[:1]),
                prize_tiers=list(
                    item.get("prizegrades")
                    or item.get("prizeGrades")
                    or item.get("prizeLevelList")
                    or []
                ),
                source_url=source_url,
                source_hash=source_hash,
            )
        )
    return draws


def parse_cwl_notice_html(html: str, source_url: str) -> list[FetchedDraw]:
    issue_match = re.search(r"(\d{5,})", html)
    numbers = _numbers(html)
    if not issue_match or len(numbers) < 7:
        return []
    issue = issue_match.group(1)
    draw_numbers = [number for number in numbers if number != int(issue)]
    if len(draw_numbers) < 7:
        return []
    return [
        FetchedDraw(
            issue=issue,
            draw_date=None,
            primary_numbers=sorted(draw_numbers[:6]),
            secondary_numbers=sorted(draw_numbers[6:7]),
            prize_tiers=[],
            source_url=source_url,
            source_hash=_source_hash(html),
        )
    ]


def fetch_sporttery_super_lotto(limit: int) -> list[FetchedDraw]:
    page_size = min(max(limit, 1), 100)
    collected: list[FetchedDraw] = []
    seen_issues: set[str] = set()
    with httpx.Client(timeout=15.0, trust_env=False) as client:
        page_no = 1
        while len(collected) < limit:
            source_url = (
                f"{SPORTTERY_HISTORY_URL}?gameNo=85&provinceId=0&pageSize={page_size}"
                f"&isVerify=1&pageNo={page_no}"
            )
            response = client.get(
                source_url,
                headers={
                    "Accept": "application/json,text/plain,*/*",
                    "Referer": "https://www.lottery.gov.cn/",
                    "User-Agent": get_settings().cwl_user_agent,
                },
            )
            response.raise_for_status()
            page_draws = parse_sporttery_history(response.json(), source_url)
            if not page_draws:
                break
            for draw in page_draws:
                if draw.issue in seen_issues:
                    continue
                seen_issues.add(draw.issue)
                collected.append(draw)
                if len(collected) >= limit:
                    break
            if len(page_draws) < page_size:
                break
            page_no += 1
    return collected[:limit]


def fetch_cwl_double_color_ball(limit: int) -> list[FetchedDraw]:
    params = {
        "name": "ssq",
        "issueCount": str(limit),
        "issueStart": "",
        "issueEnd": "",
        "dayStart": "",
        "dayEnd": "",
        "pageNo": "1",
        "pageSize": str(limit),
        "week": "",
        "systemType": "PC",
    }
    headers = {
        "Accept": "application/json,text/javascript,*/*;q=0.01",
        "Referer": CWL_ANNOUNCEMENT_URL,
        "User-Agent": get_settings().cwl_user_agent,
        "X-Requested-With": "XMLHttpRequest",
    }
    with httpx.Client(timeout=15.0, follow_redirects=True, trust_env=False) as client:
        try:
            response = client.get(CWL_DRAW_NOTICE_URL, params=params, headers=headers)
            response.raise_for_status()
            content_type = response.headers.get("content-type", "")
            if "json" in content_type:
                return parse_cwl_draw_notice(response.json(), str(response.url))
            try:
                return parse_cwl_draw_notice(response.json(), str(response.url))
            except json.JSONDecodeError:
                return parse_cwl_notice_html(response.text, str(response.url))
        except httpx.HTTPStatusError as exc:
            fallback = client.get(CWL_ANNOUNCEMENT_URL, headers=headers)
            if fallback.status_code < 400:
                draws = parse_cwl_notice_html(fallback.text, str(fallback.url))
                if draws:
                    return draws[:limit]
            raise RuntimeError(
                "China Welfare Lottery source is currently blocked by WAF; "
                "request headers were applied and the announcement-page fallback "
                "was attempted."
            ) from exc


def fetch_draws(game_code: GameCode, limit: int) -> list[FetchedDraw]:
    if game_code == GameCode.SUPER_LOTTO:
        return fetch_sporttery_super_lotto(limit)
    if game_code == GameCode.DOUBLE_COLOR_BALL:
        return fetch_cwl_double_color_ball(limit)
    raise ValueError(f"unsupported game code: {game_code}")
