from dataclasses import dataclass

from app.core.config import get_settings
from app.schemas.api import EntitlementVerifyRequest


ACTIVE_SUBSCRIPTION_STATES = {
    "SUBSCRIPTION_STATE_ACTIVE",
    "SUBSCRIPTION_STATE_IN_GRACE_PERIOD",
    "SUBSCRIPTION_STATE_ON_HOLD",
}


@dataclass(frozen=True)
class EntitlementResult:
    active: bool
    platform: str
    product_id: str
    entitlement: str | None
    entitlement_token: str | None
    source: str
    message: str
    raw_state: dict | None = None


def _premium_product_ids() -> set[str]:
    settings = get_settings()
    return {
        item.strip()
        for item in settings.premium_product_ids.split(",")
        if item.strip()
    }


def verify_entitlement(payload: EntitlementVerifyRequest) -> EntitlementResult:
    settings = get_settings()
    if payload.platform != "google_play":
        return EntitlementResult(
            active=False,
            platform=payload.platform,
            product_id=payload.product_id,
            entitlement=None,
            entitlement_token=None,
            source="server",
            message="unsupported billing platform",
        )

    if payload.purchase_token == settings.demo_member_token:
        active = payload.product_id in _premium_product_ids()
        return EntitlementResult(
            active=active,
            platform=payload.platform,
            product_id=payload.product_id,
            entitlement="premium" if active else None,
            entitlement_token=settings.demo_member_token if active else None,
            source="demo",
            message="demo entitlement token accepted" if active else "product is not premium",
        )

    if not settings.google_play_service_account_file:
        return EntitlementResult(
            active=False,
            platform=payload.platform,
            product_id=payload.product_id,
            entitlement=None,
            entitlement_token=None,
            source="google_play",
            message="Google Play service account is not configured",
        )

    return _verify_google_play(payload)


def _verify_google_play(payload: EntitlementVerifyRequest) -> EntitlementResult:
    settings = get_settings()
    try:
        from google.oauth2 import service_account
        from googleapiclient.discovery import build
    except ImportError:
        return EntitlementResult(
            active=False,
            platform=payload.platform,
            product_id=payload.product_id,
            entitlement=None,
            entitlement_token=None,
            source="google_play",
            message="Google Play verification dependencies are not installed",
        )

    scopes = ["https://www.googleapis.com/auth/androidpublisher"]
    credentials = service_account.Credentials.from_service_account_file(
        settings.google_play_service_account_file,
        scopes=scopes,
    )
    service = build("androidpublisher", "v3", credentials=credentials, cache_discovery=False)
    package_name = payload.package_name or settings.google_play_package_name

    if payload.product_type == "subscription":
        raw = (
            service.purchases()
            .subscriptionsv2()
            .get(packageName=package_name, token=payload.purchase_token)
            .execute()
        )
        state = raw.get("subscriptionState")
        active = state in ACTIVE_SUBSCRIPTION_STATES and payload.product_id in _premium_product_ids()
        return EntitlementResult(
            active=active,
            platform=payload.platform,
            product_id=payload.product_id,
            entitlement="premium" if active else None,
            entitlement_token=payload.purchase_token if active else None,
            source="google_play",
            message=f"subscription state: {state}",
            raw_state={"subscriptionState": state},
        )

    raw = (
        service.purchases()
        .products()
        .get(
            packageName=package_name,
            productId=payload.product_id,
            token=payload.purchase_token,
        )
        .execute()
    )
    active = raw.get("purchaseState") == 0 and payload.product_id in _premium_product_ids()
    return EntitlementResult(
        active=active,
        platform=payload.platform,
        product_id=payload.product_id,
        entitlement="premium" if active else None,
        entitlement_token=payload.purchase_token if active else None,
        source="google_play",
        message=f"product purchase state: {raw.get('purchaseState')}",
        raw_state={"purchaseState": raw.get("purchaseState")},
    )

