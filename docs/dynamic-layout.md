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
  - 各ノードに一意の CSS `anchor-name` (`--tree-node-{エディタ連番}-{ノードID}`)
    を常時付与し, `SearchableDropdownPanel` (popover) も DOM
    上に常時配置した上で, クリックイベント内で同期的に `position-anchor`
    を対象ノードに切り替えて `showPopover()` (`show_anchored_popover`)
    を呼び出す.
  - ブラウザの popover 既定スタイル (User Agent stylesheet の `inset: 0`)
    がアンカー計算と干渉して画面最上部に飛ぶ問題を防ぐため,
    `[popover]` に `inset: auto; position: absolute;` を指定する.
  - アンカー要素が画面右寄りにあったり画面右端に近い場合,
    `span-right` だとドロップダウンが画面右外に飛び出してしまうため,
    `dom_show_popover_and_focus` でアンカー要素の画面内座標 (`getBoundingClientRect`)
    を動的に判定し, 右余白が不足している場合は `bottom span-left`
    (右端揃えで左に展開) または `top span-left` に自動切り替えを行う.
  - CSS Anchor Positioning の反転フォールバックには
    `position-try-fallbacks: flip-inline, flip-block, flip-block flip-inline;`
    を指定し, 水平反転 (`flip-inline`) を優先するとともに対角線反転
    (`flip-block flip-inline`) も含めることで画面端での飛び出しを防止する.
  - Anchor Positioning 未対応ブラウザ (古い Safari 等) に対しては,
    `CSS.supports` で `position-area` の対応を確認し,
    未対応時に `fixed` 座標で安全にフォールバック配置する.
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

