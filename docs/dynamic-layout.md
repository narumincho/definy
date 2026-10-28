テキストのプログラミング言語のように少ない領域で表現したいが,
GUIプログラミングの範囲が分かりやすい利点も活かしたい

以下は擬似的なテキストでの表現になるが, 実際にはWebのDOMとスタイルで表現される

```
zero: number = 0
```

このように量が少ないものは横に並べて表現できるが

```
VerifyAndDeserializeError: Type = oneOf { DecodeError /* デコードに失敗 */, VerifyError /* 署名検証に失敗 */ }
```

このように量が多いものは縦に並べて表現する必要がある

```
VerifyAndDeserializeError: Type
= oneOf {
  DecodeError /* デコードに失敗 */,
  VerifyError /* 署名検証に失敗 */
}
```

画面の幅は,
ウィンドウのリサイズなどいつでも自由に変えられるためその都度レイアウトの計算が必要になる

まずは1行でレンダリングしたと想定して,
溢れるようなら縦方向に並べるというアルゴリズムになるだろう

難しいのは
スプレッドシートのように2重配列の場合に縦で揃えるように最適化したいことである

```
data = [
   { a:                  123, b: "文字列は左揃え", c: 0.333333}
   { a: sampleNumberVariable, b: "text".       , c: div(1,3)}
]
```

これも実現してスプレッドシートのように編集できるのが理想

## ツリーエディタの操作 UI

