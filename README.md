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

- [narumincho/definy-core](https://github.com/narumincho/definy-core)  
  共通の型と処理

## 特徴

- インストールの必要なく, Web ブラウザで動くため, 開発環境構築に時間がかからない
- Web ブラウザで 動作するので多くの端末, OS で動作する
- Web ブラウザ上のエディタで, プログラムを書く
- 言語仕様がシンプル
- 純粋関数型言語であり, 全てが不変データなため動作が予想しやすい
- エラーは Result 型で表現するため, 実行時エラーがかなり少ない
- 言語機能と結びついた構造化されたバージョン管理システムが付属している
- コードが文字列でなく, AST のような構造化されたデータをコードとして編集するので, 文法エラー, 参照不明のエラーがない
- コード整形ツールが不要
- 式の評価過程をエディタ上で確認できる
- 独自のリテラルを作れる
- 画像や音声, 3D モデルをプリミティブに扱える
- キーコンフィグ機能が自動でつく
- マクロ, TAS 機能, RTA タイマーが使える
- Chrome で, Google 翻訳が使える. 海外のゲームを日本語でできる
- 配信者のゲームの状態を受け取って, そこからゲームを再開できる
- 全てのゲームとツールのコードはプチコン 3 号のようにオープン

## フォルダとファイルの説明

- `/__snapshot__/` jest の テストの実行結果で変化がないか調べる スナップショットが保存されている
- `/.github/workflows/main.yml`: Firebase Hosting へのデプロイの処理が書かれている
- `/static`: スタティックなファイルが置かれている
- `/source`: TypeScript で書かれたクライアント用のコード
- `/firebase.json`: サーバーでファイルをどのように扱うかの設定が書かれている
- `/index.html`: Parcel で使うエントリーのファイル(リリース時には使わない)
- `/test.ts`: テストのコードが含まれている
