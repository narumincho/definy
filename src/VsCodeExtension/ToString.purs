module VsCodeExtension.ToString
  ( NoPositionTree(..)
  , escapeName
  , evaluatedTreeToNoPositionTree
  , evaluatedTreeToString
  , isSafeName
  , noPositionTreeEmptyChildren
  , noPositionTreeRootToString
  , noPositionTreeToString
  , quoteString
  ) where

import Data.Array as Array
import Data.Either as Either
import Data.Maybe (Maybe(..))
import Data.Ord as Ord
import Data.String as String
import Data.String.NonEmpty (NonEmptyString)
import Data.String.NonEmpty as NonEmptyString
import Data.String.Regex as Regex
import Data.String.Regex.Flags as RegexFlags
import Data.UInt as UInt
import Prelude as Prelude
import Type.Proxy (Proxy(..))
import Util as Util
import VsCodeExtension.BuiltIn as BuiltIn
import VsCodeExtension.Evaluate as Evaluate

-- | 位置情報が含まれていないシンプルな木構造
newtype NoPositionTree
  = NoPositionTree
  { name :: String, children :: Array NoPositionTree }

noPositionTreeEmptyChildren :: String -> NoPositionTree
noPositionTreeEmptyChildren name = NoPositionTree { name, children: [] }

-- | コードのツリー構造を整形された文字列に変換する
evaluatedTreeToString :: Evaluate.EvaluatedTree -> String
evaluatedTreeToString codeTree =
  noPositionTreeRootToString
    (evaluatedTreeToNoPositionTree codeTree)

evaluatedTreeToNoPositionTree :: Evaluate.EvaluatedTree -> NoPositionTree
evaluatedTreeToNoPositionTree (Evaluate.EvaluatedTree { name, children, expectedInputType }) =
  NoPositionTree
    { name
    , children:
        Prelude.append (Prelude.map (\(Evaluate.EvaluatedTreeChild { child }) -> evaluatedTreeToNoPositionTree child) children)
          ( case expectedInputType of
              BuiltIn.InputTypeNormal expectedChildrenType ->
                Prelude.map
                  typeDefaultValue
                  ( Array.drop
                      (Array.length children)
                      expectedChildrenType
                  )
              BuiltIn.InputTypeRepeat _ -> []
          )
    }

typeDefaultValue :: BuiltIn.BuiltInType -> NoPositionTree
typeDefaultValue = case _ of
  BuiltIn.Module -> builtInToDefaultNoPositionTree BuiltIn.moduleBuiltIn
  BuiltIn.Description ->
    NoPositionTree
      { name: "description", children: [] }
  BuiltIn.ModuleBody -> builtInToDefaultNoPositionTree BuiltIn.bodyBuiltIn
  BuiltIn.PartDefinition -> builtInToDefaultNoPositionTree BuiltIn.partBuiltIn
  BuiltIn.Expr BuiltIn.UInt -> builtInToDefaultNoPositionTree BuiltIn.uintBuiltIn
  BuiltIn.Expr BuiltIn.Float64 -> builtInToDefaultNoPositionTree BuiltIn.float64BuiltIn
  BuiltIn.Expr BuiltIn.Text -> builtInToDefaultNoPositionTree BuiltIn.textBuiltIn
  BuiltIn.Expr BuiltIn.NonEmptyText -> builtInToDefaultNoPositionTree BuiltIn.nonEmptyTextBuiltIn
  BuiltIn.Expr BuiltIn.TypePart -> builtInToDefaultNoPositionTree BuiltIn.typeBuiltIn
  BuiltIn.Expr BuiltIn.TypeBody -> builtInToDefaultNoPositionTree BuiltIn.uintBuiltIn
  BuiltIn.Expr BuiltIn.Pattern -> builtInToDefaultNoPositionTree BuiltIn.patternBuiltIn
  BuiltIn.Expr BuiltIn.Unknown -> builtInToDefaultNoPositionTree BuiltIn.uintBuiltIn
  BuiltIn.UIntLiteral ->
    NoPositionTree
      { name: "28", children: [] }
  BuiltIn.TextLiteral ->
    NoPositionTree
      { name: "sample text", children: [] }
  BuiltIn.NonEmptyTextLiteral ->
    NoPositionTree
      { name: "sample text", children: [] }
  BuiltIn.Float64Literal ->
    NoPositionTree
      { name: "6.28", children: [] }
  BuiltIn.Identifier ->
    NoPositionTree
      { name: "sample", children: [] }

