from dataclasses import asdict, dataclass


@dataclass
class Recommendation:
    resource_id: str
    resource_type: str
    title: str
    estimated_monthly_saving: float
    risk_level: str


def generate_demo_recommendations():
    # Demo data only. AWS discovery will replace this in the next milestone.
    items = [
        Recommendation("i-demo-001", "EC2", "Review consistently idle EC2 instance", 8400.0, "low"),
        Recommendation("vol-demo-001", "EBS", "Review unattached EBS volume", 1850.0, "low"),
        Recommendation("snap-demo-001", "Snapshot", "Review old EBS snapshot", 1120.0, "low"),
    ]
    return [asdict(item) for item in items]
