"""Select and verify the newest Cloudflare Worker deployment readback."""

from __future__ import annotations

import argparse
import json
from datetime import datetime
from pathlib import Path
from typing import Any


def verify_deployment(payload: Any, expected_message: str) -> str:
    deployments = payload.get("deployments") if isinstance(payload, dict) else payload
    if not isinstance(deployments, list) or not deployments:
        raise ValueError("deployment readback returned no deployments")

    dated: list[tuple[datetime, dict[str, Any]]] = []
    for deployment in deployments:
        if not isinstance(deployment, dict):
            raise ValueError("deployment readback contains an invalid entry")
        created_on = deployment.get("created_on")
        if not isinstance(created_on, str):
            raise ValueError("deployment readback omitted a deployment timestamp")
        try:
            timestamp = datetime.fromisoformat(created_on.replace("Z", "+00:00"))
        except ValueError as error:
            raise ValueError("deployment readback contains an invalid timestamp") from error
        if timestamp.tzinfo is None:
            raise ValueError("deployment readback timestamp has no timezone")
        dated.append((timestamp, deployment))

    newest_time = max(timestamp for timestamp, _ in dated)
    newest = [deployment for timestamp, deployment in dated if timestamp == newest_time]
    if len(newest) != 1:
        raise ValueError("newest deployment timestamp is ambiguous")
    deployment = newest[0]
    if deployment.get("annotations", {}).get("workers/message") != expected_message:
        raise ValueError("latest deployment source does not match the requested source")

    versions = deployment.get("versions")
    if not isinstance(versions, list) or len(versions) != 1:
        raise ValueError("latest deployment is not a single-version release")
    version = versions[0]
    if version.get("percentage") != 100:
        raise ValueError("latest deployment is not serving 100 percent")
    version_id = version.get("version_id")
    if not isinstance(version_id, str) or not version_id:
        raise ValueError("latest deployment omitted its Worker version id")
    return version_id


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("deployments", type=Path)
    parser.add_argument("expected_message")
    args = parser.parse_args()
    try:
        payload = json.loads(args.deployments.read_text(encoding="utf-8"))
        version_id = verify_deployment(payload, args.expected_message)
    except (OSError, json.JSONDecodeError, ValueError) as error:
        parser.error(str(error))
    print(version_id)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
