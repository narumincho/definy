#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"

echo "=== Building fullstack definy with Void (Vite 8) ==="
cd "${ROOT_DIR}"
npm run build

# dist-assets ディレクトリを準備 (wrangler.toml の assets.directory 向け)
OUTPUT_DIR="${ROOT_DIR}/dist-assets"
echo "=== Packaging assets into ${OUTPUT_DIR} ==="
rm -rf "${OUTPUT_DIR}"
mkdir -p "${OUTPUT_DIR}"

# クライアント静的成果物をコピー
cp -r "${ROOT_DIR}/dist/client/"* "${OUTPUT_DIR}/"

# 静的アセット用ヘッダー設定をコピー
if [ -f "${ROOT_DIR}/worker-assets/_headers" ]; then
  cp "${ROOT_DIR}/worker-assets/_headers" "${OUTPUT_DIR}/"
fi

echo "=== Build complete! Assets ready in ${OUTPUT_DIR} ==="
