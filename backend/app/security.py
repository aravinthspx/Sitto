"""Cross-cutting HTTP security: rate limiting, response headers, safe errors."""
import logging

from flask import jsonify, request
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address
from werkzeug.exceptions import HTTPException

from app.config import Config

logger = logging.getLogger("sitto")

# Default limit applies to every route; auth routes add stricter ones.
limiter = Limiter(
    key_func=get_remote_address,
    default_limits=["300 per minute"],
    storage_uri=Config.RATELIMIT_STORAGE_URI,
    headers_enabled=True,
)

# Request bodies are small JSON payloads; refuse anything large.
MAX_CONTENT_LENGTH = 64 * 1024

GENERIC_ERROR = "Something went wrong on our side. Please try again."


def server_error(exc: Exception, status: int = 500):
    """Log the real exception server-side and return a generic message to the client."""
    logger.exception("Unhandled error on %s %s: %s", request.method, request.path, exc)
    return jsonify({"message": GENERIC_ERROR}), status


def _set_security_headers(response):
    h = response.headers
    h.setdefault("X-Content-Type-Options", "nosniff")
    h.setdefault("X-Frame-Options", "DENY")
    h.setdefault("Referrer-Policy", "no-referrer")
    h.setdefault("Cross-Origin-Opener-Policy", "same-origin")
    h.setdefault("Cross-Origin-Resource-Policy", "same-site")
    h.setdefault("Permissions-Policy", "camera=(), microphone=(), geolocation=()")
    # The API only serves JSON — nothing should ever be rendered or framed.
    h.setdefault("Content-Security-Policy", "default-src 'none'; frame-ancestors 'none'")
    if request.path.startswith("/api"):
        h.setdefault("Cache-Control", "no-store")
    if Config.IS_PRODUCTION:
        h.setdefault("Strict-Transport-Security", "max-age=31536000; includeSubDomains")
    h.pop("Server", None)
    return response


def init_security(app):
    app.config["MAX_CONTENT_LENGTH"] = MAX_CONTENT_LENGTH
    app.config["JSON_SORT_KEYS"] = False

    if Config.TRUSTED_PROXY_COUNT > 0:
        from werkzeug.middleware.proxy_fix import ProxyFix
        n = Config.TRUSTED_PROXY_COUNT
        app.wsgi_app = ProxyFix(app.wsgi_app, x_for=n, x_proto=n, x_host=n)

    limiter.init_app(app)
    app.after_request(_set_security_headers)

    @app.errorhandler(HTTPException)
    def handle_http_error(e):
        messages = {
            404: "Not found",
            405: "Method not allowed",
            413: "Request is too large",
            429: "Too many requests. Please wait a moment and try again.",
        }
        return jsonify({"message": messages.get(e.code, e.name)}), e.code

    @app.errorhandler(Exception)
    def handle_unexpected(e):
        return server_error(e)
