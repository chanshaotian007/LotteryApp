import json
import sqlite3
import sys
from pathlib import Path


def main() -> None:
    if len(sys.argv) != 3:
        raise SystemExit("Usage: python server/scripts/export_legacy.py <sqlite-db-path> <output-json-path>")

    db_path = Path(sys.argv[1]).resolve()
    output_path = Path(sys.argv[2]).resolve()

    connection = sqlite3.connect(db_path)
    connection.row_factory = sqlite3.Row
    cursor = connection.cursor()

    games = [dict(row) for row in cursor.execute("SELECT code, name, draw_source_url, rule_source_url, ticket_price FROM games")]
    draws = []
    for row in cursor.execute(
        """
        SELECT game_code, issue, draw_date, primary_numbers, secondary_numbers, prize_tiers, source_url, source_hash
        FROM draws
        ORDER BY game_code, issue
        """
    ):
        item = dict(row)
        item["primary_numbers"] = json.loads(item["primary_numbers"])
        item["secondary_numbers"] = json.loads(item["secondary_numbers"])
        item["prize_tiers"] = json.loads(item["prize_tiers"])
        draws.append(item)

    model_runs = []
    for row in cursor.execute(
        """
        SELECT game_code, version, algorithm, feature_summary, backtest_report, created_at
        FROM model_runs
        ORDER BY created_at
        """
    ):
        item = dict(row)
        item["feature_summary"] = json.loads(item["feature_summary"])
        item["backtest_report"] = json.loads(item["backtest_report"])
        model_runs.append(item)

    payload = {
        "games": games,
        "draws": draws,
        "model_runs": model_runs,
    }
    output_path.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")


if __name__ == "__main__":
    main()
