#!/usr/bin/env bash
# Cloudflare Workers でパーツを実行する Rust 製ランタイム (definy-worker-runtime) を wasm32 向けにビルドし、
# worker/generated/definy_worker_runtime.wasm に置く。worker/main.ts がこれを import する。
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"
cd "${ROOT_DIR}"

echo "=== Building definy-worker-runtime (wasm32-unknown-unknown, release) ==="
cargo build -p definy-worker-runtime --release --target wasm32-unknown-unknown
mkdir -p worker/generated
cp target/wasm32-unknown-unknown/release/definy_worker_runtime.wasm worker/generated/
ls -l worker/generated/definy_worker_runtime.wasm
