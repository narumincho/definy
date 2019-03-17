# Definy

New Programming Language and Tool for Web. like Elm.

[Demo](https://narumincho.com/definy/20190317/)

# Definy

ゲームとツールを手軽に作れるプログラミング言語とエディタ。[Elm](https://elm-lang.org/)でできているWebアプリ。まだ、ぜんぜんできていない。

[ここ](https://narumincho.com/definy/20190317/)で動作を確認できる

## コンパイル方法

コンパイル結果は`/hosting_root/`に出力済み。だからコンパイルする必要はなけど一応載せておく。コマンドは Windows 10 の Windows PowerShell 向けに書いた。[Elmのコンパイラ](https://guide.elm-lang.jp/install.html)が必要。JavaScriptを更に圧縮したいとかCSSを圧縮したい場合は[Node.js](https://nodejs.org/ja/)も要る。

### Elm(`/src/`) → Javascript(`/hosting_root/main.js`)
```ps1
elm make src/Main.elm --output hosting_root/main.js --optimize
```

### Elm(`/src/`) → 更に圧縮したJavaScript(`/hosting_root/main.js`)
```ps1
elm make src/Main.elm --output main.js --optimize ; uglifyjs main.js -o hosting_root/main.js ; Remove-Item main.js
```
[npm](https://www.npmjs.com/)モジュールの[uglify-js](https://www.npmjs.com/package/uglify-js)を使って更に圧縮している。

### CSS(`/style.css/`) → 圧縮したCSS(`/hosting_root/style.css`)
```ps1
cleancss style.css -o hosting_root/style.css
```
[npm](https://www.npmjs.com/)モジュールの[clean-css-cli](https://www.npmjs.com/package/clean-css-cli)を使用して圧縮している。

## 各ファイルの説明

`/hosting_root/` : このディレクトリ以下のものがサーバーに置いてある

`/hosting_root/index.html` : HTMLファイル。ブラウザはまずこのファイルを読み取って`/hosting_root/main.js`を`/hosting_root/style.css`を読みに行く。Elmのports(Elmの安全な世界から外の危険な世界への橋渡し)であるJavaScriptのコードもここに書いてある。

`/hosting_root/main.js` : JavaScriptファイル。`/src/`にあったElmのコードのコンパイル結果。

`/hosting_root/style.css` : CSSファイル。`/style.css/`を圧縮したもの。

`/src/` : Definyのコード。Elmで書かれている。

`/elm.json` : Elmのソースコードの情報が含まれている。ソースコードのフォルダは`src`だとか、バージョンが`1.0.1`の`elm/svg`を使っているとか。

`/style.css` : 圧縮する前のCSS。Definyエディタの見た目を決めている。