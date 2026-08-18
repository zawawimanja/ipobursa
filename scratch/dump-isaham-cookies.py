#!/usr/bin/env python3
"""
dump-isaham-cookies.py

Ekstrak cookies sesi isaham.my dari profil Chrome pengguna (yang sudah login
via Facebook/Telegram) dan simpan ke scratch/isaham-cookies.json.

sync-isaham.js akan membaca fail ini untuk bypass Cloudflare 403 — cookies
cf_clearance + login diambil dari browser sebenar, jadi permintaan axios
dianggap sebagai sesi manusia yang sah.

CARA GUNA:
    python3 scratch/dump-isaham-cookies.py

Cron/auto_runner: jalankan sebelum sync jika fail cookies tiada atau stale.
"""

import json
import os
import sys
import datetime

try:
    import browser_cookie3
except ImportError:
    print("browser_cookie3 tidak dipasang. Jalankan:")
    print("    pip3 install --user --break-system-packages browser_cookie3")
    sys.exit(1)

SCRATCH = os.path.join(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(SCRATCH, "isaham-cookies.json")


def main():
    cookies = list(browser_cookie3.chrome(domain_name=".isaham.my"))
    if not cookies:
        print("⚠️  Tiada cookies isaham.my dalam Chrome.")
        print("   Sila login ke https://www.isaham.my guna Facebook/Telegram dulu, kemudian cuba lagi.")
        sys.exit(1)

    has_login = any(c.name == "login" for c in cookies)
    has_cf = any("clearance" in c.name for c in cookies)
    if not has_login or not has_cf:
        print("⚠️  Cookies tidak lengkap (login=%s cf_clearance=%s) — mungkin sesi expired." % (has_login, has_cf))
        print("   Login semula ke isaham.my dan cuba lagi.")
        sys.exit(1)

    header = "; ".join("%s=%s" % (c.name, c.value) for c in cookies)
    data = {
        "extractedAt": datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
        "cookieHeader": header,
        "count": len(cookies),
        "hasLogin": has_login,
        "hasCfClearance": has_cf,
    }
    with open(OUT, "w") as f:
        json.dump(data, f, indent=2)

    print("✅ Cookies isaham disimpan (%d cookies, login=%s, cf_clearance=%s)" % (len(cookies), has_login, has_cf))
    print("   → %s" % OUT)


if __name__ == "__main__":
    main()
