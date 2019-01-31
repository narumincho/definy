# モジュールのツリー構造をどう表現してどのように扱っていくか

elm/core
src
    Array.elm
    Basic.elm
    Bitwise.elm
    Char.elm
    Debug.elm
    Dict.elm
    List.elm
    Maybe.elm
    Platform.elm
    Process.elm
    Result.elm
    Set.elm
    String.elm
    Task.elm
    Tuple.elm
README.md
changelog.md
elm.json

elm/parser
example
    DoubleQuoteString.elm
    Math.elm
    README.md
    elm.json
src
    Parser
        Advanced.elm
    Parser.elm
LICENSE
README.md
elm.json

elm/file
examples
    DragAndDrop.elm
    DragAndDropWithImagePreview.elm
    README.md
    SelectFiles.elm
    SelectFilesWidthProgress.elm
    elm.json
src
    File
        Download.elm
        Select.elm
    File.elm
LICENSE
README.md
elm.json


作成者/プロジェクト名
    README(説明,ライセンス)
    例のプログラム、エントリポイント、io設定?
    依存プロジェクト(機械的作成)
    ソース

画面的には
naruminho/Definy
    説明(Noteなど)
    実行構成(エントリポイント, IO設定)
    モジュール(子と依存ライブラリ)

モジュールツリーの構造は?
ツリーのルートも1つのファイルみたいなものだが、ファイルを持てる
単にグループ分けしたいなら、空のファイルにして中に入れる。
上から下に参照する。モジュール間の循環参照は絶対に許さない

Definy
    [private]Project.Source.Module
        [公開] Label
        [公開]Def
            [公開]Expr
                [公開]Operator
                [公開]Term
            [公開]Name
            [公開]Type
        [公開]TypeDef
    [private]Compiler
        [private]BinaryEncoding
        [private]NoOp
        [private]Opt
        [private]SafeExpr
        [private]DefToSafeExpr
        [private]NoOpToOpt
        [private]OptToBinary
        [private]SafeExprToNoOp
        [private]Marger
    [private]Panel
        [公開]Module
        [公開]ModuleGrid
        [公開]ModuleTree
        [公開]Note
    [private]Parser
        [private]Expr
        [private]Name
        [private]Type
        [公開]SimpleChar
    [private]EditorModule
    [private]Key
    [private]ListExtra
    [private]Model
    [private]Suggestion
    [公開]Update
    [公開]View

Panel.Moduleから読めるものは
Main
    Project.Source.Module
        [公開]Def
            [公開]Expr
                [公開]Operator
                [公開]Term
            [公開]Name
            [公開]Type
        [公開]Label
        [公開]TypeDef
    Compiler
    [x]Panel
        [self]Module
        [公開]ModuleGrid
        [公開]ModuleTree
        [公開]Note
    [非公開]Parser
        [公開]SimpleChar
    [非公開]EditorModule
    [非公開]Key
    [非公開]ListExtra
    [非公開]Model
    [非公開]Suggestion
    [非公開]Update
    [非公開]View



Lib
    definy/Core (@2018.12.03)
        [pub]Num
        [pub]Int
        [pub]Float
    leon/JsonParser (@2018.11.02)
/
    Sub
        [pub]K
    Self
        [.]C
            [pub]D
        [.]B
        [.]A

AからB, C.D, Kを読める
module A

import B, /Sub.K, C.D, Lib:definy/Core.Int as Int, Lib:leon/JsonParser

というよりも…

/
    Core from definy/Core (version 2018.12.03)
    JsonParser from leon/JsonParser (version 2018.11.02)
    Sub
        [pub]K
    Sa
    M
        [.]C
            [pub]D
        [.]B
        [.]Sub
            [pub]K
        [.]A

AからB, C.D, Kを読める
module A

import
    ( Core.Int : Int
    , JsonParser
    , Sub.K : Sub.K <-エラーuseのSub.Kとかぶってる
    , Sa : Sa
    , M.B : B
    , M.Sub.K : SubK
    , M.C.D : CD
    )


デフォルトimport
import
    ( Core.Int : Int (Int)
    , Core.Num : Num (min)
    )

elmのデフォルトimport
import
    ( Core.Basics : Basic
        { Int, Float
        , (+), (-), (*), (/), (//), (^)
        , toFloat, round, floor, ceiling, truncate
        , (==), (/=)
        , (<), (>), (<=), (>=), max, min, compare, Order(LT, GT, EQ)
        , Bool(True, False), not, (&&), (||), xor
        , (++)
        , modBy, remainderBy, negate, abs, clamp, sqrt, logBase, e
        , pi, cos, sin, tan, acos, asin, atan, atan2
        , degrees, radians, turns
        , toPolar, fromPolar
        , isNaN, isInfinite
        , identity, always, (<|), (|>), (<<), (>>), Never, never
        }
    , Core.List : List {List, (::)}
    , Core.Maybe : Maybe {Maybe(Just, Nothing)}
    , Core.Result : Result {Result(Ok, Err)}
    , Core.String : String {String}
    , Core.Char : Char {Char}
    , Core.Tuple : Tuple
    , Core.Debug : Debug
    , Core.Platform : Platform {Program}
    , Core.Platform.Cmd : Cmd {Cmd}
    , COre.Platform.Sub : Sub {Sub}
    )

import
    ( /Core.Basics       : @Basic
                                        { Int, Float
                                        , (+), (-), (*), (/), (//), (^)
                                        , toFloat, round, floor, ceiling, truncate
                                        , (==), (/=)
                                        , (<), (>), (<=), (>=), max, min, compare, Order(LT, GT, EQ)
                                        , Bool(True, False), not, (&&), (||), xor
                                        , (++)
                                        , modBy, remainderBy, negate, abs, clamp, sqrt, logBase, e
                                        , pi, cos, sin, tan, acos, asin, atan, atan2
                                        , degrees, radians, turns
                                        , toPolar, fromPolar
                                        , isNaN, isInfinite
                                        , identity, always, (<|), (|>), (<<), (>>), Never, never
                                        }
    , /Core.List         : @List        { List, (::) }
    , /Core.Maybe        : @Maybe       { Maybe(Just, Nothing) }
    , /Core.Result       : @Result      { Result(Ok, Err) }
    , /Core.String       : @String      { String }
    , /Core.Char         : @Char        { Char }
    , /Core.Tuple        : @Tuple
    , /Core.Debug        : @Debug
    , /Core.Platform     : @Platform    { Program }
    , /Core.Platform.Cmd : @Cmd         { Cmd }
    , /Core.Platform.Sub : @Sub         { Sub }
    )



import
    ( /Project.Source.Module.Def     .Expr.Operator : @Op         (OperatorBindingOrder(..), SafeOperator)
    , /Project.Source.Module.Def     .Expr.Term     : @Term       (SafeTerm)
    , /Compiler     .NoOp                   : @NoOp       (NoOp)
    , /Compiler     .SafeExpr               : @SafeExpr   (SafeExpr(SafeExpr))
    )
