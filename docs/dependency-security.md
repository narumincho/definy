# 依存パッケージの脆弱性対応

## Dependabot アラートの調べ方

GitHub の Dependabot アラート API (`gh api repos/narumincho/definy/dependabot/alerts/<番号>`) は、Claude のクラウド環境の GitHub 連携からは 403 (`Resource not accessible by integration`) になり読めない。その場合は次のコマンドで該当パッケージを特定する。

```sh
npm audit --package-lock-only
```

`--package-lock-only` を付けると `node_modules` が無くても lock ファイルだけで判定できる。

## 推移的依存の脆弱性を overrides で直す

直接の依存ではなく、依存の依存が古いバージョンを固定しているときは、`package.json` の `overrides` で上書きする。

### 例: esbuild (GHSA-67mh-4wv8-2f99, Dependabot #101)

`void` → `drizzle-kit` → `@esbuild-kit/esm-loader` → `@esbuild-kit/core-utils` が `esbuild@~0.18.20` を固定しており、開発サーバーに任意のサイトからリクエストを送れる脆弱性 (esbuild <= 0.24.2) が報告されていた。`@esbuild-kit` は非推奨で更新されないため、`npm audit` は「No fix available」と表示する。

`@esbuild-kit/core-utils` は esbuild の `transform` / `transformSync` しか使っていないので、新しい esbuild でも動く。そこで次のように、他のパッケージと同じ esbuild に揃えた。

```json
"overrides": {
  "@esbuild-kit/core-utils": {
    "esbuild": "^0.28.2"
  }
}
```

### 注意点

- `overrides` を追加しただけで `npm install` すると、lock ファイルに残っている古いネストした依存 (`node_modules/@esbuild-kit/core-utils/node_modules/esbuild` など) が残り、`npm ls` が `invalid` エラーになる。lock ファイルから該当するネストしたエントリを消し、`node_modules` 側の同じディレクトリも消してから `npm install` し直すと解消する。
- 更新後は `npm audit` と `npm ls <パッケージ名>` で、上書きが効いて重複 (deduped) になっていることを確認する。
