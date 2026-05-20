from collections.abc import Iterator
from contextlib import contextmanager

from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.core.rate_limit import reset_rate_limits
from app.db.session import get_db
from app.main import app


@contextmanager
def client_with_db(db: Session) -> Iterator[TestClient]:
    def override_get_db():
        yield db

    app.dependency_overrides[get_db] = override_get_db
    reset_rate_limits()
    try:
        with TestClient(app) as client:
            yield client
    finally:
        app.dependency_overrides.clear()
        reset_rate_limits()


def test_games_and_random_generate_are_available_to_free_users(seeded_db: Session) -> None:
    with client_with_db(seeded_db) as client:
        games = client.get("/v1/games")
        generated = client.post(
            "/v1/generate",
            json={
                "game_code": "ssq",
                "mode": "random",
                "count": 1,
                "random_seed": 7,
            },
        )

    assert games.status_code == 200
    assert {item["code"] for item in games.json()} == {"ssq", "dlt"}
    assert generated.status_code == 200
    assert generated.json()["member_feature"] is False
    assert len(generated.json()["candidates"]) == 1


def test_member_features_require_member_token(seeded_db: Session) -> None:
    request = {
        "game_code": "dlt",
        "mode": "model_prediction",
        "count": 1,
        "budget_max": 200,
        "random_seed": 11,
    }
    with client_with_db(seeded_db) as client:
        forbidden = client.post("/v1/generate", json=request)
        allowed = client.post(
            "/v1/generate",
            json=request,
            headers={"X-Member-Token": "demo-member-token"},
        )

    assert forbidden.status_code == 403
    assert allowed.status_code == 200
    assert allowed.json()["member_feature"] is True
    assert allowed.json()["model_report"] is not None


def test_generate_falls_back_instead_of_422_for_legacy_budget_conflict(seeded_db: Session) -> None:
    request = {
        "game_code": "ssq",
        "mode": "model_prediction",
        "count": 1,
        "budget_max": 200,
        "complex_preference": "aggressive",
        "exclude_high_prize_history": True,
        "target_prize_mode": True,
        "random_seed": 19,
    }
    with client_with_db(seeded_db) as client:
        response = client.post(
            "/v1/generate",
            json=request,
            headers={"X-Member-Token": "demo-member-token"},
        )

    assert response.status_code == 200
    body = response.json()
    assert len(body["candidates"]) == 1
    assert body["candidates"][0]["total_cost"] <= 200
    assert body["model_report"]["compatibility_fallback"]["target_prize_mode"] is False


def test_generate_accepts_legacy_client_field_names(seeded_db: Session) -> None:
    legacy_request = {
        "lotteryType": "DoubleColorBall",
        "generateMode": "prediction",
        "count": 1,
        "budgetMax": 0,
        "complexPreference": "high_prize",
        "excludeHistory": True,
        "targetPrizeMode": False,
        "randomSeed": 23,
    }
    with client_with_db(seeded_db) as client:
        response = client.post(
            "/v1/generate",
            json=legacy_request,
            headers={"X-Member-Token": "demo-member-token"},
        )

    assert response.status_code == 200
    body = response.json()
    assert body["mode"] == "model_prediction"
    assert body["candidates"][0]["game_code"] == "ssq"


def test_admin_train_is_protected(seeded_db: Session) -> None:
    payload = {"game_code": "ssq", "rolling_window": 10, "random_seed": 1}
    with client_with_db(seeded_db) as client:
        unauthorized = client.post("/v1/admin/train", json=payload)
        authorized = client.post(
            "/v1/admin/train",
            json=payload,
            headers={"X-Admin-Token": "change-me-admin-token"},
        )

    assert unauthorized.status_code == 401
    assert authorized.status_code == 200
    assert authorized.json()["model_version"].startswith("ranker-v2-ssq-")
    assert "training_report" in authorized.json()


def test_demo_entitlement_verification_issues_member_token(seeded_db: Session) -> None:
    with client_with_db(seeded_db) as client:
        response = client.post(
            "/v1/entitlements/verify",
            json={
                "platform": "google_play",
                "product_id": "lottery_premium_monthly",
                "purchase_token": "demo-member-token",
                "product_type": "subscription",
            },
        )

    assert response.status_code == 200
    body = response.json()
    assert body["active"] is True
    assert body["entitlement"] == "premium"
    assert body["entitlement_token"] == "demo-member-token"
