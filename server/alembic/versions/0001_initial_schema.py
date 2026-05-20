"""initial schema

Revision ID: 0001_initial_schema
Revises:
Create Date: 2026-05-09 00:00:00.000000
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql


revision: str = "0001_initial_schema"
down_revision: str | None = None
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    json_type = postgresql.JSONB(astext_type=sa.Text())
    op.create_table(
        "games",
        sa.Column("code", sa.String(length=16), nullable=False),
        sa.Column("name", sa.String(length=64), nullable=False),
        sa.Column("draw_source_url", sa.String(length=512), nullable=False),
        sa.Column("rule_source_url", sa.String(length=512), nullable=False),
        sa.Column("ticket_price", sa.Integer(), nullable=False),
        sa.PrimaryKeyConstraint("code"),
    )
    op.create_table(
        "draws",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("game_code", sa.String(length=16), nullable=False),
        sa.Column("issue", sa.String(length=32), nullable=False),
        sa.Column("draw_date", sa.Date(), nullable=True),
        sa.Column("primary_numbers", json_type, nullable=False),
        sa.Column("secondary_numbers", json_type, nullable=False),
        sa.Column("prize_tiers", json_type, nullable=False),
        sa.Column("source_url", sa.String(length=1024), nullable=False),
        sa.Column("source_hash", sa.String(length=64), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(["game_code"], ["games.code"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("game_code", "issue", name="uq_draw_game_issue"),
    )
    op.create_index(op.f("ix_draws_game_code"), "draws", ["game_code"], unique=False)
    op.create_index(op.f("ix_draws_issue"), "draws", ["issue"], unique=False)
    op.create_table(
        "model_runs",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("game_code", sa.String(length=16), nullable=False),
        sa.Column("version", sa.String(length=64), nullable=False),
        sa.Column("algorithm", sa.String(length=128), nullable=False),
        sa.Column("feature_summary", json_type, nullable=False),
        sa.Column("backtest_report", json_type, nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(["game_code"], ["games.code"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("version"),
    )
    op.create_index(op.f("ix_model_runs_game_code"), "model_runs", ["game_code"], unique=False)


def downgrade() -> None:
    op.drop_index(op.f("ix_model_runs_game_code"), table_name="model_runs")
    op.drop_table("model_runs")
    op.drop_index(op.f("ix_draws_issue"), table_name="draws")
    op.drop_index(op.f("ix_draws_game_code"), table_name="draws")
    op.drop_table("draws")
    op.drop_table("games")

