# Billing and Entitlement Plan

Android subscriptions should use Google Play Billing. The app should send the purchase token to the backend after purchase or restore. The backend should validate the token with the Google Play Developer API, persist only the minimal entitlement state, and return whether premium features are active.

Premium entitlement unlocks:

- history high-prize exclusion
- model prediction
- budget-constrained generation
- advanced statistics and model reports

Subscription payments are software-feature fees only. They are not lottery stakes and do not purchase lottery tickets.

The current Android UI contains a demo membership switch that calls `/v1/entitlements/verify` with `LOTTERY_DEMO_MEMBER_TOKEN`; production builds should replace that switch with Google Play Billing purchase and restore flows.
