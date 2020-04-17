# Definy

![Definyのスクリーンショット](https://repository-images.githubusercontent.com/168463361/72534f00-ec72-11e9-94f3-370ab473bc28)

Definy is Web App for Web App.

[Latest Version](https://definy.app/?hl=en)

[Old Version](https://definy-old.web.app/)

ゲームとツールを手軽に作れて公開できるプログラミング言語とエディタ、ゲームエンジン、SNS。[Elm](https://elm-lang.org/)でできている Web アプリ。**まだ、ぜんぜんできていない**

[ここ](https://definy.app/?hl=ja)で動作を確認できる

[古いバージョン](https://definy-old.web.app/)では WebAssembly を使って数値の足し算、引き算、掛け算ができる

- [narumincho/definy-functions](https://github.com/narumincho/definy-functions)  
Cloud Functions for Firestoreでの処理

- [narumincho/definy-common](https://github.com/narumincho/definy-common)  
共通の型と処理

## 特徴

-   インストールの必要なし。web ブラウザで動く
-   web ブラウザで動くので多くの端末で動く
-   エディタが付く
-   言語仕様がシンプル
-   全てが不変データ、動作が予想しやすい
-   実行時エラーがかなり少ない
-   コード整形・圧縮ツールが不要
-   Git より良いもの。意味の通ったバージョン管理システムがつく
-   文法エラー、参照不明のエラーがない
-   一部できていなくても式の評価結果を見れる
-   式の評価過程を手軽に見れる
-   関数の実行結果や例をリアルタイムでグラフや表で表示してくれる
-   独自のリテラルを作れる
-   代数的データ構造で型を定義するのでありえない状態を防げる
-   画像や音声、3D モデルをプリミティブに扱える
-   配列は参照…とかを気にしなくて良い
-   キーコンフィグ機能が自動でつく
-   マクロ、TAS 機能、RTA タイマーが使える
-   評価関数を用意したらゲームの AI(強化学習を使って)が作れる
-   Chrome で、Google 翻訳が使える。海外のゲームを日本語でできる
-   海外の配信者のゲームの日本語版で見れる
-   配信者のゲームの状態を受け取って、そこからゲームを再開できる
-   全てのゲームとツールのコードはプチコン 3 号のようにオープン。画面からのトレースで生成元が分かる

## フォルダとファイルの説明

- /.github: Firebase Hostingへのデプロイの処理が書かれている
- /elm: Elmで書かれた主なコード
- /static: 静的なファイルが置かれている
- /typeScript: TypeScriptで書かれたブラウザのAPIを呼ぶようなコード
- /firebase.json: サーバーでファイルをどのように扱うかの設定が書かれている
- /index.html: Parcelで使うエントリーのファイル(リリース時には使わない)
