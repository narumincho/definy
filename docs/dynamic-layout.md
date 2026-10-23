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
  式・演算子を切り替えるドロップダウンメニューが**選択したノードの直下**に表示される
  (エディタ上部のツールバーには表示しない).
  - 選択中のノードだけに CSS `anchor-name`
    (`--expression-selection-{useId}`, エディタごとに一意) を付け
    (`TreeLayoutRenderer` の `selectionAnchorName`), メニューは
    `popover="manual"` の要素として ref コールバックで `showPopover()` し,
    `position-anchor` でそのノードを参照する. top layer に出すので
    エディタの `overflow` で切り取られない.
    - 複数行カプセルは子を含む全体ではなく見出しのバッジに anchor を付け,
      メニューがバッジのすぐ下に出るようにする.
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
    ヘッダーおよびオプションのメタデータ (`display_meta`) にも省略表示 (`ellipsis`)
    や最大幅制限を設け, 長い識別子や型名による右はみ出しを確実に防止する.
  - 数値・文字列リテラル選択時はノード上で直接編集するため,
    メニューの検索欄にはフォーカスを移さない (検索 `<input>` には `autofocus`
    を付けず, リテラル以外の選択時のみ JS から明示的に `.focus()` する).
  - 選択肢は期待型に合うものを先に並べ, 合わないもの
    (`RankedSelectorOption::is_type_mismatch`) は
    「その他 (型が合わない)」の区切りの下に薄く表示する
    (`SearchableDropdownPanel` の `secondary_values` / `secondary_heading`).
    期待型が無い位置では区切りを出さない.
  - 期待型は definy 製の型チェッカーに聞く (`findExpectedType`, `src/state/useTypeCheck.ts`).
    選んだ位置を `{"Hole": {"probe": true}}` (`EXPECTED_TYPE_PROBE`, `src/tree_layout/type_inference.ts`) に
    置き換えた式を, `definyAstWithHolesToSelfHostedAst` で `core.expression` の `hole` にして
    `core.type-check-against` で検査する. 型チェッカーは probe の位置で `hole_expected_type { expected }`
    のエラーを返し (期待する型のある位置なら `some(型)`, 推論する位置なら `none`),
    他の未入力 (`hole({ probe: false })`) はその位置の期待する型として受け入れる.
    以前は TypeScript の独自推論 (`inferExpectedType`) で数値・文字列・真偽値・リストだけを見分けていた.
    未入力はコンパイルできないので, コミットの検査や評価では今までどおり未入力を受け付けない
    (`definyAstToSelfHostedAst` は未入力で `SelfHostedAstConversionError` を投げる)
  - 関数の引数名 (`parameterName` のノード, パスの最後が `functionParameter`) は式ではないので置換メニューを開かず,
    選ぶと文字列リテラルと同じ入力欄でその場で名前を変える (`renameFunctionParameter`).
    本体の変数は ID で引数を参照しているので名前だけを変えればよく, 表示はスコープどおりに新しい名前になる.
    式の根の関数の引数名を変えたときは, パーツの型の同じ位置の引数名も合わせて変える
    (`syncPartTypeParameterNames`, `src/tree_layout/part_type.ts`). 呼び出し側はパーツの型の引数名で引数を渡すため.
    他のパーツの呼び出し側の引数名は変えないので, 型チェッカーがそこを型エラーにする
  - match のアームは, パターンのノード (`タグ =>`, パスの最後が `matchArmPattern`) の下に
    束縛する変数の名前 (`parameterName`, パスの最後が `matchArmVariable`) と本体を並べる (`src/tree_layout/match_pattern.ts`).
    束縛する変数の名前は関数の引数名と同じくその場で変える (`renameMatchArmVariable`).
    パターンを選ぶと, 置換メニューに match の対象の型のタグと, 束縛する / しない・アームを足す・足りないアームをまとめて足す・
    アームを消す操作を出す. 対象の型は, 対象 `t` を `[t, probe]` のリストにした式を型チェッカーに渡して聞く
    (リストは最初の要素の型を推論し, 残りの要素ではその型を期待するため. `probeMatchTargetType`).
    返った型が Bool なら `true` / `false`, 直和型ならそのタグ, 型パーツの参照なら型パーツの型宣言 (`TypeUnion`) のタグにする.
    値を持つタグに変えると新しい変数に束縛し, 値を持たないタグに変えると束縛をやめる.
    束縛をやめた変数を本体で使っていれば, 型チェッカーがそこを型エラーにする
  - 型宣言のない組み込みパーツ (`plus` など) は,
    選択肢のメタ情報に推定した型を型宣言と同じ小文字表記で表示する.
  - メニューを開いたときは, 現在の値の選択肢 (`data-selected="true"`)
    がリスト中央付近に来るようにリスト (`.dropdown-option-list`) をスクロールする.
    クリックイベント内では新しい選択肢がまだ描画されていないため,
    `requestAnimationFrame` を 2 回挟んで Dioxus の再描画後に行う.
  - 選択中の式だけを未入力にできる. 子の式は `Expression::Hole` (`□` と表示)
    に, ルートの式は式なし (`None`) になる (`clear_expression_at_path`).
    - 検索欄が空のときの Delete / Backspace キー (Mac の delete キーは Backspace),
      数値・文字列リテラルの入力欄が空のときの Delete / Backspace キー,
      メニュー見出しの ⌫ ボタンのいずれかで行う. 文字が残っている間は通常どおり文字を消す.
    - 未入力にした後は検索欄にフォーカスし, すぐ別の式を選べるようにする.
    - `Hole` は型検査で `Unfilled expression.` の診断を出し,
      Wasm へのコンパイル (評価) はエラーになる.
  - Dioxus 0.7 ではコンポーネント描画中に無条件で子コンポーネントが購読する
    `Signal::set` を呼ぶと, 常に dirty scope が残って `use_effect`
    等が実行されなくなるため, `diagnostics` / `expected_types` の `Signal`
    更新は値が変わったとき (`*sig.peek() != new_val`) のみ行う.
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
  - Dioxus の DOM パッチ適用処理 (`setAttributeInner`) では,
    直接操作されたインラインスタイルとショートハンド (`background`, `border`)
    の競合により再レンダリング時にスタイルが脱落する場合があるため,
    装飾スタイルはインラインではなく CSS クラス (`.dropdown-popover-panel`)
    で確実に管理する.

