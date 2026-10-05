#!/bin/sh
set -e

echo "=== definy Virtual Wasm Runner ==="

if [ -z "${DEFINY_SERVER_URL}" ]; then
  echo "ERROR: DEFINY_SERVER_URL environment variable is required."
  exit 1
fi

if [ -z "${DEFINY_WASM_HASH}" ]; then
  echo "ERROR: DEFINY_WASM_HASH environment variable is required."
  exit 1
fi

PORT="${PORT:-8080}"
WASM_PATH="/tmp/app.wasm"
FETCH_URL="${DEFINY_SERVER_URL}/virtual/wasm/${DEFINY_WASM_HASH}.wasm"

echo "Fetching virtual WebAssembly binary from: ${FETCH_URL}..."

# リトライ付きで仮想 Wasm ファイルをダウンロード
RETRY_COUNT=0
MAX_RETRIES=5
while [ "${RETRY_COUNT}" -lt "${MAX_RETRIES}" ]; do
  if curl -sSf "${FETCH_URL}" -o "${WASM_PATH}"; then
    break
  fi
  RETRY_COUNT=$((RETRY_COUNT + 1))
  echo "Download attempt ${RETRY_COUNT} failed. Retrying in 2 seconds..."
  sleep 2
done

if [ ! -f "${WASM_PATH}" ]; then
  echo "ERROR: Failed to download WebAssembly binary after ${MAX_RETRIES} attempts."
  exit 1
fi

FILE_SIZE=$(wc -c < "${WASM_PATH}" | tr -d ' ')
echo "WebAssembly binary downloaded successfully (${FILE_SIZE} bytes)."

echo "Starting wasmtime serve on 0.0.0.0:${PORT}..."
exec wasmtime serve "${WASM_PATH}" --addr "0.0.0.0:${PORT}"
