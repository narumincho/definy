```sh
cargo build --target wasm32-unknown-unknown --release
wasm-bindgen --target bundler ./target/wasm32-unknown-unknown/release/server.wasm --out-dir ./out
deno run ./out/server.js
```
