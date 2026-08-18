#!/usr/bin/env bash
# =============================================================================
# setup-auto-runner.sh — SETUP SEKALI untuk auto-sync IPO Hunter di laptop baru
#
# CARA GUNA (dalam folder repo ipohunterv2):
#   bash setup-auto-runner.sh
#
# Apa yang script ni buat:
#   1) Semak node & dependencies (npm install jika perlu)
#   2) Semak/setup cookies isaham (perlu login isaham dalam Chrome sekali)
#   3) Cipta systemd service (auto-start bila laptop buka + login)
#   4) Start service & test sync-isaham.js sekali
# =============================================================================
set -e

REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
echo "📂 Repo: $REPO_DIR"

# --- 1) Node ---
NODE_BIN="$(command -v node || true)"
if [ -z "$NODE_BIN" ]; then
    echo "❌ node tak dijumpai. Install dulu: https://nodejs.org (LTS)"
    exit 1
fi
echo "✅ Node: $NODE_BIN ($(node --version))"

# --- 2) Dependencies ---
if [ ! -d "$REPO_DIR/node_modules/axios" ]; then
    echo "📦 npm install..."
    (cd "$REPO_DIR" && npm install)
else
    echo "✅ node_modules sudah ada"
fi

# --- 3) Python + browser_cookie3 (untuk extract cookies Chrome) ---
PY_BIN="$(command -v python3 || true)"
if [ -z "$PY_BIN" ]; then
    echo "❌ python3 tak dijumpai. Install dulu."
    exit 1
fi
if ! python3 -c "import browser_cookie3" 2>/dev/null; then
    echo "🐍 Install browser_cookie3..."
    pip3 install --user --break-system-packages browser_cookie3 2>/dev/null \
        || pip3 install --user browser_cookie3
else
    echo "✅ browser_cookie3 sudah ada"
fi

# --- 4) Cookies isaham (perlu login isaham dalam Chrome SEKALI) ---
echo "🍪 Semak cookies isaham..."
if python3 "$REPO_DIR/scratch/dump-isaham-cookies.py"; then
    echo "✅ Cookies OK — sesi isaham sah"
else
    echo "⚠️  Cookies belum ada."
    echo "   → Buka Chrome, login https://www.isaham.my (Facebook/Telegram),"
    echo "   → pastikan halaman /ipo terbuka, lepas tu run script ni sekali lagi."
    exit 1
fi

# --- 5) systemd service (auto-start bila laptop buka) ---
SERVICE_DIR="$HOME/.config/systemd/user"
mkdir -p "$SERVICE_DIR"
cat > "$SERVICE_DIR/ipohunter-auto-runner.service" << EOF
[Unit]
Description=IPO Hunter Auto Runner (isaham sync + MITI sync)
After=network-online.target

[Service]
Type=simple
WorkingDirectory=$REPO_DIR
ExecStart=$NODE_BIN $REPO_DIR/auto_runner.js
Restart=always
RestartSec=15
Environment=HOME=$HOME
Environment=PATH=$(dirname "$NODE_BIN"):/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin
StandardOutput=append:$REPO_DIR/auto_runner.log
StandardError=append:$REPO_DIR/auto_runner.log

[Install]
WantedBy=default.target
EOF

systemctl --user daemon-reload
systemctl --user enable ipohunter-auto-runner.service > /dev/null 2>&1
systemctl --user restart ipohunter-auto-runner.service

echo "✅ Service ipohunter-auto-runner aktif:"
systemctl --user status ipohunter-auto-runner.service --no-pager | head -6

# --- 6) Test sync-isaham sekali ---
echo ""
echo "🧪 Test sync-isaham.js (pastikan [iSaham] OK, bukan DEGRADED)..."
(cd "$REPO_DIR" && timeout 180 node sync-isaham.js 2>&1 | grep -E "\[iSaham\]|Sync Complete|Total IPOs|DEGRADED" | head -8)

echo ""
echo "===================================================================="
echo "🎉 SELESAI! Auto-sync sudah jalan di background."
echo "    - Sync IPO: 08:45, 13:00, 17:30 (Isnin-Jumaat)"
echo "    - Sync MITI: setiap 30 minit"
echo "    - Bila laptop buka + login → service start sendiri"
echo "    - Log: $REPO_DIR/auto_runner.log"
echo "    - Kalau cookies expire: login semula isaham dalam Chrome,"
echo "      lepas tu run: bash setup-auto-runner.sh"
echo "===================================================================="