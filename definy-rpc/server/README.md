サンプルのサーバーを起動

```ps1
deno run --check --watch --allow-net=0.0.0.0:2520 --allow-write=../client/src/generated --allow-read=../ ./example.ts
```

クライアントも含めてビルド
```ps1
deno run -A --check ./build.ts
```
