# definy

いろいろ整理中...

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
deno run -A ./script/startInLocal.ts
```

## client build

```sh
deno run -A ./script/buildClient.ts
```

## フォルダとファイルの説明

- `/.github/workflows/pull_request.yml`: Pull Request したときに実行されるテストの処理が書かれている
- `/.vscode`: VSCode 向けの設定
- `/assets`: スタティックなファイルが置かれている
