#!/usr/bin/env python3
"""GULUDEK private Windows companion. Read-only telemetry; localhost only."""
from __future__ import annotations

import ctypes
import ctypes.wintypes
import hmac
import json
import os
import platform
import secrets
import shutil
import socket
import time
from datetime import datetime, timezone
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

ROOT = Path(__file__).resolve().parent
PAGE = ROOT / "guludek.html"
PORT = 8765
STATE_DIR = Path(os.environ.get("LOCALAPPDATA", str(Path.home()))) / "GULUDEK"
TOKEN_FILE = STATE_DIR / "access.token"


def load_token() -> tuple[str, bool]:
    STATE_DIR.mkdir(parents=True, exist_ok=True)
    if TOKEN_FILE.exists():
        token = TOKEN_FILE.read_text(encoding="utf-8").strip()
        if len(token) >= 40:
            return token, False
    token = secrets.token_urlsafe(48)
    TOKEN_FILE.write_text(token + "\n", encoding="utf-8")
    return token, True


TOKEN, NEW_TOKEN = load_token()


def filetime_value(value: ctypes.wintypes.FILETIME) -> int:
    return (value.dwHighDateTime << 32) | value.dwLowDateTime


def cpu_percent() -> float | None:
    if os.name != "nt":
        return None
    class FT(ctypes.Structure):
        _fields_ = [("dwLowDateTime", ctypes.c_uint32), ("dwHighDateTime", ctypes.c_uint32)]
    idle1, kernel1, user1 = FT(), FT(), FT()
    idle2, kernel2, user2 = FT(), FT(), FT()
    get_times = ctypes.windll.kernel32.GetSystemTimes
    if not get_times(ctypes.byref(idle1), ctypes.byref(kernel1), ctypes.byref(user1)):
        return None
    time.sleep(0.18)
    if not get_times(ctypes.byref(idle2), ctypes.byref(kernel2), ctypes.byref(user2)):
        return None
    idle = filetime_value(idle2) - filetime_value(idle1)
    kernel = filetime_value(kernel2) - filetime_value(kernel1)
    user = filetime_value(user2) - filetime_value(user1)
    total = kernel + user
    if total <= 0:
        return 0.0
    return round(max(0.0, min(100.0, (1.0 - idle / total) * 100.0)), 1)


def memory_info() -> dict:
    if os.name != "nt":
        return {"total": None, "available": None, "used_percent": None}
    class MEMORYSTATUSEX(ctypes.Structure):
        _fields_ = [
            ("dwLength", ctypes.c_ulong), ("dwMemoryLoad", ctypes.c_ulong),
            ("ullTotalPhys", ctypes.c_ulonglong), ("ullAvailPhys", ctypes.c_ulonglong),
            ("ullTotalPageFile", ctypes.c_ulonglong), ("ullAvailPageFile", ctypes.c_ulonglong),
            ("ullTotalVirtual", ctypes.c_ulonglong), ("ullAvailVirtual", ctypes.c_ulonglong),
            ("ullAvailExtendedVirtual", ctypes.c_ulonglong),
        ]
    state = MEMORYSTATUSEX()
    state.dwLength = ctypes.sizeof(state)
    if not ctypes.windll.kernel32.GlobalMemoryStatusEx(ctypes.byref(state)):
        return {"total": None, "available": None, "used_percent": None}
    return {
        "total": state.ullTotalPhys,
        "available": state.ullAvailPhys,
        "used_percent": int(state.dwMemoryLoad),
    }


def battery_info() -> dict:
    if os.name != "nt":
        return {"present": False, "percent": None, "charging": None}
    class SYSTEM_POWER_STATUS(ctypes.Structure):
        _fields_ = [
            ("ACLineStatus", ctypes.c_ubyte), ("BatteryFlag", ctypes.c_ubyte),
            ("BatteryLifePercent", ctypes.c_ubyte), ("Reserved1", ctypes.c_ubyte),
            ("BatteryLifeTime", ctypes.c_ulong), ("BatteryFullLifeTime", ctypes.c_ulong),
        ]
    state = SYSTEM_POWER_STATUS()
    if not ctypes.windll.kernel32.GetSystemPowerStatus(ctypes.byref(state)):
        return {"present": False, "percent": None, "charging": None}
    present = state.BatteryFlag != 128
    percent = state.BatteryLifePercent if present and state.BatteryLifePercent <= 100 else None
    return {"present": present, "percent": percent, "charging": state.ACLineStatus == 1}


