import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api.routes import router

app = FastAPI(
    title="Cloud Cost Optimization API",
    version="0.1.0",
    description="Read-only cloud cost analysis and optimization recommendations.",
)

# Include the deployed frontend origin and optional additional origins from env.
extra_origins = [
    origin.strip()
    for origin in os.getenv("CORS_ORIGINS", "").split(",")
    if origin.strip()
]
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://34.47.220.204:3000",
        *extra_origins,
    ],
    allow_credentials=False,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["Content-Type", "Authorization"],
)

app.include_router(router, prefix="/api")


@app.get("/")
def root():
    return {"name": "cloud-cost-optimization-api", "version": "0.1.0"}
