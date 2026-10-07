#!/bin/sh
set -e

echo "=== definy Virtual Wasm Runner ==="

PORT="${PORT:-8080}"
WASM_PATH=""

# 優先度 1: デプロイ時直接注入 (Fly.io config.files) で配置されたローカルファイル
if [ -n "${WASM_FILE}" ] && [ -f "${WASM_FILE}" ]; then
  echo "Using injected WebAssembly binary at: ${WASM_FILE}"
  WASM_PATH="${WASM_FILE}"
elif [ -f "/app/definy_core.wasm" ]; then
  echo "Found injected WebAssembly binary at /app/definy_core.wasm"
  WASM_PATH="/app/definy_core.wasm"
# 優先度 2: リモートサーバーからの HTTP オンデマンド取得 (フォールバック)
elif [ -n "${DEFINY_SERVER_URL}" ] && [ -n "${DEFINY_WASM_HASH}" ]; then
  WASM_PATH="/tmp/app.wasm"
  FETCH_URL="${DEFINY_SERVER_URL}/virtual/wasm/${DEFINY_WASM_HASH}.wasm"
  echo "Fetching virtual WebAssembly binary from: ${FETCH_URL}..."

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
else
  echo "ERROR: No WebAssembly binary found. Neither WASM_FILE exists nor DEFINY_SERVER_URL/DEFINY_WASM_HASH is provided."
  exit 1
fi

FILE_SIZE=$(wc -c < "${WASM_PATH}" | tr -d ' ')
echo "WebAssembly binary ready (${FILE_SIZE} bytes)."

echo "Starting wasmtime serve on 0.0.0.0:${PORT}..."
exec wasmtime serve "${WASM_PATH}" --addr "0.0.0.0:${PORT}"
