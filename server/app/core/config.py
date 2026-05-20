from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = "Lottery Service"
    app_env: str = "development"
    database_url: str = "sqlite:///./lottery_dev.db"
    redis_url: str = "redis://localhost:6379/0"
    admin_token: str = "change-me-admin-token"
    demo_member_token: str = "demo-member-token"
    auto_create_tables: bool = True
    generate_rate_limit_per_minute: int = 60
    google_play_package_name: str = "com.lottery.app"
    google_play_service_account_file: str | None = None
    premium_product_ids: str = "lottery_premium_monthly,lottery_premium_yearly"
    cwl_user_agent: str = (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36"
    )

    model_config = SettingsConfigDict(
        env_file=".env",
        env_prefix="LOTTERY_",
        case_sensitive=False,
        extra="ignore",
    )


@lru_cache
def get_settings() -> Settings:
    return Settings()
