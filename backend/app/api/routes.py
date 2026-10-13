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


def aws_session(request: AWSConnectionRequest):
    return boto3.Session(
        aws_access_key_id=request.access_key_id,
        aws_secret_access_key=request.secret_access_key,
        region_name=request.region,
    )


def cost_client(request: AWSConnectionRequest):
    # Cost Explorer is a global service endpoint in us-east-1.
    return aws_session(request).client("ce", region_name="us-east-1")


def handle_aws_error(exc: ClientError):
    code = exc.response.get("Error", {}).get("Code", "")
    if code in {"AccessDenied", "AccessDeniedException", "UnauthorizedOperation"}:
        raise HTTPException(
            status_code=403,
            detail="AWS credentials are valid, but permissions are missing. Add ce:GetCostAndUsage and the read-only permissions required for resource analysis.",
        ) from exc
    raise HTTPException(status_code=400, detail="AWS returned an error. Check IAM permissions, account settings, and try again.") from exc


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
        raise HTTPException(status_code=401, detail="Unable to authenticate with AWS. Verify the credentials and region.") from exc


@router.post("/cloud/aws/costs")
def aws_costs(request: AWSConnectionRequest):
    """Retrieve actual month-to-date cost by service and daily total from Cost Explorer."""
    today = date.today()
    start = today.replace(day=1)
    end = today + timedelta(days=1)  # End date is exclusive.
    try:
        ce = cost_client(request)
        by_service = ce.get_cost_and_usage(
            TimePeriod={"Start": start.isoformat(), "End": end.isoformat()},
            Granularity="MONTHLY",
            Metrics=["UnblendedCost"],
            GroupBy=[{"Type": "DIMENSION", "Key": "SERVICE"}],
        )
        daily = ce.get_cost_and_usage(
            TimePeriod={"Start": start.isoformat(), "End": end.isoformat()},
            Granularity="DAILY",
            Metrics=["UnblendedCost"],
        )
        service_groups = by_service.get("ResultsByTime", [{}])[0].get("Groups", [])
        services = []
        for group in service_groups:
            metric = group.get("Metrics", {}).get("UnblendedCost", {})
            amount = float(metric.get("Amount", "0"))
            if abs(amount) > 0.000001:
                services.append({"service": group.get("Keys", ["Unknown"])[0], "amount": round(amount, 2), "currency": metric.get("Unit", "USD")})
        services.sort(key=lambda item: abs(item["amount"]), reverse=True)
        daily_totals = []
        for period in daily.get("ResultsByTime", []):
            metric = period.get("Total", {}).get("UnblendedCost", {})
            daily_totals.append({"date": period.get("TimePeriod", {}).get("Start"), "amount": round(float(metric.get("Amount", "0")), 2)})
        total = sum(item["amount"] for item in services)
        currency = services[0]["currency"] if services else "USD"
        return {
            "period": {"start": start.isoformat(), "end_exclusive": end.isoformat()},
            "total": round(total, 2),
            "currency": currency,
            "services": services,
            "daily": daily_totals,
            "source": "AWS Cost Explorer",
            "note": "Billing data can be delayed. This is billed usage, not a live resource meter.",
        }
    except ClientError as exc:
        handle_aws_error(exc)
    except BotoCoreError as exc:
        raise HTTPException(status_code=502, detail="Could not reach AWS Cost Explorer. Please try again.") from exc


