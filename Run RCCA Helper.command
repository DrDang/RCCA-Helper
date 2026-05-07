#!/bin/bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
DIST_DIR="$SCRIPT_DIR/dist"
PORTABLE_HTML="$DIST_DIR/RCCA Helper.html"

if [ -f "$PORTABLE_HTML" ]; then
  open "$PORTABLE_HTML"
  exit 0
fi

if [ ! -f "$DIST_DIR/index.html" ]; then
  osascript -e 'display dialog "RCCA Helper build files were not found. Run npm install and npm run build first." buttons {"OK"} default button "OK" with icon caution'
  exit 1
fi

if ! command -v python3 >/dev/null 2>&1; then
  osascript -e 'display dialog "python3 was not found, so the local launcher could not start. Install Python 3 or run the app another way." buttons {"OK"} default button "OK" with icon caution'
  exit 1
fi

PORT="$(python3 - <<'PY'
import socket

for port in range(4173, 4200):
    sock = socket.socket()
    try:
        sock.bind(("127.0.0.1", port))
    except OSError:
        sock.close()
        continue
    sock.close()
    print(port)
    break
else:
    raise SystemExit(1)
PY
)"

cd "$DIST_DIR"
python3 -m http.server "$PORT" --bind 127.0.0.1 >/tmp/rcca-helper-server.log 2>&1 &
SERVER_PID=$!

cleanup() {
  if kill -0 "$SERVER_PID" >/dev/null 2>&1; then
    kill "$SERVER_PID" >/dev/null 2>&1 || true
  fi
}

trap cleanup EXIT INT TERM

sleep 1
if ! open "http://127.0.0.1:$PORT"; then
  echo "Could not automatically open the browser."
  echo "Open this URL manually: http://127.0.0.1:$PORT"
fi

echo "RCCA Helper is running at http://127.0.0.1:$PORT"
echo "Keep this Terminal window open while using the app."
echo "Press Ctrl+C to stop the local server."

wait "$SERVER_PID"
