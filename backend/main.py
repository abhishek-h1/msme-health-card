import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from database import engine, Base
from api.health import router as health_router
from api.businesses import router as businesses_router
from api.synthetic import router as synthetic_router

Base.metadata.create_all(bind=engine)

app = FastAPI(title="MSME Health Card API", version="0.1.0")

# Always allow local dev; ALLOWED_ORIGINS adds deployed frontend origins
# (comma-separated, e.g. "https://msme-health-card.vercel.app").
default_origins = ["http://localhost:3000", "http://127.0.0.1:3000"]
extra_origins = [origin.strip() for origin in os.getenv("ALLOWED_ORIGINS", "").split(",") if origin.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=default_origins + extra_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health_router)
app.include_router(businesses_router)
app.include_router(synthetic_router)


@app.get("/")
def root():
    return {"name": app.title, "version": app.version, "docs": "/docs", "health": "/health"}
