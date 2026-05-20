from dataclasses import dataclass
from datetime import date

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db.models import Draw
from app.domain.games import GameCode
from app.services.data_sources import FetchedDraw, fetch_draws
from app.services.repository import data_version, ensure_games


@dataclass(frozen=True)
class SyncResult:
    fetched: int
    inserted: int
    updated: int
    data_version: str


def _to_date(value: date | None) -> date | None:
    return value


def upsert_draws(db: Session, game_code: GameCode, fetched: list[FetchedDraw]) -> SyncResult:
    ensure_games(db)
    inserted = 0
    updated = 0

    for item in fetched:
        existing = db.scalar(
            select(Draw).where(
                Draw.game_code == game_code.value,
                Draw.issue == item.issue,
            )
        )
        if existing:
            existing.draw_date = _to_date(item.draw_date)
            existing.primary_numbers = item.primary_numbers
            existing.secondary_numbers = item.secondary_numbers
            existing.prize_tiers = item.prize_tiers
            existing.source_url = item.source_url
            existing.source_hash = item.source_hash
            updated += 1
        else:
            db.add(
                Draw(
                    game_code=game_code.value,
                    issue=item.issue,
                    draw_date=_to_date(item.draw_date),
                    primary_numbers=item.primary_numbers,
                    secondary_numbers=item.secondary_numbers,
                    prize_tiers=item.prize_tiers,
                    source_url=item.source_url,
                    source_hash=item.source_hash,
                )
            )
            inserted += 1
    db.commit()
    return SyncResult(
        fetched=len(fetched),
        inserted=inserted,
        updated=updated,
        data_version=data_version(db, game_code),
    )


def sync_game(db: Session, game_code: GameCode, limit: int) -> SyncResult:
    fetched = fetch_draws(game_code, limit)
    return upsert_draws(db, game_code, fetched)

