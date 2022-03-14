module VsCodeExtension.ToString
  ( evaluatedTreeToString
  ) where

import Prelude
import Data.Array as Array
import Data.Maybe (Maybe(..))
import Data.Ord as Ord
import Data.String as String
import Data.String.NonEmpty as NonEmptyString
import Data.UInt as UInt
import Util as Util
import VsCodeExtension.Evaluate as Evaluate

-- | コードのツリー構造を整形された文字列に変換する
evaluatedTreeToString :: Evaluate.EvaluatedTree -> String
evaluatedTreeToString codeTree =
  append
    (evaluatedTreeToStringLoop (UInt.fromInt 0) codeTree)
    "\n"

evaluatedTreeToStringLoop :: UInt.UInt -> Evaluate.EvaluatedTree -> String
evaluatedTreeToStringLoop indent codeTree@(Evaluate.EvaluatedTree { name, children }) =
  let
    oneLineText =
      append
        (indentCountToIndentString indent)
        (evaluatedTreeToOneLineStringLoop codeTree)
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
                      ( \(Evaluate.EvaluatedTreeChild { child }) ->
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

evaluatedTreeToOneLineStringLoop :: Evaluate.EvaluatedTree -> String
evaluatedTreeToOneLineStringLoop tree@(Evaluate.EvaluatedTree { name }) =
  let
    childrenArrayString = evaluatedTreeChildrenToFilledChildren tree
  in
    append
      (NonEmptyString.toString name)
      ( if Array.null childrenArrayString then
          ""
        else
          Util.append3 "("
            (String.joinWith " " childrenArrayString)
            ")"
      )

evaluatedTreeChildrenToFilledChildren :: Evaluate.EvaluatedTree -> Array String
evaluatedTreeChildrenToFilledChildren (Evaluate.EvaluatedTree { children, expectedChildrenCount }) =
  append (map (\(Evaluate.EvaluatedTreeChild { child }) -> evaluatedTreeToOneLineStringLoop child) children)
    ( case expectedChildrenCount of
        Just expectedCount -> Array.replicate (sub (UInt.toInt expectedCount) (Array.length children)) "???"
        Nothing -> []
    )
