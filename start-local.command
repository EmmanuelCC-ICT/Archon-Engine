#!/bin/zsh

cd "$(dirname "$0")" || exit 1

URL="http://127.0.0.1:8765/"
PORT="8765"

node tools/build-standalone.mjs || exit 1

if lsof -iTCP:"$PORT" -sTCP:LISTEN >/dev/null 2>&1; then
  open "$URL"
  exit 0
fi

python3 -m http.server "$PORT" >/tmp/archon-engine-server.log 2>&1 &
SERVER_PID=$!

sleep 1
open "$URL"

wait "$SERVER_PID"
