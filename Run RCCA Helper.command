#!/bin/bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
DIST_DIR="$SCRIPT_DIR/dist"
PORTABLE_HTML="$DIST_DIR/RCCA Helper.html"

if [ -f "$PORTABLE_HTML" ]; then
  open "$PORTABLE_HTML"
  exit 0
fi

osascript -e 'display dialog "RCCA Helper portable app was not found. Run npm install and npm run build first." buttons {"OK"} default button "OK" with icon caution'
exit 1
