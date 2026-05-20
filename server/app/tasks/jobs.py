from app.db.session import SessionLocal
from app.domain.games import GameCode
from app.services.repository import list_draws
from app.services.sync import sync_game
from app.services.modeling import train_model
from app.tasks.celery_app import celery_app


@celery_app.task(name="lottery.sync_game")
def sync_game_task(game_code: str, limit: int = 100) -> dict:
    with SessionLocal() as db:
        result = sync_game(db, GameCode(game_code), limit)
        return {
            "fetched": result.fetched,
            "inserted": result.inserted,
            "updated": result.updated,
            "data_version": result.data_version,
        }


@celery_app.task(name="lottery.train_model")
def train_model_task(
    game_code: str,
    rolling_window: int = 100,
    random_seed: int = 20260509,
    training_window: int = 100,
    min_training_samples: int = 10_000,
) -> dict:
    with SessionLocal() as db:
        code = GameCode(game_code)
        draws = list_draws(db, code, 20_000)
        run = train_model(
            db,
            code,
            draws,
            rolling_window,
            random_seed,
            training_window,
            min_training_samples,
        )
        return {
            "model_version": run.version,
            "algorithm": run.algorithm,
            "backtest_report": run.backtest_report,
            "training_report": run.feature_summary.get("training", {}),
        }
