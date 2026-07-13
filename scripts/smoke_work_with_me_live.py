#!/usr/bin/env python3
from html.parser import HTMLParser
import json
import os
import ssl
import sys
from urllib.error import HTTPError, URLError
from urllib.request import HTTPRedirectHandler, Request, build_opener, urlopen


API_BASE = "https://api.sulemanji.com"
SITE_BASE = "https://www.sulemanji.com"
TIMEOUT_SECONDS = 20
EXPECTED_PRIORITY_CHECKOUT_READY = os.environ.get("PRIORITY_CHECKOUT_READY_EXPECTED", "false").strip().lower()
DEFAULT_HEADERS = {
    "user-agent": "sulemanji-live-smoke/1.0",
    "accept": "application/json,text/html;q=0.9,*/*;q=0.8",
}


class NoRedirect(HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        return None


class WorkWithMeParser(HTMLParser):
    def __init__(self):
        super().__init__()
        self.form_endpoint = ""
        self.turnstile_sitekey = ""
        self.priority_endpoint_base = ""
        self.checkout_ready = ""
        self.quote_endpoint_base = ""

    def handle_starttag(self, tag, attrs):
        data = dict(attrs)
        if tag == "form" and data.get("id") == "work-with-me-intake":
            self.form_endpoint = data.get("data-endpoint", "")
        if tag == "div" and data.get("class") == "cf-turnstile":
            self.turnstile_sitekey = data.get("data-sitekey", "")
        if tag == "button" and data.get("id") == "priority-checkout":
            self.priority_endpoint_base = data.get("data-endpoint-base", "")
            self.checkout_ready = data.get("data-checkout-ready", "")
        if tag == "div" and data.get("class") == "quote-shell":
            self.quote_endpoint_base = data.get("data-endpoint-base", "")


def request(url, method="GET", data=None, headers=None, follow_redirects=True):
    body = None
    if data is not None:
        body = json.dumps(data).encode("utf-8")
    req_headers = {**DEFAULT_HEADERS, **dict(headers or {})}
    if body is not None:
        req_headers.setdefault("content-type", "application/json")
    req = Request(url, data=body, method=method, headers=req_headers)
    context = ssl.create_default_context()
    opener = None if follow_redirects else build_opener(NoRedirect)
    try:
        if opener:
            response = opener.open(req, timeout=TIMEOUT_SECONDS)
        else:
            response = urlopen(req, timeout=TIMEOUT_SECONDS, context=context)
        payload = response.read()
        return response.status, dict(response.headers), payload
    except HTTPError as error:
        payload = error.read()
        return error.code, dict(error.headers), payload
    except URLError as error:
        raise AssertionError(f"{url} failed: {error}") from error


def decode_json(payload):
    text = payload.decode("utf-8", errors="replace")
    try:
        return json.loads(text)
    except json.JSONDecodeError as error:
        snippet = " ".join(text.split())[:160]
        raise AssertionError(f"expected JSON response, got {snippet!r}") from error


def check(condition, label, details=""):
    if not condition:
        suffix = f": {details}" if details else ""
        raise AssertionError(f"{label}{suffix}")
    print(f"ok - {label}")


def check_readiness():
    status, _, body = request(f"{API_BASE}/v1/readiness")
    data = decode_json(body)
    check(status == 200, "readiness returns HTTP 200", status)
    check(data == {"mode": "live", "ready": True, "missing": []}, "readiness reports live and ready", data)


def check_admin_access():
    status, headers, _ = request(f"{API_BASE}/v1/admin", follow_redirects=False)
    location = headers.get("Location", "")
    check(status == 302, "admin route redirects unauthenticated users", status)
    check("cloudflareaccess.com" in location, "admin route redirects to Cloudflare Access")


def check_webhook_rejects_unsigned_payload():
    status, _, body = request(f"{API_BASE}/v1/webhooks/stripe", method="POST", data={})
    data = decode_json(body)
    check(status == 400, "unsigned Stripe webhook is rejected", status)
    check(data.get("error") == "invalid_signature", "unsigned Stripe webhook returns invalid_signature", data)


def check_missing_case_is_private():
    status, _, body = request(f"{API_BASE}/v1/cases/smoke-no-such-case")
    data = decode_json(body)
    check(status == 404, "unknown public case token returns 404", status)
    check(data.get("error") == "not_found", "unknown public case token returns not_found", data)


def parse_page(path):
    status, _, body = request(f"{SITE_BASE}{path}")
    parser = WorkWithMeParser()
    parser.feed(body.decode("utf-8"))
    return status, parser


def check_public_pages():
    check(EXPECTED_PRIORITY_CHECKOUT_READY in ["true", "false"], "expected checkout readiness is true or false", EXPECTED_PRIORITY_CHECKOUT_READY)

    status, work = parse_page("/work-with-me")
    check(status == 200, "Work With Me page returns HTTP 200", status)
    check(work.form_endpoint == f"{API_BASE}/v1/intakes", "intake form points at api.sulemanji.com", work.form_endpoint)
    check(work.turnstile_sitekey.startswith("0x"), "intake form includes a public Turnstile site key")

    status, priority = parse_page("/work-with-me/priority")
    check(status == 200, "Priority Discovery page returns HTTP 200", status)
    check(priority.priority_endpoint_base == f"{API_BASE}/v1/cases", "priority checkout points at api.sulemanji.com", priority.priority_endpoint_base)
    check(
        priority.checkout_ready == EXPECTED_PRIORITY_CHECKOUT_READY,
        f"priority checkout readiness matches expected {EXPECTED_PRIORITY_CHECKOUT_READY}",
        priority.checkout_ready,
    )

    status, quote = parse_page("/work-with-me/quote")
    check(status == 200, "Private quote page returns HTTP 200", status)
    check(quote.quote_endpoint_base == f"{API_BASE}/v1/quotes", "private quote page points at api.sulemanji.com", quote.quote_endpoint_base)


def main():
    checks = [
        check_readiness,
        check_admin_access,
        check_webhook_rejects_unsigned_payload,
        check_missing_case_is_private,
        check_public_pages,
    ]
    failures = []
    for check_fn in checks:
        try:
            check_fn()
        except Exception as error:
            failures.append(str(error))

    if failures:
        print("\nLive smoke check failed:", file=sys.stderr)
        for failure in failures:
            print(f"- {failure}", file=sys.stderr)
        return 1

    print("\nLive smoke check passed.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
