#!/usr/bin/env python3
"""
Normalize URLs for news-curator deduplication.

What it does:
- lowercases scheme and host
- removes default ports (:80 for http, :443 for https)
- removes fragments
- strips common tracking parameters (utm_*, fbclid, gclid, ...)
- sorts remaining query parameters
- normalizes path slashes
- optionally removes trailing slash (except root)
- returns canonicalized URL and sha256 hash

Usage:
    python normalize_url.py "https://Example.com/foo/?utm_source=x#frag"

    echo "https://example.com/a?b=1&utm_source=x" | python normalize_url.py
"""

from __future__ import annotations

import argparse
import hashlib
import json
import posixpath
import re
import sys
from dataclasses import dataclass, asdict
from typing import Iterable
from urllib.parse import parse_qsl, urlencode, urlsplit, urlunsplit


TRACKING_PARAM_EXACT = {
    "fbclid",
    "gclid",
    "dclid",
    "gbraid",
    "wbraid",
    "mc_cid",
    "mc_eid",
    "igshid",
    "mkt_tok",
    "yclid",
    "_hsenc",
    "_hsmi",
    "vero_conv",
    "vero_id",
    "ref_src",
    "ref_url",
}

TRACKING_PARAM_PREFIXES = (
    "utm_",
    "pk_",
    "ga_",
    "icn",
    "ici",
)

MULTISLASH_RE = re.compile(r"/{2,}")


@dataclass
class NormalizedURL:
    original: str
    normalized: str
    url_hash: str
    domain: str


def should_drop_query_param(key: str) -> bool:
    k = key.lower()
    if k in TRACKING_PARAM_EXACT:
        return True
    return any(k.startswith(prefix) for prefix in TRACKING_PARAM_PREFIXES)


def normalize_netloc(scheme: str, netloc: str) -> str:
    """
    Lowercase host, preserve userinfo if present, strip default ports.
    """
    userinfo = ""
    hostport = netloc

    if "@" in netloc:
        userinfo, hostport = netloc.rsplit("@", 1)
        userinfo += "@"

    host = hostport
    port = None

    # naive but practical split for host:port
    if hostport.startswith("["):
        # IPv6 literal like [::1]:8080
        if "]" in hostport:
            idx = hostport.find("]")
            host = hostport[: idx + 1]
            rest = hostport[idx + 1 :]
            if rest.startswith(":"):
                port = rest[1:]
    elif ":" in hostport:
        host, port = hostport.rsplit(":", 1)

    host = host.lower()

    if (scheme == "http" and port == "80") or (scheme == "https" and port == "443"):
        port = None

    if port:
        return f"{userinfo}{host}:{port}"
    return f"{userinfo}{host}"


def normalize_path(path: str) -> str:
    """
    Normalize path while preserving a leading slash.
    """
    if not path:
        return "/"

    path = MULTISLASH_RE.sub("/", path)

    leading = "/" if path.startswith("/") else ""
    normalized = posixpath.normpath(path)

    # posixpath.normpath("") -> "."
    if normalized == ".":
        normalized = "/"
    elif leading and not normalized.startswith("/"):
        normalized = "/" + normalized

    return normalized


def normalize_query(query: str) -> str:
    pairs = parse_qsl(query, keep_blank_values=True)

    filtered = [
        (k, v)
        for k, v in pairs
        if not should_drop_query_param(k)
    ]

    filtered.sort(key=lambda kv: (kv[0], kv[1]))
    return urlencode(filtered, doseq=True)


def normalize_url(url: str, *, drop_trailing_slash: bool = True) -> NormalizedURL:
    raw = url.strip()
    if not raw:
        raise ValueError("URL is empty")

    parts = urlsplit(raw)

    scheme = (parts.scheme or "https").lower()
    netloc = normalize_netloc(scheme, parts.netloc)
    path = normalize_path(parts.path)
    query = normalize_query(parts.query)
    fragment = ""

    if drop_trailing_slash and path != "/" and path.endswith("/"):
        path = path[:-1]

    normalized = urlunsplit((scheme, netloc, path, query, fragment))
    url_hash = hashlib.sha256(normalized.encode("utf-8")).hexdigest()

    # domain without userinfo / port
    domain = netloc.rsplit("@", 1)[-1]
    if domain.startswith("["):
        # keep IPv6 literal as-is, maybe with :port already removed
        pass
    elif ":" in domain:
        domain = domain.rsplit(":", 1)[0]

    return NormalizedURL(
        original=raw,
        normalized=normalized,
        url_hash=url_hash,
        domain=domain,
    )


def iter_input_urls(cli_urls: list[str]) -> Iterable[str]:
    if cli_urls:
        yield from cli_urls
        return

    for line in sys.stdin:
        line = line.strip()
        if line:
            yield line


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="Normalize URLs for news-curator.")
    parser.add_argument(
        "urls",
        nargs="*",
        help="URLs to normalize. If omitted, reads one URL per line from stdin.",
    )
    parser.add_argument(
        "--no-drop-trailing-slash",
        action="store_true",
        help="Keep trailing slash on non-root paths.",
    )
    parser.add_argument(
        "--jsonl",
        action="store_true",
        help="Output one JSON object per line.",
    )
    parser.add_argument(
        "--normalized-only",
        action="store_true",
        help="Output only the normalized URL.",
    )
    return parser


def main() -> int:
    parser = build_parser()
    args = parser.parse_args()

    exit_code = 0

    for raw_url in iter_input_urls(args.urls):
        try:
            result = normalize_url(
                raw_url,
                drop_trailing_slash=not args.no_drop_trailing_slash,
            )
        except Exception as exc:
            exit_code = 1
            print(
                json.dumps(
                    {"original": raw_url, "error": str(exc)},
                    ensure_ascii=False,
                ),
                file=sys.stderr,
            )
            continue

        if args.normalized_only:
            print(result.normalized)
        elif args.jsonl:
            print(json.dumps(asdict(result), ensure_ascii=False))
        else:
            print(f"original   : {result.original}")
            print(f"normalized : {result.normalized}")
            print(f"url_hash   : {result.url_hash}")
            print(f"domain     : {result.domain}")
            print()

    return exit_code


if __name__ == "__main__":
    raise SystemExit(main())
