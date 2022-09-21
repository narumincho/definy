サンプルのサーバーを起動

```ps1
deno run --check --watch --allow-net ./example.ts
```

クライアントも含めてビルド
```ps1
deno run -A --check ./build.ts
```
