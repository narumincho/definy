# 使われていないコードの探し方

definy の処理を TypeScript から definy に移すと, TypeScript 側に使われなくなった関数や export が残りやすい。
[knip](https://knip.dev) で探せる (依存には入れていないので `npx` で動かす)。

knip は Void の `pages/` などを入口と分からないので, 入口を指定する設定を一時的に置いて動かす:

```sh
cat > knip.json <<'JSON'
{
  "entry": [
    "pages/**/*.{ts,tsx}",
    "middleware/**/*.ts",
    "worker/index.ts",
    "scripts/*.ts",
    "e2e/**/*.ts",
    "**/*.test.ts"
  ],
  "project": ["**/*.{ts,tsx}"]
}
JSON
npx -y knip@5 --no-progress --reporter compact --no-exit-code
rm knip.json
```

- テストも入口にしているので, 「Unused exports」はテストからも使われていない export。そのファイルの中で使っていれば `export` を外し,
  使っていなければ消す
- `export` を外すと, ファイルの中でも使っていないものは `npm run lint` (oxlint の `no-unused-vars`) が警告するので, それも消す
- 2026-11-01 にこの手順で, 外から使われていない export (値 67 個, 型 80 個) の `export` を外し, どこからも使われていない関数・型を消した
