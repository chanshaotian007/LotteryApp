from datetime import date, datetime

from sqlalchemy import Date, DateTime, ForeignKey, Integer, JSON, String, UniqueConstraint
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship


class Base(DeclarativeBase):
    pass


class Game(Base):
    __tablename__ = "games"

    code: Mapped[str] = mapped_column(String(16), primary_key=True)
    name: Mapped[str] = mapped_column(String(64), nullable=False)
    draw_source_url: Mapped[str] = mapped_column(String(512), nullable=False)
    rule_source_url: Mapped[str] = mapped_column(String(512), nullable=False)
    ticket_price: Mapped[int] = mapped_column(Integer, nullable=False, default=2)

    draws: Mapped[list["Draw"]] = relationship(back_populates="game")


class Draw(Base):
    __tablename__ = "draws"
    __table_args__ = (UniqueConstraint("game_code", "issue", name="uq_draw_game_issue"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    game_code: Mapped[str] = mapped_column(ForeignKey("games.code"), index=True)
    issue: Mapped[str] = mapped_column(String(32), nullable=False, index=True)
    draw_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    primary_numbers: Mapped[list[int]] = mapped_column(JSON, nullable=False)
    secondary_numbers: Mapped[list[int]] = mapped_column(JSON, nullable=False)
    prize_tiers: Mapped[list[dict]] = mapped_column(JSON, nullable=False, default=list)
    source_url: Mapped[str] = mapped_column(String(1024), nullable=False)
    source_hash: Mapped[str] = mapped_column(String(64), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=datetime.utcnow,
        onupdate=datetime.utcnow,
    )

    game: Mapped[Game] = relationship(back_populates="draws")


class ModelRun(Base):
    __tablename__ = "model_runs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    game_code: Mapped[str] = mapped_column(ForeignKey("games.code"), index=True)
    version: Mapped[str] = mapped_column(String(64), nullable=False, unique=True)
    algorithm: Mapped[str] = mapped_column(String(128), nullable=False)
    feature_summary: Mapped[dict] = mapped_column(JSON, nullable=False)
    backtest_report: Mapped[dict] = mapped_column(JSON, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

