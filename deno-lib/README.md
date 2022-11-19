# Deno の TypeScript で書かれた definy

全体の型チェックと, deno.lock の生成 (CI環境ではチェック)
```ps1
deno run --allow-run --allow-read ./entryPoints/check.ts
```

## deno 版 definy.app

開発用 editor サーバーを起動

```ps1
deno run --watch --allow-net=:2500,deno.land ./entryPoints/definyAppEditorServerDev.ts
```

開発用 editor browser client の watch ビルド

```ps1
deno run --watch -A ./entryPoints/definyAppEditorWatchBuild.ts
```

editor サーバーを起動

```ps1
deno run --watch --allow-net=:2500,deno.land https://raw.githubusercontent.com/narumincho/definy/main/deno-lib/definyApp/editorServer/dev.ts
```

deno.land への接続はおそらく imagescript が wasm のダウンロードに使うため必要

開発用 editor クライアントスクリプトビルドを起動

```ps1
deno run --check --watch -A ./definyApp/editor/watchBuild.ts
```

definy API サーバーを起動

`./apiServer.ts`
```ts
import { main } from "../definyApp/apiServer/mod.ts";

main({ isDev: false, faunaSecret: "..." });
```

```ps1
deno run --allow-net ./apiServer.ts
```

## definy RPC サンプルサーバーの起動

```ps1
deno run --check --watch --allow-net=:2520 --allow-write --allow-read ./entryPoints/definyRpcServerDev.ts
```

definy RPC クライアントビルド

```ps1
deno run --check --watch -A ./entryPoints/definyRpcBuild.ts
```
