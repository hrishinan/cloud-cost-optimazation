from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
import boto3
from botocore.exceptions import BotoCoreError, ClientError

from app.services.recommendations import generate_demo_recommendations

router = APIRouter()


class AWSConnectionRequest(BaseModel):
    access_key_id: str = Field(min_length=16)
    secret_access_key: str = Field(min_length=16)
    region: str = Field(default="ap-south-1", min_length=1)


@router.get("/health")
def health():
    return {"status": "ok"}


@router.post("/cloud/aws/connect")
def connect_aws(request: AWSConnectionRequest):
    try:
        session = boto3.Session(
            aws_access_key_id=request.access_key_id,
            aws_secret_access_key=request.secret_access_key,
            region_name=request.region,
        )
        sts = session.client("sts")
        identity = sts.get_caller_identity()

        return {
            "connected": True,
            "provider": "AWS",
            "account_id": identity.get("Account"),
            "arn": identity.get("Arn"),
            "region": request.region,
        }
    except (ClientError, BotoCoreError) as exc:
        raise HTTPException(
            status_code=401,
            detail="Unable to authenticate with AWS. Please verify the credentials and region.",
        ) from exc


@router.get("/recommendations")
def recommendations():
    return {
        "items": generate_demo_recommendations(),
        "currency": "INR",
    }
