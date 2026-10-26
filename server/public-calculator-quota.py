#!/usr/bin/env python3
"""Vakento anonymous calculator quota: 3 uses per visitor cookie, persisted in SQLite.

Behind the HTTPS website proxy; listens on 127.0.0.1 only.
No personal data or calculation inputs are stored. The random browser cookie
identifies a browser, NOT a person: clearing cookies permits a new quota.
"""
import hashlib
import json
import os
import re
import secrets
import sqlite3
import time
from http.cookies import SimpleCookie
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import urlsplit

LIMIT = 3
COOKIE_NAME = "vakento_calc_visitor"
DB = os.getenv("VAKENTO_QUOTA_DB", "/var/lib/vakento-calculators/usage.sqlite3")
PORT = int(os.getenv("VAKENTO_QUOTA_PORT", "38119"))
ALLOWED_ORIGINS = {"https://vakento.nl", "https://www.vakento.nl"}
COOKIE_RE = re.compile(r"^[a-f0-9]{64}$")
ALLOWED_TYPES = {"hour-form", "quote-form", "profit-form", "estimator"}


def db_connect():
    conn = sqlite3.connect(DB, timeout=10, isolation_level=None)
    conn.execute("PRAGMA busy_timeout=10000")
    return conn


def init_db():
    os.makedirs(os.path.dirname(DB), exist_ok=True)
    with db_connect() as db:
        db.execute("PRAGMA journal_mode=WAL")
        db.execute("""CREATE TABLE IF NOT EXISTS calculator_uses (
            visitor_hash TEXT PRIMARY KEY,
            used INTEGER NOT NULL DEFAULT 0 CHECK (used BETWEEN 0 AND 3),
            updated_at INTEGER NOT NULL
        )""")


class Handler(BaseHTTPRequestHandler):
    server_version = "VakentoCalculator/1.0"
    sys_version = ""

    def log_message(self, format, *args):
        # Do not write visitor IDs, cookies, IPs or request parameters to logs.
        pass

    def visitor(self):
        cookie_value = None
        try:
            c = SimpleCookie()
            c.load(self.headers.get("Cookie", "")[:4096])
            if COOKIE_NAME in c:
                cookie_value = c[COOKIE_NAME].value
        except Exception:
            pass
        new_cookie = not cookie_value or not COOKIE_RE.fullmatch(cookie_value)
        if new_cookie:
            cookie_value = secrets.token_hex(32)
        return hashlib.sha256(cookie_value.encode("ascii")).hexdigest(), (
            cookie_value if new_cookie else None
        )

    def reply(self, status, payload, new_cookie=None):
        body = json.dumps(payload, separators=(",", ":")).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "private, no-store")
        self.send_header("X-Content-Type-Options", "nosniff")
        self.send_header("Referrer-Policy", "no-referrer")
        if new_cookie:
            self.send_header(
                "Set-Cookie",
                f"{COOKIE_NAME}={new_cookie}; Path=/; Max-Age=15552000; "
                "HttpOnly; Secure; SameSite=Lax"
            )
        self.end_headers()
        self.wfile.write(body)

    def read_count(self, identifier):
        with db_connect() as db:
            row = db.execute(
                "SELECT used FROM calculator_uses WHERE visitor_hash=?",
                (identifier,),
            ).fetchone()
            return row[0] if row else 0

    def do_GET(self):
        path = urlsplit(self.path).path
        if path == "/health":
            self.reply(200, {"ok": True})
            return
        if path != "/api/public-calculators/status":
            self.reply(404, {"error": "not_found"})
            return
        visitor, new_cookie = self.visitor()
        used = self.read_count(visitor)
        self.reply(200, {"limit": LIMIT, "used": used, "remaining": LIMIT - used},
                   new_cookie)

    def do_POST(self):
        if urlsplit(self.path).path != "/api/public-calculators/consume":
            self.reply(404, {"error": "not_found"})
            return
        if (self.headers.get("Origin", "") not in ALLOWED_ORIGINS
                or self.headers.get("Sec-Fetch-Site", "same-origin") != "same-origin"
                or self.headers.get("X-Vakento-Calculator") != "1"
                or self.headers.get("Content-Type", "").split(";")[0].strip()
                != "application/json"):
            self.reply(403, {"error": "forbidden"})
            return
        try:
            length = int(self.headers.get("Content-Length", "0"))
            if not 1 <= length <= 512:
                raise ValueError()
            payload = json.loads(self.rfile.read(length))
            if not isinstance(payload, dict) or payload.get("calculator") not in ALLOWED_TYPES:
                raise ValueError()
        except (ValueError, TypeError, json.JSONDecodeError):
            self.reply(400, {"error": "invalid_request"})
            return
        visitor, new_cookie = self.visitor()
        now = int(time.time())
        with db_connect() as db:
            db.execute("BEGIN IMMEDIATE")
            db.execute(
                "INSERT OR IGNORE INTO calculator_uses(visitor_hash,used,updated_at) "
                "VALUES(?,0,?)", (visitor, now))
            updated = db.execute(
                "UPDATE calculator_uses SET used=used+1, updated_at=? "
                "WHERE visitor_hash=? AND used<?", (now, visitor, LIMIT)
            ).rowcount
            used = db.execute(
                "SELECT used FROM calculator_uses WHERE visitor_hash=?",
                (visitor,)
            ).fetchone()[0]
            db.commit()
        self.reply(200 if updated else 409,
                   {"limit": LIMIT, "used": used,
                    "remaining": LIMIT - used, "allowed": bool(updated)},
                   new_cookie)


if __name__ == "__main__":
    init_db()
    server = ThreadingHTTPServer(("127.0.0.1", PORT), Handler)
    server.serve_forever()
