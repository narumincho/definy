module Panel.DefaultUi exposing (DefaultUi(..))

{-| キー入力を受け取るデフォルトの要素の種類。キー入力をDefinyで処理しない例外の種類
-}
type DefaultUi
    = TextArea -- 複数行の入力欄(<textarea>)
    | TextField -- 1行の入力欄(<input type="text">)
