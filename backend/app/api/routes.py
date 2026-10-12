from datetime import date, timedelta

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


class AWSCostRequest(AWSConnectionRequest):
    pass


def aws_session(request: AWSConnectionRequest):
    return boto3.Session(
        aws_access_key_id=request.access_key_id,
        aws_secret_access_key=request.secret_access_key,
        region_name=request.region,
    )


@router.get("/health")
def health():
    return {"status": "ok"}


@router.post("/cloud/aws/connect")
def connect_aws(request: AWSConnectionRequest):
    try:
        identity = aws_session(request).client("sts").get_caller_identity()
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


@router.post("/cloud/aws/costs")
def aws_costs(request: AWSCostRequest):
    """Return actual AWS Cost Explorer spend for the current calendar month."""
    today = date.today()
    start = today.replace(day=1)
    # Cost Explorer's End date is exclusive; tomorrow includes today's partial data if available.
    end = today + timedelta(days=1)

    try:
        client = aws_session(request).client("ce", region_name="us-east-1")
        response = client.get_cost_and_usage(
            TimePeriod={"Start": start.isoformat(), "End": end.isoformat()},
            Granularity="MONTHLY",
            Metrics=["UnblendedCost"],
            GroupBy=[{"Type": "DIMENSION", "Key": "SERVICE"}],
        )
        results = response.get("ResultsByTime", [])
        groups = results[0].get("Groups", []) if results else []
        services = []
        total = 0.0
        for group in groups:
            amount = float(group.get("Metrics", {}).get("UnblendedCost", {}).get("Amount", "0"))
            unit = group.get("Metrics", {}).get("UnblendedCost", {}).get("Unit", "USD")
            total += amount
            if abs(amount) > 0.000001:
                services.append({"service": group.get("Keys", ["Unknown"])[0], "amount": round(amount, 2), "currency": unit})
        services.sort(key=lambda item: abs(item["amount"]), reverse=True)
        return {
            "period": {"start": start.isoformat(), "end_exclusive": end.isoformat()},
            "total": round(total, 2),
            "currency": (services[0]["currency"] if services else "USD"),
            "services": services,
            "source": "AWS Cost Explorer",
        }
    except ClientError as exc:
        code = exc.response.get("Error", {}).get("Code", "")
        if code in {"AccessDenied", "AccessDeniedException", "UnauthorizedOperation"}:
            raise HTTPException(
                status_code=403,
                detail="AWS credentials are valid, but they lack Cost Explorer permission. Add ce:GetCostAndUsage to the IAM policy and ensure Cost Explorer is enabled.",
            ) from exc
        raise HTTPException(status_code=400, detail="AWS Cost Explorer could not return cost data. Check the AWS account and Cost Explorer settings.") from exc
    except BotoCoreError as exc:
        raise HTTPException(status_code=502, detail="Could not reach AWS Cost Explorer. Please try again.") from exc


@router.get("/recommendations")
def recommendations():
    return {
        "items": generate_demo_recommendations(),
        "currency": "INR",
        "demo": True,
    }
