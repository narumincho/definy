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

OUTPUT_DIR="${ROOT_DIR}/dist-pages"
echo "=== Packaging Cloudflare Pages artifacts into ${OUTPUT_DIR} ==="
rm -rf "${OUTPUT_DIR}"
mkdir -p "${OUTPUT_DIR}"

# Dioxus クライアント成果物をコピー
cp -r "${ROOT_DIR}/target/dx/definy_client/release/web/public/"* "${OUTPUT_DIR}/"

# Cloudflare Pages 設定ファイルと Functions をコピー
if [ -f "${ROOT_DIR}/pages/_redirects" ]; then
  cp "${ROOT_DIR}/pages/_redirects" "${OUTPUT_DIR}/"
fi

if [ -f "${ROOT_DIR}/pages/_headers" ]; then
  cp "${ROOT_DIR}/pages/_headers" "${OUTPUT_DIR}/"
fi

if [ -d "${ROOT_DIR}/pages/functions" ]; then
  cp -r "${ROOT_DIR}/pages/functions" "${OUTPUT_DIR}/"
  # デプロイパッケージからテスト用ファイルを除去
  rm -f "${OUTPUT_DIR}/functions/"*_test.ts
fi

echo "=== Build complete! Artifacts ready in ${OUTPUT_DIR} ==="
