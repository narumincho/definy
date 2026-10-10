#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"

# 必要ならビルドを実行（引数で --skip-build が渡された場合はスキップ可能）
if [[ "${1:-}" != "--skip-build" ]]; then
  echo "=== Building definy-client with Dioxus CLI ==="
  cd "${ROOT_DIR}"
  dx build --package definy-client --release
fi

OUTPUT_DIR="${ROOT_DIR}/dist-assets"
echo "=== Packaging Cloudflare Workers Static Assets into ${OUTPUT_DIR} ==="
rm -rf "${OUTPUT_DIR}"
mkdir -p "${OUTPUT_DIR}"

# Dioxus クライアント成果物をコピー
cp -r "${ROOT_DIR}/target/dx/definy_client/release/web/public/"* "${OUTPUT_DIR}/"

# 静的アセット用ヘッダー設定をコピー
if [ -f "${ROOT_DIR}/worker-assets/_headers" ]; then
  cp "${ROOT_DIR}/worker-assets/_headers" "${OUTPUT_DIR}/"
fi

echo "=== Build complete! Static assets ready in ${OUTPUT_DIR} ==="
