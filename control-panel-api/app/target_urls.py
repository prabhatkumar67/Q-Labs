"""Shared URL semantics for inspection, execution and exported acceptance tests."""

from urllib.parse import urlsplit, urlunsplit


def origin(url):
    parts = urlsplit(url)
    return (parts.scheme.lower(), parts.hostname, parts.port or (443 if parts.scheme == "https" else 80))


def same_origin(request_url, target_url):
    try:
        return origin(request_url) == origin(target_url) and urlsplit(request_url).scheme in {"http", "https"}
    except ValueError:
        return False


def navigation_url(target_url, path):
    parts = urlsplit(target_url)
    # Preserve old saved demo plans whose '/' meant the selected fixture's entry page.
    if parts.hostname in {"localhost", "127.0.0.1"} and parts.port == 8120 and parts.path.rstrip("/") in {"/broken", "/fixed"} and path == "/":
        return target_url.rstrip("/") + "/"
    if not path.startswith("/") or path.startswith("//") or "\\" in path or any(ord(char) < 32 for char in path):
        raise ValueError("Navigation needs a path on the selected app's origin.")
    return urlunsplit((parts.scheme, parts.netloc, "", "", "")) + path