builtInToDefaultNoPositionTree :: BuiltIn.BuiltIn -> NoPositionTree
builtInToDefaultNoPositionTree builtIn =
  NoPositionTree
    { name: NonEmptyString.toString (BuiltIn.builtInGetName builtIn)
    , children:
        inputTypeToDefaultValue (BuiltIn.buildInGetInputType builtIn)
    }

inputTypeToDefaultValue :: BuiltIn.InputType -> Array NoPositionTree
inputTypeToDefaultValue = case _ of
  BuiltIn.InputTypeNormal typeList -> Prelude.map typeDefaultValue typeList
  BuiltIn.InputTypeRepeat builtInType ->
    [ typeDefaultValue builtInType
    , typeDefaultValue builtInType
    , typeDefaultValue builtInType
    ]

noPositionTreeRootToString :: NoPositionTree -> String
noPositionTreeRootToString (NoPositionTree { name, children }) =
  String.joinWith ""
    [ name
    , if Array.null children then
        ""
      else
        String.joinWith ""
          [ "(\n"
          , String.joinWith "\n"
              ( Prelude.map
                  ( \child ->
                      evaluatedTreeToStringLoop
                        (UInt.fromInt 1)
                        child
                  )
                  children
              )
          , "\n"
          , ")"
          ]
    , "\n"
    ]

noPositionTreeToString :: NoPositionTree -> String
noPositionTreeToString noPositionTree@(NoPositionTree { name, children }) =
  let
    oneLineText = evaluatedTreeToOneLineStringLoop noPositionTree
  in
    if Ord.lessThan (calculateStringWidth oneLineText) (UInt.fromInt 40) then
      oneLineText
    else
      String.joinWith ""
        [ NonEmptyString.toString (escapeName name)
        , if Array.null children then
            ""
          else
            String.joinWith ""
              [ "(\n"
              , String.joinWith "\n"
                  ( Prelude.map
                      ( \child ->
                          evaluatedTreeToStringLoop
                            (UInt.fromInt 1)
                            child
                      )
                      children
                  )
              , "\n"
              , ")"
              ]
        ]

evaluatedTreeToStringLoop :: UInt.UInt -> NoPositionTree -> String
evaluatedTreeToStringLoop indent noPositionTree@(NoPositionTree { name, children }) =
  let
    oneLineText =
      Util.append3
        (indentCountToIndentString indent)
        (evaluatedTreeToOneLineStringLoop noPositionTree)
        ","
  in
    if Ord.lessThan (calculateStringWidth oneLineText) (UInt.fromInt 80) then
      oneLineText
    else
      String.joinWith ""
        [ indentCountToIndentString indent
        , NonEmptyString.toString (escapeName name)
        , if Array.null children then
            ""
          else
            String.joinWith ""
              [ "(\n"
              , String.joinWith "\n"
                  ( Prelude.map
                      ( \child ->
                          evaluatedTreeToStringLoop
                            (Prelude.add indent (UInt.fromInt 1))
                            child
                      )
                      children
                  )
              , "\n"
              , indentCountToIndentString indent
              , ")"
              ]
        , ","
        ]

indentCountToIndentString :: UInt.UInt -> String
indentCountToIndentString indent =
  String.joinWith ""
    (Array.replicate (UInt.toInt indent) "  ")

-- | 文字列の表示上の幅. 厳密に計算することは難しいので, とりあえずUTF16での長さ
calculateStringWidth :: String -> UInt.UInt
calculateStringWidth str = UInt.fromInt (String.length str)

evaluatedTreeToOneLineStringLoop :: NoPositionTree -> String
evaluatedTreeToOneLineStringLoop (NoPositionTree { name, children }) =
  Prelude.append
    (NonEmptyString.toString (escapeName name))
    ( case Prelude.map evaluatedTreeToOneLineStringLoop children of
        [] -> ""
        list ->
          Util.append3 "("
            (String.joinWith ", " list)
            ")"
    )

-- | シンプルな文字列 (`^[a-zA-Z0-9-]{1,}$` を満たす) 以外を "" で囲む
escapeName :: String -> NonEmptyString
escapeName name = case isSafeName name of
  Just safeName -> safeName
  Nothing -> quoteString name

safePatternEither :: Either.Either String Regex.Regex
safePatternEither = Regex.regex "^[a-zA-Z0-9-]{1,}$" RegexFlags.unicode

isSafeName :: String -> Maybe NonEmptyString
isSafeName name = case safePatternEither of
  Either.Right safePattern ->
    if (Regex.test safePattern name) then
      NonEmptyString.fromString name
    else
      Nothing
  Either.Left _ -> Nothing

quoteString :: String -> NonEmptyString
quoteString str =
  NonEmptyString.appendString
    (NonEmptyString.nes (Proxy :: Proxy "\""))
    (Prelude.append str "\"")
