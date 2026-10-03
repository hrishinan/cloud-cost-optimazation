from fastapi import FastAPI
from app.api.routes import router

app = FastAPI(
    title="Cloud Cost Optimization API",
    version="0.1.0",
    description="Read-only cloud cost analysis and optimization recommendations.",
)

app.include_router(router, prefix="/api")


@app.get("/")
def root():
    return {"name": "cloud-cost-optimization-api", "version": "0.1.0"}
