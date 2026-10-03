from fastapi import APIRouter
from app.services.recommendations import generate_demo_recommendations

router = APIRouter()


@router.get("/health")
def health():
    return {"status": "ok"}


@router.get("/recommendations")
def recommendations():
    return {
        "items": generate_demo_recommendations(),
        "currency": "INR",
    }
