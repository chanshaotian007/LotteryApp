from collections.abc import Iterator

import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

from app.db.models import Base, Draw
from app.services.repository import ensure_games


@pytest.fixture
def db_session() -> Iterator[Session]:
    engine = create_engine(
        "sqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(engine)
    TestingSession = sessionmaker(bind=engine, autoflush=False, autocommit=False)
    with TestingSession() as session:
        ensure_games(session)
        yield session


@pytest.fixture
def seeded_db(db_session: Session) -> Session:
    db_session.add_all(
        [
            Draw(
                game_code="ssq",
                issue="2026001",
                draw_date=None,
                primary_numbers=[1, 2, 3, 4, 5, 6],
                secondary_numbers=[7],
                prize_tiers=[],
                source_url="fixture://ssq/2026001",
                source_hash="hash-ssq-2026001",
            ),
            Draw(
                game_code="dlt",
                issue="25001",
                draw_date=None,
                primary_numbers=[1, 2, 3, 4, 5],
                secondary_numbers=[6, 7],
                prize_tiers=[],
                source_url="fixture://dlt/25001",
                source_hash="hash-dlt-25001",
            ),
        ]
    )
    db_session.commit()
    return db_session

