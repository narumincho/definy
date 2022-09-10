ローカル実行

```ps1
deno run --allow-net=:2520 --watch --allow-env --allow-read ./main.ts
```

node.js 向けにビルド
```ps1
deno run --allow-env --allow-read --allow-write --allow-net --allow-run ./buildNpm.ts
```

Windows 向け 単一実行ファイル生成

```ps1
deno compile --allow-net=:2520 --watch --allow-env --allow-read --target x86_64-pc-windows-msvc ./main.ts
```

target に指定できるもの
- x86_64-unknown-linux-gnu
- x86_64-pc-windows-msvc
- x86_64-apple-darwin
- aarch64-apple-darwin
