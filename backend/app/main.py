from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api.routes import router

app = FastAPI(
    title="Cloud Cost Optimization API",
    version="0.1.0",
    description="Read-only cloud cost analysis and optimization recommendations.",
)

# Allow the local Next.js frontend to call the API during development.
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ],
    allow_credentials=False,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["Content-Type", "Authorization"],
)

app.include_router(router, prefix="/api")


@app.get("/")
def root():
    return {"name": "cloud-cost-optimization-api", "version": "0.1.0"}
