サンプルのサーバーを起動

```ps1
deno run --check --watch --allow-net=0.0.0.0:2520 --allow-write=../client/src/generated --allow-read ./example.ts
```

`--allow-write` `--allow-read` とかで指定しているのは, サーバーでコード生成したときに, ファイルを保存するため. 本番では必要ない

クライアントも含めてビルド
```ps1
deno run -A --check ./build.ts
```
