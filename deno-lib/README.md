## deno 版 definy.app

開発用 editor サーバーを起動

```ps1
deno run --check --watch --allow-net=:2500 ./definyApp/editorServer/dev.ts
```

開発用 editor クライアントスクリプトビルドを起動

```ps1
deno run --check --watch -A ./definyApp/editor/watchBuild.ts
```

開発用 definy API サーバーを起動

```ps1
deno run --check --watch -A ./definyApp/apiServer/dev.ts
```
