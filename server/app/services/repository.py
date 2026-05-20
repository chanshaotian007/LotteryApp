from datetime import date

from sqlalchemy import Select, func, select
from sqlalchemy.orm import Session

from app.db.models import Draw, Game
from app.domain.exclusion import HistoricalDraw
from app.domain.games import GAME_DEFINITIONS, GameCode


def ensure_games(db: Session) -> None:
    for definition in GAME_DEFINITIONS.values():
        existing = db.get(Game, definition.code.value)
        if existing:
            existing.name = definition.name
            existing.ticket_price = definition.ticket_price
            existing.rule_source_url = definition.rule_source_url
            existing.draw_source_url = definition.draw_source_url
        else:
            db.add(
                Game(
                    code=definition.code.value,
                    name=definition.name,
                    ticket_price=definition.ticket_price,
                    rule_source_url=definition.rule_source_url,
                    draw_source_url=definition.draw_source_url,
                )
            )
    db.commit()


def list_games(db: Session) -> list[Game]:
    ensure_games(db)
    return list(db.scalars(select(Game).order_by(Game.code)).all())


def draw_query(game_code: GameCode, limit: int | None = None) -> Select[tuple[Draw]]:
    stmt = select(Draw).where(Draw.game_code == game_code.value).order_by(Draw.issue.desc())
    if limit is not None:
        stmt = stmt.limit(limit)
    return stmt


def list_draws(db: Session, game_code: GameCode, limit: int = 100) -> list[Draw]:
    return list(db.scalars(draw_query(game_code, limit)).all())


def latest_issue(db: Session, game_code: GameCode) -> str | None:
    return db.scalar(
        select(Draw.issue)
        .where(Draw.game_code == game_code.value)
        .order_by(Draw.issue.desc())
        .limit(1)
    )


def draw_count(db: Session, game_code: GameCode) -> int:
    return int(
        db.scalar(select(func.count(Draw.id)).where(Draw.game_code == game_code.value)) or 0
    )


def data_version(db: Session, game_code: GameCode) -> str:
    issue = latest_issue(db, game_code)
    count = draw_count(db, game_code)
    return f"{game_code.value}:{issue or 'empty'}:{count}"


def to_historical_draws(draws: list[Draw]) -> list[HistoricalDraw]:
    return [
        HistoricalDraw(
            issue=draw.issue,
            primary_numbers=frozenset(draw.primary_numbers),
            secondary_numbers=frozenset(draw.secondary_numbers),
        )
        for draw in draws
    ]


def parse_draw_date(value: str | None) -> date | None:
    if not value:
        return None
    normalized = value.strip().replace("/", "-")
    try:
        return date.fromisoformat(normalized[:10])
    except ValueError:
        return None

