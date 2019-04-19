module Project.Source.ModuleWithCache exposing
    ( CompileAndRunResult
    , Emit(..)
    , ModuleWithResult
    , Msg(..)
    , compileAndRunResultGetCompileResult
    , compileAndRunResultGetRunResult
    , getName
    , getPartDef
    , getPartDefAndResult
    , getPartDefAndResultList
    , getPartDefNum
    , getReadMe
    , getTypeDef
    , getTypeDefList
    , getTypeDefNum
    , init
    , update
    )

import Compiler
import Project.Label as L
import Project.Source.Module as Module
import Project.Source.Module.PartDef as PartDef
import Project.Source.Module.PartDef.Expr as Expr
import Project.Source.Module.PartDef.Name as Name
import Project.Source.Module.PartDef.Type as Type
import Project.Source.Module.TypeDef as TypeDef
import Project.Source.ModuleIndex as ModuleIndex


{-| エディタ用のモジュール。各パーツ定義にコンパイル結果を持つ。
-}
type alias ModuleWithResult =
    Module.Module CompileAndRunResult


{-| コンパイル結果と実行結果
-}
type CompileAndRunResult
    = CompileAndRunResult
        { compileResult : Maybe Compiler.CompileResult
        , runResult : Maybe Int
        }


emptyCompileAndRunResult : CompileAndRunResult
emptyCompileAndRunResult =
    CompileAndRunResult
        { compileResult = Nothing
        , runResult = Nothing
        }


type Msg
    = MsgSetReadMe String
    | MsgAddPartDef
    | MsgAddTypeDef
    | MsgSetName ModuleIndex.PartDefIndex Name.Name
    | MsgSetType ModuleIndex.PartDefIndex Type.Type
    | MsgSetExpr ModuleIndex.PartDefIndex Expr.Expr
    | MsgReceiveCompileResult ModuleIndex.PartDefIndex Compiler.CompileResult
    | MsgReceiveRunResult ModuleIndex.PartDefIndex Int


type Emit
    = EmitCompile ModuleIndex.PartDefIndex
    | EmitRun ModuleIndex.PartDefIndex (List Int)
    | ErrorOverPartCountLimit
    | ErrorDuplicatePartDefName ModuleIndex.PartDefIndex


update : Msg -> ModuleWithResult -> ( ModuleWithResult, List Emit )
update msg moduleWithResult =
    case msg of
        MsgSetReadMe readMe ->
            ( moduleWithResult
                |> Module.setReadMe readMe
            , []
            )

        MsgAddPartDef ->
            case moduleWithResult |> Module.addEmptyPartDefAndData emptyCompileAndRunResult of
                Just ( newModule, newIndex ) ->
                    ( newModule
                    , [ EmitCompile newIndex ]
                    )

                Nothing ->
                    ( moduleWithResult
                    , [ ErrorOverPartCountLimit ]
                    )

        MsgAddTypeDef ->
            ( addTypeDef moduleWithResult
            , []
            )

        MsgSetName partDefIndex name ->
            case moduleWithResult |> Module.setPartDefName partDefIndex name of
                Just newModule ->
                    ( newModule
                    , []
                    )

                Nothing ->
                    ( moduleWithResult
                    , [ ErrorDuplicatePartDefName partDefIndex ]
                    )

        MsgSetType partDefIndex type_ ->
            ( moduleWithResult
                |> Module.setPartDefType partDefIndex type_
            , [ EmitCompile partDefIndex ]
            )

        MsgSetExpr partDefIndex expr ->
            ( moduleWithResult
                |> Module.setPartDefExpr partDefIndex expr
            , [ EmitCompile partDefIndex ]
            )

        MsgReceiveCompileResult partDefIndex compileResult ->
            case moduleWithResult |> Module.getData partDefIndex of
                Just (CompileAndRunResult rec) ->
                    ( moduleWithResult
                        |> Module.setData partDefIndex (CompileAndRunResult { rec | compileResult = Just compileResult })
                    , case Compiler.getBinary compileResult of
                        Just binary ->
                            [ EmitRun partDefIndex binary ]

                        Nothing ->
                            []
                    )

                Nothing ->
                    ( moduleWithResult
                    , []
                    )

        MsgReceiveRunResult partDefIndex int ->
            case moduleWithResult |> Module.getData partDefIndex of
                Just (CompileAndRunResult rec) ->
                    ( moduleWithResult
                        |> Module.setData partDefIndex (CompileAndRunResult { rec | runResult = Just int })
                    , []
                    )

                Nothing ->
                    ( moduleWithResult
                    , []
                    )


