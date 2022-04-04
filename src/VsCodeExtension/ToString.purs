module VsCodeExtension.ToString
  ( NoPositionTree(..)
  , evaluatedTreeToNoPositionTree
  , evaluatedTreeToString
  , noPositionTreeToString
  ) where

import Prelude
import Data.Array as Array
import Data.Maybe (Maybe(..))
import Data.Ord as Ord
import Data.String as String
import Data.String.NonEmpty (NonEmptyString)
import Data.String.NonEmpty as NonEmptyString
import Data.UInt as UInt
import Type.Proxy (Proxy(..))
import Util as Util
import VsCodeExtension.Evaluate as Evaluate

-- | 位置情報が含まれていないシンプルな木構造
newtype NoPositionTree
  = NoPositionTree
  { name :: NonEmptyString, children :: Array NoPositionTree }

-- | コードのツリー構造を整形された文字列に変換する
evaluatedTreeToString :: Evaluate.EvaluatedTree -> String
evaluatedTreeToString codeTree = noPositionTreeToString (evaluatedTreeToNoPositionTree codeTree)

evaluatedTreeToNoPositionTree :: Evaluate.EvaluatedTree -> NoPositionTree
evaluatedTreeToNoPositionTree (Evaluate.EvaluatedTree { name, children, expectedChildrenTypeMaybe }) =
  NoPositionTree
    { name
    , children:
        append (map (\(Evaluate.EvaluatedTreeChild { child }) -> evaluatedTreeToNoPositionTree child) children)
          ( case expectedChildrenTypeMaybe of
              Just expectedChildrenType ->
                map
                  typeDefaultValue
                  ( Array.drop
                      (Array.length children)
                      expectedChildrenType
                  )
              Nothing -> []
          )
    }

typeDefaultValue :: Evaluate.TreeType -> NoPositionTree
typeDefaultValue = case _ of
  Evaluate.TreeTypeModule ->
    NoPositionTree
      { name: NonEmptyString.nes (Proxy :: Proxy "module")
      , children:
          [ typeDefaultValue Evaluate.TreeTypeDescription
          , typeDefaultValue Evaluate.TreeTypeModuleBody
          ]
      }
  Evaluate.TreeTypeDescription ->
    NoPositionTree
      { name: NonEmptyString.nes (Proxy :: Proxy "description"), children: [] }
  Evaluate.TreeTypeModuleBody ->
    NoPositionTree
      { name: NonEmptyString.nes (Proxy :: Proxy "body"), children: [] }
  Evaluate.TreeTypePart ->
    NoPositionTree
      { name: NonEmptyString.nes (Proxy :: Proxy "part")
      , children:
          [ typeDefaultValue Evaluate.TreeTypeIdentifier
          , typeDefaultValue Evaluate.TreeTypeDescription
          , typeDefaultValue Evaluate.TreeTypeExpr
          ]
      }
  Evaluate.TreeTypeExpr ->
    NoPositionTree
      { name: NonEmptyString.nes (Proxy :: Proxy "uint")
      , children:
          [ typeDefaultValue Evaluate.TreeTypeUIntLiteral ]
      }
  Evaluate.TreeTypeUIntLiteral ->
    NoPositionTree
      { name: NonEmptyString.nes (Proxy :: Proxy "28"), children: [] }
  Evaluate.TreeTypeIdentifier ->
    NoPositionTree
      { name: NonEmptyString.nes (Proxy :: Proxy "sample"), children: [] }

noPositionTreeToString :: NoPositionTree -> String
noPositionTreeToString noPositionTree =
  append
    (evaluatedTreeToStringLoop (UInt.fromInt 0) noPositionTree)
    "\n"

evaluatedTreeToStringLoop :: UInt.UInt -> NoPositionTree -> String
evaluatedTreeToStringLoop indent noPositionTree@(NoPositionTree { name, children }) =
  let
    oneLineText =
      append
        (indentCountToIndentString indent)
        (evaluatedTreeToOneLineStringLoop noPositionTree)
  in
    if Ord.lessThan (calculateStringWidth oneLineText) (UInt.fromInt 80) then
      oneLineText
    else
      Util.append3
        (indentCountToIndentString indent)
        (NonEmptyString.toString name)
        ( if Array.null children then
            ""
          else
            Util.append3
              "(\n"
              ( String.joinWith "\n"
                  ( map
                      ( \child ->
                          evaluatedTreeToStringLoop
                            ( add indent
                                (UInt.fromInt 1)
                            )
                            child
                      )
                      children
                  )
              )
              (Util.append3 "\n" (indentCountToIndentString indent) ")")
        )

indentCountToIndentString :: UInt.UInt -> String
indentCountToIndentString indent =
  String.joinWith ""
    (Array.replicate (UInt.toInt indent) "  ")

-- | 文字列の表示上の幅. 厳密に計算することは難しいので, とりあえずUTF16での長さ
calculateStringWidth :: String -> UInt.UInt
calculateStringWidth str = UInt.fromInt (String.length str)

evaluatedTreeToOneLineStringLoop :: NoPositionTree -> String
evaluatedTreeToOneLineStringLoop (NoPositionTree { name, children }) =
  append
    (NonEmptyString.toString name)
    ( case map evaluatedTreeToOneLineStringLoop children of
        [] -> ""
        list ->
          Util.append3 "("
            (String.joinWith " " list)
            ")"
    )
