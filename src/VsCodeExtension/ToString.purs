module VsCodeExtension.ToString
  ( escapeName
  , evaluatedTreeToNoPositionTree
  , evaluatedTreeToString
  , isSafeName
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
import Definy.Identifier as Identifier
import Prelude as Prelude
import Type.Proxy (Proxy(..))
import Util as Util
import VsCodeExtension.BuiltIn as BuiltIn
import VsCodeExtension.Evaluate as Evaluate
import VsCodeExtension.EvaluatedItem as EvaluatedItem
import VsCodeExtension.NoPositionTree (NoPositionTree(..))

-- | コードのツリー構造を整形された文字列に変換する
evaluatedTreeToString :: Evaluate.EvaluatedTree -> String
evaluatedTreeToString codeTree =
  noPositionTreeRootToString
    (evaluatedTreeToNoPositionTree codeTree)

evaluatedTreeToNoPositionTree :: Evaluate.EvaluatedTree -> NoPositionTree
evaluatedTreeToNoPositionTree (Evaluate.EvaluatedTree { name, item, children, expectedInputType }) = case item of
  EvaluatedItem.Identifier { isUppercase, identifier } ->
    NoPositionTree
      { name:
          case identifier of
            Just i -> Identifier.identifierToString isUppercase i
            Nothing -> if isUppercase then "sampleIdentifier" else "SampleIdentifier"
      , children: []
      }
  _ ->
    NoPositionTree
      { name
      , children:
          Prelude.append
            ( Prelude.map
                (\(Evaluate.EvaluatedTreeChild { child }) -> evaluatedTreeToNoPositionTree child)
                children
            )
            ( case expectedInputType of
                BuiltIn.InputTypeNormal expectedChildrenType ->
                  Prelude.map
                    BuiltIn.typeDefaultValue
                    ( Array.drop
                        (Array.length children)
                        expectedChildrenType
                    )
                BuiltIn.InputTypeRepeat _ -> []
            )
      }

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