{-| 結果を持たない、純粋なモジュールから結果を持つモジュールに変換する
-}
init : { name : L.Label, readMe : String, typeDefList : List TypeDef.TypeDef, partDefList : List PartDef.PartDef } -> ( ModuleWithResult, List Emit )
init { name, readMe, typeDefList, partDefList } =
    let
        module_ =
            Module.make
                { name = name
                , readMe = readMe
                , typeDefList = typeDefList
                , partDefAndDataList = partDefList |> List.map (\s -> ( s, emptyCompileAndRunResult ))
                }
    in
    ( module_
    , module_ |> Module.allPartDefIndex |> List.map EmitCompile
    )


{-| Moduleの名前を取得する
-}
getName : ModuleWithResult -> L.Label
getName =
    Module.getName



{- =============================================
                    Read Me
   =============================================
-}


{-| ModuleのReadMeを取得する
-}
getReadMe : ModuleWithResult -> String
getReadMe =
    Module.getReadMe



{- =============================================
                   Type Def
   =============================================
-}


{-| Moduleで定義されているTypeDefのListを取得する
-}
getTypeDefList : ModuleWithResult -> List TypeDef.TypeDef
getTypeDefList =
    Module.getTypeDefList


{-| 指定した位置にあるTypeDefを取得する
-}
getTypeDef : ModuleIndex.TypeDefIndex -> ModuleWithResult -> Maybe TypeDef.TypeDef
getTypeDef =
    Module.getTypeDef


{-| 型定義の個数を取得する
-}
getTypeDefNum : ModuleWithResult -> Int
getTypeDefNum =
    Module.getTypeDefList >> List.length


{-| 型定義を追加。名前はA-Zでないものを使う
-}
addTypeDef : ModuleWithResult -> ModuleWithResult
addTypeDef =
    addTypeDefLoop typeDefDefaultName


addTypeDefLoop : List L.Label -> ModuleWithResult -> ModuleWithResult
addTypeDefLoop labelList moduleWithResult =
    case labelList of
        x :: xs ->
            case moduleWithResult |> Module.addTypeDef x of
                Just newModule ->
                    newModule

                Nothing ->
                    addTypeDefLoop xs moduleWithResult

        [] ->
            moduleWithResult


typeDefDefaultName : List L.Label
typeDefDefaultName =
    [ L.make L.ha []
    , L.make L.hb []
    , L.make L.hc []
    , L.make L.hd []
    ]



{- =============================================
                   Part Def
   =============================================
-}


{-| Moduleで定義されているPartDefとそのコンパイル結果と評価結果のListを取得する
-}
getPartDefAndResultList : ModuleWithResult -> List ( PartDef.PartDef, CompileAndRunResult )
getPartDefAndResultList =
    Module.getPartDefAndDataList


{-| 指定した位置にあるPartDefと結果を取得する
-}
getPartDefAndResult : ModuleIndex.PartDefIndex -> ModuleWithResult -> Maybe ( PartDef.PartDef, CompileAndRunResult )
getPartDefAndResult =
    Module.getPartDefAndData


{-| 指定した位置にあるPartDefを取得する
-}
getPartDef : ModuleIndex.PartDefIndex -> ModuleWithResult -> Maybe PartDef.PartDef
getPartDef index =
    getPartDefAndResult index >> Maybe.map Tuple.first


{-| パーツ定義の個数を取得する
-}
getPartDefNum : ModuleWithResult -> Int
getPartDefNum =
    getPartDefAndResultList >> List.length



{- =============================================
                 CompileAndRunResult
   =============================================
-}


compileAndRunResultGetCompileResult : CompileAndRunResult -> Maybe Compiler.CompileResult
compileAndRunResultGetCompileResult (CompileAndRunResult { compileResult }) =
    compileResult


compileAndRunResultGetRunResult : CompileAndRunResult -> Maybe Int
compileAndRunResultGetRunResult (CompileAndRunResult { runResult }) =
    runResult
