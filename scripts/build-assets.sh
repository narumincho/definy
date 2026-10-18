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

# Worker でパーツを実行する Rust 製ランタイム (worker/generated/definy_worker_runtime.wasm)
bash "${ROOT_DIR}/scripts/build-worker-runtime.sh"

# デプロイ時 / ローカル D1 初期化用のシード SQL を出力（dist-assets には含めない）
SEED_SQL_PATH="${ROOT_DIR}/target/definy_seed.sql"
echo "=== Exporting builtin D1 seed SQL into ${SEED_SQL_PATH} ==="
cd "${ROOT_DIR}"
cargo run -p definy-server --release -- --export-seed-sql "${SEED_SQL_PATH}"

echo "=== Build complete! Static assets ready in ${OUTPUT_DIR}, D1 seed SQL ready in ${SEED_SQL_PATH} ==="
