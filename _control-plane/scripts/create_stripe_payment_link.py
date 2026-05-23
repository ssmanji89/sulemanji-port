#!/usr/bin/env python3
"""Create Stripe product, price, and payment link for a control-plane product.

Default mode is dry-run. Use --execute only after reviewing the generated plan.
The script never prints secret values.
"""

from __future__ import annotations

import argparse
import json
import os
import sys
import urllib.parse
import urllib.request
from pathlib import Path


API_BASE = "https://api.stripe.com/v1"


def load_env_file(path: Path) -> None:
    if not path.exists():
        raise SystemExit(f"env file not found: {path}")
    for line in path.read_text(errors="ignore").splitlines():
        stripped = line.strip()
        if not stripped or stripped.startswith("#") or "=" not in stripped:
            continue
        if stripped.startswith("export "):
            stripped = stripped[7:].strip()
        key, value = stripped.split("=", 1)
        key = key.strip()
        value = value.strip().strip('"').strip("'")
        if key and key not in os.environ:
            os.environ[key] = value


def stripe_post(path: str, secret_key: str, fields: list[tuple[str, str]], idempotency_key: str) -> dict:
    encoded = urllib.parse.urlencode(fields).encode()
    req = urllib.request.Request(
        f"{API_BASE}{path}",
        data=encoded,
        headers={
            "Authorization": f"Bearer {secret_key}",
            "Content-Type": "application/x-www-form-urlencoded",
            "Idempotency-Key": idempotency_key,
        },
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=30) as response:
            return json.loads(response.read().decode())
    except urllib.error.HTTPError as exc:
        body = exc.read().decode(errors="replace")
        raise SystemExit(f"stripe API error {exc.code}: {body}") from exc


def build_plan(args: argparse.Namespace) -> dict:
    unit_amount = int(round(args.price_usd * 100))
    return {
        "product_id": args.product_id,
        "version": args.version,
        "currency": args.currency,
        "unit_amount": unit_amount,
        "unit_amount_usd": args.price_usd,
        "product_name": args.name,
        "description": args.description,
        "metadata": {
            "product_id": args.product_id,
            "version": args.version,
            "source": "sulemanji-control-plane",
        },
    }


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--execute", action="store_true", help="create live Stripe objects")
    parser.add_argument("--env-file", type=Path, help="optional env file containing STRIPE_SECRET_KEY")
    parser.add_argument("--output", type=Path, help="write non-secret Stripe result JSON")
    parser.add_argument("--product-id", default="mcp-operator-field-manual")
    parser.add_argument("--version", default="0.1.0")
    parser.add_argument("--name", default="MCP Operator Field Manual")
    parser.add_argument("--description", default="Templates and examples for operating MCP servers and clients safely.")
    parser.add_argument("--price-usd", type=float, default=49.00)
    parser.add_argument("--currency", default="usd")
    args = parser.parse_args()

    if args.env_file:
        load_env_file(args.env_file)

    plan = build_plan(args)
    print(json.dumps({"mode": "execute" if args.execute else "dry-run", "plan": plan}, indent=2))

    if not args.execute:
        return 0

    secret_key = os.environ.get("STRIPE_SECRET_KEY")
    if not secret_key:
        raise SystemExit("STRIPE_SECRET_KEY is required for --execute")

    product = stripe_post(
        "/products",
        secret_key,
        [
            ("name", plan["product_name"]),
            ("description", plan["description"]),
            ("metadata[product_id]", plan["metadata"]["product_id"]),
            ("metadata[version]", plan["metadata"]["version"]),
            ("metadata[source]", plan["metadata"]["source"]),
        ],
        f"{args.product_id}-{args.version}-product",
    )
    price = stripe_post(
        "/prices",
        secret_key,
        [
            ("currency", plan["currency"]),
            ("unit_amount", str(plan["unit_amount"])),
            ("product", product["id"]),
            ("metadata[product_id]", plan["metadata"]["product_id"]),
            ("metadata[version]", plan["metadata"]["version"]),
            ("metadata[source]", plan["metadata"]["source"]),
        ],
        f"{args.product_id}-{args.version}-price-{plan['unit_amount']}",
    )
    payment_link = stripe_post(
        "/payment_links",
        secret_key,
        [
            ("line_items[0][price]", price["id"]),
            ("line_items[0][quantity]", "1"),
            ("metadata[product_id]", plan["metadata"]["product_id"]),
            ("metadata[version]", plan["metadata"]["version"]),
            ("metadata[source]", plan["metadata"]["source"]),
            ("after_completion[type]", "hosted_confirmation"),
            (
                "after_completion[hosted_confirmation][custom_message]",
                "Payment received. Fulfillment is manual for this early version.",
            ),
        ],
        f"{args.product_id}-{args.version}-payment-link-{price['id']}",
    )
    result = {
        "product_id": product["id"],
        "price_id": price["id"],
        "payment_link_id": payment_link["id"],
        "payment_link_url": payment_link["url"],
        "livemode": bool(product.get("livemode")),
    }
    print(json.dumps({"created": result}, indent=2))
    if args.output:
        args.output.parent.mkdir(parents=True, exist_ok=True)
        args.output.write_text(json.dumps(result, indent=2) + "\n")
    return 0


if __name__ == "__main__":
    sys.exit(main())