@router.post("/cloud/aws/recommendations")
def aws_recommendations(request: AWSConnectionRequest):
    """Scan supported resource types and return evidence-based review recommendations."""
    session = aws_session(request)
    region = request.region
    findings = []
    scan_status = []

    # EC2 and EBS inventory. Resource charges are estimated only where an account's actual
    # cost breakdown can be mapped safely; recommendations avoid inventing savings amounts.
    try:
        ec2 = session.client("ec2", region_name=region)
        for page in ec2.get_paginator("describe_instances").paginate(
            Filters=[{"Name": "instance-state-name", "Values": ["running"]}]
        ):
            for reservation in page.get("Reservations", []):
                for instance in reservation.get("Instances", []):
                    instance_id = instance["InstanceId"]
                    name = next((tag.get("Value") for tag in instance.get("Tags", []) if tag.get("Key") == "Name"), instance_id)
                    try:
                        cw = session.client("cloudwatch", region_name=region)
                        metric = cw.get_metric_statistics(
                            Namespace="AWS/EC2",
                            MetricName="CPUUtilization",
                            Dimensions=[{"Name": "InstanceId", "Value": instance_id}],
                            StartTime=__import__("datetime").datetime.now(__import__("datetime").timezone.utc) - timedelta(days=7),
                            EndTime=__import__("datetime").datetime.now(__import__("datetime").timezone.utc),
                            Period=3600,
                            Statistics=["Average"],
                        )
                        datapoints = metric.get("Datapoints", [])
                        if len(datapoints) >= 24 and sum(p["Average"] for p in datapoints) / len(datapoints) < 5:
                            findings.append({
                                "id": instance_id,
                                "service": "EC2",
                                "title": "Review low-CPU instance",
                                "detail": f"{name} averaged under 5% CPU across available hourly datapoints in the last 7 days.",
                                "action": "Check memory, network, disk, and business schedules before downsizing or scheduling stop.",
                                "risk": "medium",
                                "estimated_monthly_saving": None,
                            })
                    except ClientError:
                        scan_status.append({"service": "CloudWatch EC2 metrics", "status": "permission_missing_or_unavailable"})
        for page in ec2.get_paginator("describe_volumes").paginate():
            for volume in page.get("Volumes", []):
                if volume.get("State") == "available":
                    findings.append({
                        "id": volume["VolumeId"],
                        "service": "EBS",
                        "title": "Review unattached EBS volume",
                        "detail": f"Unattached {volume.get('Size', 0)} GiB volume in {volume.get('AvailabilityZone')}.",
                        "action": "Verify backups and ownership; snapshot if needed, then delete only after approval.",
                        "risk": "medium",
                        "estimated_monthly_saving": None,
                    })
        for address in ec2.describe_addresses().get("Addresses", []):
            if not address.get("AssociationId"):
                findings.append({
                    "id": address.get("AllocationId") or address.get("PublicIp", "Elastic IP"),
                    "service": "EC2 / Elastic IP",
                    "title": "Review unassociated Elastic IP",
                    "detail": "This Elastic IP is not associated with an instance or network interface.",
                    "action": "Release it if it is not reserved for a planned workload.",
                    "risk": "low",
                    "estimated_monthly_saving": None,
                })
        scan_status.append({"service": "EC2 and EBS inventory", "status": "scanned"})
    except ClientError as exc:
        code = exc.response.get("Error", {}).get("Code", "")
        scan_status.append({"service": "EC2 and EBS inventory", "status": "permission_missing_or_unavailable", "message": code})

    # RDS inventory: list resources for human review; do not label an instance idle without metrics.
    try:
        rds = session.client("rds", region_name=region)
        for page in rds.get_paginator("describe_db_instances").paginate():
            for db in page.get("DBInstances", []):
                if db.get("DBInstanceStatus") == "available":
                    findings.append({
                        "id": db.get("DBInstanceIdentifier", "RDS instance"),
                        "service": "RDS",
                        "title": "Review RDS sizing and utilization",
                        "detail": f"Instance class {db.get('DBInstanceClass', 'unknown')}; storage {db.get('AllocatedStorage', 'unknown')} GiB.",
                        "action": "Review CPU, connections, I/O, storage growth, and Performance Insights before rightsizing.",
                        "risk": "medium",
                        "estimated_monthly_saving": None,
                    })
        scan_status.append({"service": "RDS inventory", "status": "scanned"})
    except ClientError as exc:
        scan_status.append({"service": "RDS inventory", "status": "permission_missing_or_unavailable", "message": exc.response.get("Error", {}).get("Code", "")})

    return {
        "findings": findings,
        "scan_status": scan_status,
        "supported_checks": ["EC2 CPU metrics", "unattached EBS volumes", "unassociated Elastic IPs", "RDS inventory review"],
        "note": "Savings are not fabricated. Add pricing/cost allocation and service-specific metrics before assigning dollar savings. This is not yet an exhaustive scan of every AWS service.",
    }


@router.get("/recommendations")
def recommendations():
    return {"items": generate_demo_recommendations(), "currency": "INR", "demo": True}
