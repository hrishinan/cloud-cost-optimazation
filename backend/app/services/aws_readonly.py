"""Read-only AWS integration boundary.

Use an assumed cross-account role in production. Do not use long-lived
access keys or add mutating AWS API calls to this module.
"""
import boto3


def get_cost_explorer_client(region_name: str = "us-east-1"):
    """Return a Cost Explorer client using the configured AWS credential chain."""
    return boto3.client("ce", region_name=region_name)


def get_ec2_client(region_name: str = "us-east-1"):
    """Return an EC2 client using the configured AWS credential chain."""
    return boto3.client("ec2", region_name=region_name)