## 関数呼び出しの名前付きパラメーター表示

関数呼び出し (`call`) の各引数は `パラメーター名: 値` の形で表示する.

```
call f width: 1 height: 2
```

パラメーター名は型解析 (`TypeAnalysis::call_parameter_names`) で呼び出し先関数の型から引く.
型チェックと同じく, 引数に保存された名前 (`CallArgument::name`) と一致するパラメーターを優先し,
無ければ同じ位置のパラメーターの名前を使う.
呼び出し先の型が分からないときや, 型解析をしないプレビュー (`ExpressionTreeSummary`) では
引数に保存された名前をそのまま表示する.

## 変数とパーツ参照の名前表示

式の AST は変数を ID (`VariableExpression::variable_id`), パーツ参照をパーツ定義イベントのハッシュで持つが,
ツリーでは名前で表示する.

- 変数は, その位置から見える束縛の名前を出す. 束縛は関数のパラメーター, `let` の束縛
  (前から順に見え, 後の束縛の値と本体から参照できる), 値を束縛する `match` のアームの 3 つ.
  内側の束縛は同じ ID の外側の束縛を隠す. seed にも別のスコープで同じ ID を使うパーツがある
  (`core.eval-value` など) ので, 式全体から ID → 名前を集めるのではなくスコープを辿る
- 値を束縛する `match` のアームは `some(value) =>` のようにタグの後ろに変数名を出す
- 名前が空 (追加直後の let 束縛など) かスコープ外の変数は `var_{id}` と表示する
- パーツ参照はパーツ名を出す. 名前はイベントキャッシュのパーツから引く
  (`part_projection::part_names`. ツリーエディタは `TypeAnalysis::part_names`,
  一覧のプレビュー `ExpressionTreeSummary` は `part_names` プロパティで受け取る).
  見つからないときは `@part:` とハッシュの先頭 6 文字を出す
- パーツの型の文字列 (エクスプローラー, パーツ一覧, コマンドパレット, モジュール詳細) も,
  型パーツの参照を `type-part(ハッシュ)` ではなくパーツ名で書く
  (`PartType::to_string_with_type_part_names`, UI では `part_projection::part_type_text`)
- **パーツ参照の実データと UI 選択肢・永続化の整合性**:
  - 式の AST におけるパーツ参照の実データは `{ PartReference: { part_definition_event_hash: <32 バイトの Uint8Array> } }` であり,
    CBOR のバイト列 (major type 2) にエンコードされる. パーツ名文字列や数値配列を直接格納してはならない.
  - ツリーエディタの選択肢 (`SelectorOption.value`) は `ref:part:<partIdHash (URL-safe Base64)>` をキーとし,
    `partIdHash` がないパーツは候補から除外する. 適用時 (`applySelection`) に `base64ToBytes` で `Uint8Array` に戻し,
    選択値の判定時 (`getOptionValueForExpression`) は `toUint8Array` → `bytesToUrlSafeBase64NoPad` で Base64URL を生成して照合する.
  - 作業中の変更 (`WorkingChanges`) を `localStorage` に保存する際, 素朴な `JSON.stringify` では `Uint8Array` が
    `{"0": 12, ...}` のオブジェクトに分解され CBOR の map として壊れてしまう. そのため `serializeWorkingChanges` /
    `deserializeWorkingChanges` を通し, 任意の深さの `Uint8Array` を `{"$bytes": "<Base64URL>"}` 形式で安全にシリアライズ・復元する
    (保存キーは `definy.working_changes.v3`).
