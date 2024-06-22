# definy

いろいろ整理中... いろいろ調整する前
https://github.com/narumincho/definy/tree/prev2023

![definyのスクリーンショット](https://repository-images.githubusercontent.com/168463361/72534f00-ec72-11e9-94f3-370ab473bc28)

- [Deno Version](https://definy.deno.dev/)

- [Firebase Version](https://definy.app/?hl=ja)

- [Old Version](https://definy-old.web.app/) WebAssembly を使って数値の足し算,
  引き算, 掛け算ができる

## start server

`/script/startInLocal.ts`

```ts:
import { startDefinyServer } from "../server/main.ts";

startDefinyServer();
```

```sh
deno run --check --watch --unstable-kv --allow-net=:8000 ./script/startInLocal.ts
```

## client build

```sh
deno run --check --allow-env --allow-net --allow-read --allow-write=./dist.json ./script/buildClient.ts
```

## type check

```sh
deno run --allow-run --allow-read ./script/typeCheck.ts
```

## フォルダとファイルの説明

- `.github/workflows/pull_request.yml`: Pull Request
  したときに実行されるテストの処理が書かれている
- `.vscode`: VSCode 向けの設定
- `assets`: スタティックなファイルが置かれている
- `local.sqlite`, `local.sqlite-shm`, `local.sqlite-wal`
  ローカルで開発するときに使うデータベースのファイル
