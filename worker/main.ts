/**
 * Cloudflare Workers のエントリポイント。
 *
 * definy のパーツを実行する Wasm モジュール（`definy-worker-runtime`）を読み込んで設定する。
 * wrangler は `.wasm` の import を事前コンパイル済みの `WebAssembly.Module` として扱う。
 * ローカルでは `scripts/build-assets.sh` で `worker/generated/` にビルドしておくこと。
 */
// @ts-ignore: wrangler が .wasm を WebAssembly.Module として解決する
import runtimeModule from "./generated/definy_worker_runtime.wasm";
import { setDefinyRuntimeModule } from "./definy_runtime.ts";
import worker from "./index.ts";

setDefinyRuntimeModule(runtimeModule as WebAssembly.Module);

export default worker;
