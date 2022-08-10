# local-server

local-server は, ファイルシステムなどのWebブラウザから呼べないAPIをdefinyから呼び出すためのデスクトップアプリ.

実行形式ファイルを生成できる deno を使ってみている. Node.js をインストールしなくてよくするため.

他の TypeScript のコードでは, Node.js を使用しているため. VSCodeで開くと Deno と競合してしまうため この local-server を開発するときには, local-server をルートとして VSCode を開く必要がある 

```ps1
code ./local-server
```

```ps1
deno run --allow-net --allow-run main.ts
```
で実行


```
deno compile --allow-net --allow-run main.ts
```
で 実行ファイルを生成
