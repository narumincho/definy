# definy-ui

クライアントとサーバーのサーバサイドレンダリングとの共通のUIのコード

## Browser E2E Test (WebDriver)

Rust でブラウザ実行確認をするために、`tests/browser_e2e.rs` を追加してあります。

前提:
- `chromedriver` か `geckodriver` か Selenium Server が起動していること
- デフォルト接続先は `http://localhost:4444`
- ChromeDriver と Chrome のバージョンが一致していない場合は `E2E_CHROME_BINARY` で実行バイナリを指定すること

実行例:

```sh
WEBDRIVER_URL=http://localhost:4444 \
E2E_BROWSER=chrome \
E2E_CHROME_BINARY="/tmp/chrome-for-testing-146.0.7680.31/chrome-mac-x64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing" \
cargo test -p definy-ui --test browser_e2e -- --ignored
```

Safari を使う場合:
- Safari の「設定 > 開発 > Allow Remote Automation」を有効化する必要があります。