- ノードを選択すると,
  式・パーツを切り替えるドロップダウンメニューが**選択したノードの直下**に表示される
  (エディタ上部のツールバーには表示しない).
  - 選択中のノードだけに CSS `anchor-name`
    (`--expression-selection-{useId}`, エディタごとに一意) を付け
    (`TreeLayoutRenderer` の `selectionAnchorName`), メニューは
    `popover="manual"` の要素として ref コールバックで `showPopover()` し,
    `position-anchor` でそのノードを参照する. top layer に出すので
    エディタの `overflow` で切り取られない.
    - 複数行カプセルは子を含む全体ではなく見出しのバッジに anchor を付け,
      メニューがバッジのすぐ下に出るようにする. 見出しのバッジの無いカプセル (関数呼び出しなど) は見出しの行に付ける.
    - 配置は `.expression-node-dropdown` の
      `position-area: block-end span-inline-end` (ノードの左端揃えで下に出す).
  - ブラウザの popover 既定スタイル (User Agent stylesheet の `inset: 0`)
    がアンカー計算と干渉して画面最上部に飛ぶ問題を防ぐため,
    `[popover]` に `inset: auto; position: absolute;` を指定する.
  - 画面の下端・右端に収まらないときのために
    `position-try-fallbacks: flip-block, flip-inline, flip-block flip-inline;`
    を指定し, 上や左に反転させる.
  - Anchor Positioning / Popover 未対応ブラウザでは (`CSS.supports` で判定),
    popover にせず式全体の下に通常のフローでメニューを表示する.
  - ドロップダウンパネル本体 (`.dropdown-popover-panel`), オプションリスト (`overflow-x: hidden`),
    ヘッダーおよびオプションの補足 (型など) にも省略表示 (`ellipsis`)
    や最大幅制限を設け, 長い識別子や型名による右はみ出しを確実に防止する.
  - 数値・文字列リテラル選択時はノード上で直接編集するため,
    メニューの検索欄にはフォーカスを移さない (検索 `<input>` には `autofocus`
    を付けず, リテラル以外の選択時のみ JS から明示的に `.focus()` する).
  - 選択肢は期待型に合うものを先に並べ, 合わないもの
    (`isTypeMismatch`, `src/tree_layout/selector_options.ts`) は
    「その他 (型が合わない)」の区切りの下に薄く表示する
    (`src/tree_layout/ExpressionPopoverMenu.tsx`).
    期待型が無い位置では区切りを出さない.
  - 期待型は definy 製の型チェッカーに聞く (`findExpectedType`, `src/state/useTypeCheck.ts`).
    選んだ位置を `{"Hole": {"probe": true}}` (`EXPECTED_TYPE_PROBE`, `src/tree_layout/type_inference.ts`) に
    置き換えた式を (式は `core.expression` の値のままなので変換せずに)
    `core.type-check-against` で検査する. 型チェッカーは probe の位置で `hole_expected_type { expected }`
    のエラーを返し (期待する型のある位置なら `some(型)`, 推論する位置なら `none`),
    他の未入力 (`hole({ probe: false })`) はその位置の期待する型として受け入れる.
    以前は TypeScript の独自推論 (`inferExpectedType`) で数値・文字列・真偽値・リストだけを見分けていた.
    未入力はコンパイルできないので, コミットの検査や評価では今までどおり未入力を受け付けない
    (`compile()` は未入力を含む式で `SelfHostedAstConversionError` を投げ, 型検査は `allowHoles` のときだけ未入力を渡す)
  - 関数の引数名 (`parameterName` のノード, パスの最後が `functionParameter`) は式ではないので置換メニューを開かず,
    選ぶと文字列リテラルと同じ入力欄でその場で名前を変える (`renameFunctionParameter`).
    本体の変数は ID で引数を参照しているので名前だけを変えればよく, 表示はスコープどおりに新しい名前になる.
    式の根の関数の引数名を変えたときは, パーツの型の同じ位置の引数名も合わせて変える
    (`syncPartTypeParameterNames`, `src/tree_layout/part_type.ts`). 呼び出し側はパーツの型の引数名で引数を渡すため.
    呼び出し側の引数名も合わせて変える ([ui.md](ui.md) の「式エディタの操作」)
  - match のアームは, パターンのノード (`タグ =>`, パスの最後が `matchArmPattern`) の下に
    束縛する変数の名前 (`parameterName`, パスの最後が `matchArmVariable`) と本体を並べる (`src/tree_layout/match_pattern.ts`).
    束縛する変数の名前は関数の引数名と同じくその場で変える (`renameMatchArmVariable`).
    パターンを選ぶと, 置換メニューに match の対象の型のタグと, 束縛する / しない・アームを足す・足りないアームをまとめて足す・
    アームを消す操作を出す. 対象の型は, 対象 `t` を `[t, probe]` のリストにした式を型チェッカーに渡して聞く
    (リストは最初の要素の型を推論し, 残りの要素ではその型を期待するため. `probeMatchTargetType`).
    返った型が Bool なら `true` / `false`, 直和型ならそのタグ, 型パーツの参照なら型パーツの型宣言 (`TypeUnion`) のタグにする.
    型パーツは `partsByIdHash` (パーツ ID → パーツ) で引く. `parts` はモジュール名ごとに最新の 1 つだけなので,
    別アカウントの同名モジュールがあると参照先の型パーツが見つからないため.
    型パーツを指定した Variant (`type_part_definition_event_hash`) は, 型チェッカーがその型パーツの型と推論するので
    (`core.expression` の `variant` の `type_part`), 対象が `some(100)` のようなリテラルでも型パーツの全てのタグが出る.
    型パーツを指定しない Variant は, そのタグだけの直和型と推論する
    値を持つタグに変えると新しい変数に束縛し, 値を持たないタグに変えると束縛をやめる.
    束縛をやめた変数を本体で使っていれば, 型チェッカーがそこを型エラーにする
  - `_ =>` (default) のアームも他のアームと同じくパターンのノード (パスの最後が `matchArmPattern`) の下に本体を置く.
    メニューの `add-default` で足し, `delete-arm` で消す (最後のアームは消せない). `_ =>` のメニューからも足りないアームをまとめて足せる.
    `_` は `bind` で値全体を変数に束縛できる. パターンの木と編集の詳細は [match-pattern.md](match-pattern.md)
  - 置換メニューの `match` は対象を未入力にし, アームを `_ =>` だけにした match を作る
    (対象を決めてから `_ =>` のメニューで足りないアームを足し, 要らなければ `_ =>` を消す).
    Bool の `true` / `false` のアームで作るときは `match-bool`
  - ローカルの E2E で seed を変えたのに古いパーツが表示されるときは, `.void/v3/d1` (ローカルの D1) を消してから
    やり直すと確実 (dev サーバーは seed の指紋 `seeds/seed_bundle_fingerprint.json` が変わると D1 に入れ直す)
  - パーツの選択肢には型 (`function → number` など) を表示する. `core.plus` などの組み込みのパーツも型を持つが,
    どの型の値にも使える `core.equal` や `core.list-get` などは型を持たないので表示しない ([builtin-parts.md](builtin-parts.md)).
  - メニューを開いたときは, 現在の値の選択肢 (`data-current="true"`)
    がリスト中央付近に来るようにリストをスクロールする (`ExpressionPopoverMenu` の `useEffect`).
    キー操作でハイライトを動かしたときは `scrollIntoView({ block: "nearest" })` で追従する.
  - 選択中の式だけを未入力にできる. 式は `{ Hole: {} }` (`□` と表示) になる
    (`clearExpressionAtPath`, `src/tree_layout/path.ts`).
    - 検索欄が空のときの Delete / Backspace キー (Mac の delete キーは Backspace),
      数値・文字列リテラルの入力欄が空のときの Delete / Backspace キー,
      メニュー見出しの ⌫ ボタンのいずれかで行う. 文字が残っている間は通常どおり文字を消す.
    - 未入力にした後は検索欄にフォーカスし, すぐ別の式を選べるようにする.
    - 未入力はコミットの検査や評価で受け付けない (上の「期待型」の項目を参照).
