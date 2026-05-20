from celery import Celery
from celery.schedules import crontab

from app.core.config import get_settings


settings = get_settings()
celery_app = Celery(
    "lottery_service",
    broker=settings.redis_url,
    backend=settings.redis_url,
)
celery_app.conf.update(
    task_serializer="json",
    result_serializer="json",
    accept_content=["json"],
    timezone="Asia/Shanghai",
    enable_utc=True,
    beat_schedule={
        "sync-super-lotto-history-daily": {
            "task": "lottery.sync_game",
            "schedule": crontab(minute=30, hour=23),
            "args": ("dlt", 100),
        },
        "sync-double-color-ball-history-daily": {
            "task": "lottery.sync_game",
            "schedule": crontab(minute=40, hour=23),
            "args": ("ssq", 100),
        },
        "train-model-nightly": {
            "task": "lottery.train_model",
            "schedule": crontab(minute=10, hour=0),
            "args": ("ssq", 100, 20260509, 100, 10_000),
        },
        "train-model-nightly-dlt": {
            "task": "lottery.train_model",
            "schedule": crontab(minute=20, hour=0),
            "args": ("dlt", 100, 20260509, 100, 10_000),
        },
    },
)
