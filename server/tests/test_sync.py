import json
from pathlib import Path

from sqlalchemy.orm import Session

from app.domain.games import GameCode
from app.services.data_sources import parse_sporttery_history
from app.services.sync import upsert_draws


def test_upsert_draws_is_idempotent(db_session: Session) -> None:
    payload = json.loads(
        (Path(__file__).parent / "fixtures" / "sporttery_dlt_history.json").read_text()
    )
    fetched = parse_sporttery_history(payload, "fixture://sporttery")

    first = upsert_draws(db_session, GameCode.SUPER_LOTTO, fetched)
    second = upsert_draws(db_session, GameCode.SUPER_LOTTO, fetched)

    assert first.fetched == 1
    assert first.inserted == 1
    assert first.updated == 0
    assert second.fetched == 1
    assert second.inserted == 0
    assert second.updated == 1
    assert second.data_version == "dlt:25055:1"

