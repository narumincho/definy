```sh
cargo build -p definy-client --target wasm32-unknown-unknown --release
wasm-bindgen --target web ./target/wasm32-unknown-unknown/release/definy_client.wasm --out-dir ./web-distribution
cargo run -p definy-server
```
