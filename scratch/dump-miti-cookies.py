#!/usr/bin/env python3
"""
dump-miti-cookies.py

Ekstrak cookies sesi SahamOnline MITI (sahamonline.miti.gov.my) dari profil
Chrome pengguna (yang sudah login) dan simpan ke scratch/miti-cookies.json.

scrape-miti-applicants.js membaca fail ini untuk ambil "Jumlah Pelabur Mohon
Saham" TANPA perlu login manual + CAPTCHA setiap kali.

CARA GUNA:
    python3 scratch/dump-miti-cookies.py
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
OUT = os.path.join(SCRATCH, "miti-cookies.json")

REQUIRED = ["PHPSESSID", "_csrf", "_panelUserpublic"]


def main():
    cookies = list(browser_cookie3.chrome(domain_name=".miti.gov.my"))
    if not cookies:
        print("⚠️  Tiada cookies sahamonline.miti.gov.my dalam Chrome.")
        print("   Sila login ke https://sahamonline.miti.gov.my/portal/login dulu (guna Chrome), kemudian cuba lagi.")
        sys.exit(1)

    names = {c.name for c in cookies}
    missing = [r for r in REQUIRED if r not in names]
    if missing:
        print("⚠️  Cookies tidak lengkap — kurang: %s (mungkin sesi expired)." % ", ".join(missing))
        print("   Login semula ke portal SahamOnline MITI dan cuba lagi.")
        sys.exit(1)

    header = "; ".join("%s=%s" % (c.name, c.value) for c in cookies)
    data = {
        "extractedAt": datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
        "cookieHeader": header,
        "count": len(cookies),
        "hasSession": all(r in names for r in REQUIRED),
    }
    with open(OUT, "w") as f:
        json.dump(data, f, indent=2)

    print("✅ Cookies MITI disimpan (%d cookies, PHPSESSID + _csrf + _panelUserpublic)" % len(cookies))
    print("   → %s" % OUT)


if __name__ == "__main__":
    main()