- ノードの枠は常に丸くする. 1 行に収まるバッジ・インラインカプセルは
  `--radius-full` (ピル型), 高さのある複数行カプセル・テーブルは `--radius-lg`
  を使う.
- **ダークテーマの統一と Popover / ネイティブ要素対策**:
  - ブラウザの User Agent Stylesheet は `:root` や `<meta name="color-scheme">`
    で `color-scheme: dark;` を宣言しないと `Canvas` (`#ffffff`) や
    `CanvasText` をライトモード基準で計算するため, `[popover]` や `<dialog>`,
    `<select>`, `<option>`, オートフィルが白背景になって文字が読めなくなる.
  - `:root` と `html`, `body`, `<meta>` に `color-scheme: dark;` を明示し,
    `[popover]` および `:popover-open`, `.dropdown-popover-panel` に
    `background-color: var(--surface-opaque); color: var(--text);` を指定して
    Top Layer で確実に不透明ダーク背景を保つ.
  - ポップオーバーの装飾スタイルはインラインではなく CSS クラス (`.dropdown-popover-panel`) で管理する.

## 関数呼び出しの名前付きパラメーター表示

関数呼び出しの各引数は `パラメーター名: 値` の形で表示する.

```
f width: 1 height: 2
```

関数呼び出しには `call` のような見出しのバッジを出さない (LayoutNode の `label` が空).
以前は `call` を出していたが, 演算子を `core.plus` などのパーツの呼び出しにした (#725) ことで
`call core.plus left: 1 right: 2` のように `call` だらけになったので消した.
呼び出す関数と引数名の並びで呼び出しだと分かる.

- `label` が空のノードは `TreeLayoutRenderer` がバッジを描かない.
  呼び出しそのもの (結果の型のホバー・置換メニュー) はカプセルの枠 (左端の余白など) か, 呼び出す関数の名前をクリック・ホバーして選ぶ
  (呼び出す関数は式ではなく呼び出しの一部で, 名前のノードは呼び出しと同じパス. [call-syntax.md](call-syntax.md))
- 複数行になったときは, 見出しの行 (折りたたみボタンの横) に最初の子 (呼び出す関数) を出し,
  引数だけを字下げして並べる. 置換メニューは見出しの行の下に出す
- 複数行のカプセルを折りたたんだときは見出しの行だけを出す (以前の `... (N args)` は出さない)
- E2E で呼び出しを選ぶときは, 呼び出す関数のノード (ID が `.fn` で終わる) を含むカプセルを探す (`e2e/ui.test.ts` の `callCapsule`)

パラメーター名は呼び出しの引数に保存された名前 (`Call.arguments[].name`) をそのまま出し,
空なら `arg0:` のように位置で出す (`src/tree_layout/ast_to_layout/functions.ts`).
呼び出し先の型からパラメーター名を引き直すことはしない. 名前が呼び出し先の引数名と合わなければ型チェッカーが型エラーにする.

## let の束縛の表示

`let` は見出し (`let`) の下に束縛を `名前 = 値` の形で並べ, 最後に本体を置く.

```
let
  base = 10
  height = 5
  core.divide left: ... right: 2
```

- 束縛には見出しのバッジを出さず (`label` が空), 名前・`=` (`delimiter` のノード)・値の順に並べる.
  以前は `=` を見出しのバッジにしていたので `= base 10` と表示されていた
- 以前は束縛をまとめた `list` という見出しのカプセルがあったが, 内部の構造が見えているだけなのでなくした
- 束縛の名前・`=`・値はどれも束縛の値の位置 (`letBindingValue`) を指すので, どれをクリックしても値を選ぶ

## 変数とパーツ参照の名前表示

式の AST は変数を ID (`Variable.variable_id`), パーツ参照をパーツ定義イベントのハッシュで持つが,
ツリーでは名前で表示する.

- 変数は, その位置から見える束縛の名前を出す. 束縛は関数のパラメーター, `let` の束縛
  (前から順に見え, 後の束縛の値と本体から参照できる), 値を束縛する `match` のアームの 3 つ.
  内側の束縛は同じ ID の外側の束縛を隠す. seed にも別のスコープで同じ ID を使うパーツがある
  (`core.eval-value` など) ので, 式全体から ID → 名前を集めるのではなくスコープを辿る
- 値を束縛する `match` のアームは `some(value) =>` のようにタグの後ろに変数名を出す
- 名前が空 (追加直後の let 束縛など) かスコープ外の変数は `var_{id}` と表示する
- パーツ参照はパーツ名を出す. 名前はイベントから集めたパーツ ID → 名前の表 (`partNames`, `src/state/useEvents.ts`) から引き,
  `expressionToLayoutNode` の `partNames` で渡す.
  見つからないときは `@part:` とハッシュの先頭 6 文字を出す
- ホバーで出す型 (`formatTypeAst`) も, 型パーツの参照を `partNames` でパーツ名にして書く
- **パーツ参照の実データと UI 選択肢・永続化の整合性**:
  - 式のパーツ参照の実データは `{"#part_reference": {"part_definition_event_hash": "<パーツ ID (URL-safe Base64)>"}}` で,
    CBOR でも文字列 ([value-encoding.md](value-encoding.md)). 以前は 32 バイトの `Uint8Array` (CBOR のバイト列) だった.
  - ツリーエディタの選択肢 (`SelectorOption.value`) は `ref:part:<partIdHash (URL-safe Base64)>` をキーとし,
    `partIdHash` がないパーツは候補から除外する. 適用時 (`applySelection`) も判定時 (`getOptionValueForExpression`) も
    パーツ ID の文字列をそのまま使う.
  - 作業中の変更 (`WorkingChanges`) は `serializeWorkingChanges` / `deserializeWorkingChanges` で `localStorage` に JSON のまま保存する
    (保存キーは `definy.working_changes.v4`). 以前はパーツ ID が `Uint8Array` だったので `{"$bytes": "<Base64URL>"}` にしていたが,
    式に `Uint8Array` が出てこなくなったのでやめた.