def disk_info() -> list[dict]:
    disks = []
    if os.name == "nt":
        mask = ctypes.windll.kernel32.GetLogicalDrives()
        for index in range(26):
            if mask & (1 << index):
                root = f"{chr(65 + index)}:\\"
                try:
                    usage = shutil.disk_usage(root)
                    disks.append({
                        "name": root, "total": usage.total, "free": usage.free,
                        "used_percent": round((usage.used / usage.total) * 100, 1) if usage.total else 0,
                    })
                except OSError:
                    continue
    else:
        try:
            usage = shutil.disk_usage("/")
            disks.append({"name": "/", "total": usage.total, "free": usage.free,
                          "used_percent": round((usage.used / usage.total) * 100, 1) if usage.total else 0})
        except OSError:
            pass
    return disks


def get_status() -> dict:
    boot_ms = ctypes.windll.kernel32.GetTickCount64() if os.name == "nt" else None
    try:
        addresses = sorted({item[4][0] for item in socket.getaddrinfo(socket.gethostname(), None)
                            if item[0] in (socket.AF_INET, socket.AF_INET6)})
    except OSError:
        addresses = []
    return {
        "device": socket.gethostname(),
        "platform": platform.platform(),
        "os": f"{platform.system()} {platform.release()}",
        "python": platform.python_version(),
        "cpu_percent": cpu_percent(),
        "memory": memory_info(),
        "disks": disk_info(),
        "battery": battery_info(),
        "uptime_seconds": int(boot_ms / 1000) if boot_ms is not None else None,
        "addresses": addresses,
        "sampled_at": datetime.now(timezone.utc).isoformat(),
        "mode": "read-only",
        "execution_enabled": False,
    }


class Handler(BaseHTTPRequestHandler):
    server_version = "GULUDEK-Local/1.0"

    def log_message(self, fmt, *args):
        print("[GULUDEK]", fmt % args)

    def headers(self, content_type="application/json; charset=utf-8"):
        self.send_header("Content-Type", content_type)
        self.send_header("Cache-Control", "no-store")
        self.send_header("X-Content-Type-Options", "nosniff")
        self.send_header("Referrer-Policy", "no-referrer")
        self.send_header("Content-Security-Policy", "default-src 'self'; style-src 'self' 'unsafe-inline'; script-src 'self' 'unsafe-inline'; connect-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'")

    def authorized(self) -> bool:
        supplied = self.headers.get("Authorization", "")
        if not supplied.startswith("Bearer "):
            return False
        return hmac.compare_digest(supplied[7:].strip(), TOKEN)

    def send_json(self, code: int, payload: dict):
        body = json.dumps(payload, separators=(",", ":")).encode("utf-8")
        self.send_response(code)
        self.headers()
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_GET(self):
        if self.path in ("/", "/guludek.html"):
            try:
                body = PAGE.read_bytes()
            except OSError:
                self.send_error(500, "GULUDEK page file is missing")
                return
            self.send_response(200)
            self.headers("text/html; charset=utf-8")
            self.send_header("Content-Length", str(len(body)))
            self.end_headers()
            self.wfile.write(body)
            return
        if self.path == "/api/health":
            self.send_json(200, {"status": "ok", "service": "GULUDEK local companion"})
            return
        if self.path == "/api/status":
            if not self.authorized():
                self.send_json(401, {"error": "Authentication required"})
                return
            self.send_json(200, get_status())
            return
        self.send_json(404, {"error": "Not found"})

    def do_POST(self):
        # No remote command execution or system-changing endpoints are implemented.
        self.send_json(403, {"error": "GULUDEK is read-only. No remote actions are enabled."})

    def do_PUT(self):
        self.send_json(403, {"error": "Remote changes are disabled."})

    def do_DELETE(self):
        self.send_json(403, {"error": "Remote changes are disabled."})


def main():
    if not PAGE.is_file():
        raise SystemExit(f"Missing dashboard file: {PAGE}")
    print("")
    print("GULUDEK private computer manager")
    print("Local address: http://127.0.0.1:8765")
    print("Read-only telemetry. No remote commands or system changes are enabled.")
    if NEW_TOKEN:
        print("")
        print("FIRST-START ACCESS TOKEN (save it privately; it will not be shown again):")
        print(TOKEN)
    print("")
    print("For remote access, use a private device-to-device VPN such as Tailscale.")
    print("Do not expose port 8765 directly to the public internet.")
    server = ThreadingHTTPServer(("127.0.0.1", PORT), Handler)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nGULUDEK stopped.")
    finally:
        server.server_close()


if __name__ == "__main__":
    main()
