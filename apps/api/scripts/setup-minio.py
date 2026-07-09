import json
import os
import time

import boto3
from botocore.client import Config
from botocore.exceptions import ClientError


def wait_for_minio(endpoint, access_key, secret_key, max_retries=30):
    for _ in range(max_retries):
        try:
            client = boto3.client(
                "s3",
                endpoint_url=endpoint,
                aws_access_key_id=access_key,
                aws_secret_access_key=secret_key,
                config=Config(signature_version="s3v4"),
                region_name="us-east-1",
            )
            client.list_buckets()
            return client
        except Exception:
            time.sleep(2)
    raise ConnectionError("MinIO not reachable")


def create_bucket(client, bucket_name):
    try:
        client.head_bucket(Bucket=bucket_name)
    except ClientError as e:
        if e.response["Error"]["Code"] == "404":
            client.create_bucket(Bucket=bucket_name)


def set_bucket_policy(client, bucket_name):
    policy = {
        "Version": "2012-10-17",
        "Statement": [
            {
                "Effect": "Allow",
                "Principal": "*",
                "Action": "s3:GetObject",
                "Resource": f"arn:aws:s3:::{bucket_name}/*",
            }
        ],
    }
    client.put_bucket_policy(Bucket=bucket_name, Policy=json.dumps(policy))


def main():
    endpoint_url = os.environ["AWS_S3_ENDPOINT_URL"]
    bucket_name = os.environ["AWS_STORAGE_BUCKET_NAME"]
    access_key = os.environ["AWS_ACCESS_KEY_ID"]
    secret_key = os.environ["AWS_SECRET_ACCESS_KEY"]
    client = wait_for_minio(endpoint_url, access_key, secret_key)
    create_bucket(client, bucket_name)
    set_bucket_policy(client, bucket_name)


if __name__ == "__main__":
    main()
