from contextlib import asynccontextmanager

from fastapi import FastAPI

from app.api.v1 import router
from app.core.config import get_settings
from app.db.models import Base
from app.db.session import engine


@asynccontextmanager
async def lifespan(app: FastAPI):
    settings = get_settings()
    if settings.auto_create_tables:
        Base.metadata.create_all(bind=engine)
    yield


app = FastAPI(
    title="Lottery Service",
    version="0.1.0",
    description=(
        "Lottery history, statistical generation, high-prize history exclusion, "
        "and membership-gated prediction APIs. This service is not a ticketing, "
        "sales, broker, or betting-payment platform."
    ),
    lifespan=lifespan,
)
app.include_router(router)

