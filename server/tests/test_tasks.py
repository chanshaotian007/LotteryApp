from app.tasks.celery_app import celery_app


def test_celery_beat_schedules_periodic_sync_and_training() -> None:
    schedule = celery_app.conf.beat_schedule

    assert "sync-super-lotto-history-daily" in schedule
    assert "sync-double-color-ball-history-daily" in schedule
    assert "train-model-nightly" in schedule
    assert "train-model-nightly-dlt" in schedule

    assert schedule["sync-super-lotto-history-daily"]["args"] == ("dlt", 100)
    assert schedule["sync-double-color-ball-history-daily"]["args"] == ("ssq", 100)
    assert schedule["train-model-nightly"]["args"] == ("ssq", 100, 20260509, 100, 10_000)
    assert schedule["train-model-nightly-dlt"]["args"] == ("dlt", 100, 20260509, 100, 10_000)
