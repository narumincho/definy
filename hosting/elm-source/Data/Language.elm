module Data.Language exposing (Language(..), languageFromString)


type Language
    = Japanese -- 日本語
    | Esperanto -- エスペラント
    | English -- 英語


languageFromString : String -> Language
languageFromString string =
    case string of
        "ja" ->
            Japanese

        "ja-JP" ->
            Japanese

        "eo" ->
            Esperanto

        _ ->
            English
