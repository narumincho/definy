# Definy

![Definyのスクリーンショット](https://repository-images.githubusercontent.com/168463361/72534f00-ec72-11e9-94f3-370ab473bc28)

Definy is Web App for Web App.

[Latest Version](https://definy.app/?hl=en)

[Old Version](https://definy-old.web.app/)

ゲームとツールを手軽に作れて公開できるプログラミング言語とエディタ,ゲームエンジン,SNS. [Elm](https://elm-lang.org/)でできている Web アプリ.**まだ, ぜんぜんできていない**

[ここ](https://definy.app/?hl=ja)で動作を確認できる

[古いバージョン](https://definy-old.web.app/)では WebAssembly を使って数値の足し算, 引き算, 掛け算ができる

- [narumincho/definy-functions](https://github.com/narumincho/definy-functions)  
  Cloud Functions for Firestore での処理

- [narumincho/definy-common](https://github.com/narumincho/definy-common)  
  共通の型と処理

## 特徴

- インストールの必要なし.web ブラウザで動く
- web ブラウザで動くので多くの端末で動く
- エディタが付く
- 言語仕様がシンプル
- 全てが不変データ, 動作が予想しやすい
- 実行時エラーがかなり少ない
- 言語機能と結びついた構造傘バージョン管理システムがつく
- コードが文字列でないので, 文法エラー, 参照不明のエラーがない
- コード整形・圧縮ツールが不要
- 一部のコードが欠けていても式の評価結果を見れる
- 式の評価過程を手軽に見れる
- 関数の実行結果や例をリアルタイムでグラフや表で表示してくれる
- 独自のリテラルを作れる
- 代数的データ構造でありえない状態を防げる
- 画像や音声, 3D モデルをプリミティブに扱える
- キーコンフィグ機能が自動でつく
- マクロ, TAS 機能, RTA タイマーが使える
- Chrome で, Google 翻訳が使える. 海外のゲームを日本語でできる
- 配信者のゲームの状態を受け取って, そこからゲームを再開できる
- 全てのゲームとツールのコードはプチコン 3 号のようにオープン

## フォルダとファイルの説明

- /.github/workflows/main.yml: Firebase Hosting へのデプロイの処理が書かれている
- /static: スタティックなファイルが置かれている
- /source: TypeScript で書かれたクライアント用のコード
- /firebase.json: サーバーでファイルをどのように扱うかの設定が書かれている
- /index.html: Parcel で使うエントリーのファイル(リリース時には使わない)
