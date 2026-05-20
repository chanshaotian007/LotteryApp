# Model Training Plan

## Objective

The server trains an explainable prediction/ranking model from stored lottery draw history and uses it to score generated candidates. The model is not a winning guarantee; it is a statistical recommender and backtest report.

## Training Data

Official draw history for `ssq` and `dlt` is finite and currently below 10000 real draw periods. To satisfy a 10000+ model-training data requirement without fabricating winning records, the service builds 10000+ candidate training rows from real rolling windows:

- Use the previous 100 draws as the feature window.
- Treat the next real draw as the positive answer row.
- Generate legal random combinations for the same game as negative rows.
- Repeat across every available historical period until the requested minimum sample count is reached.

The training report stores `historical_draws`, `training_periods`, `actual_samples`, `positive_samples`, `negative_samples`, and whether the requested minimum was met.

## Features

Each candidate row is scored with:

- hot/cold frequency
- missing periods
- sum and odd/even balance
- tail and consecutive-number structure
- primary-number co-occurrence
- recent-decay overlap

Training compares positive rows against negative rows, learns normalized feature weights from observed feature lift, and stores the result in `model_runs.feature_summary.trained_model`.

## Backtest

After training, the service runs a rolling-forward backtest:

- For each evaluated target period, build features from only prior draws.
- Score a Monte Carlo candidate pool with the trained weights.
- Compare average primary/secondary hits against a fixed-seed uniform random baseline.

The backtest is stored in `model_runs.backtest_report` and returned by `/v1/admin/train`.

## API

Train:

```bash
curl -X POST http://192.168.31.26:8000/v1/admin/train \
  -H "X-Admin-Token: replace-with-a-long-random-admin-token" \
  -H "Content-Type: application/json" \
  -d '{"game_code":"dlt","rolling_window":100,"training_window":100,"min_training_samples":10000}'
```

Generate with the latest trained model:

```bash
curl -X POST http://192.168.31.26:8000/v1/generate \
  -H "X-Member-Token: demo-member-token" \
  -H "Content-Type: application/json" \
  -d '{"game_code":"dlt","mode":"model_prediction","count":3,"budget_max":200,"exclude_high_prize_history":true}'
```

## Operating Notes

- Run `/v1/admin/sync` before training so the database contains the latest public draw records.
- Nightly Celery Beat jobs train both `ssq` and `dlt` with `training_window=100` and `min_training_samples=10000`.
- The Android client uses `http://192.168.31.26:8000/` and shows the returned model version/report after AI prediction generation.
