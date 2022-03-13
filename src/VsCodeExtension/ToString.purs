module VsCodeExtension.ToString
  ( codeTreeToString
  ) where

import Prelude
import Data.Array as Array
import Data.Ord as Ord
import Data.String as String
import Data.String.NonEmpty as NonEmptyString
import Data.UInt as UInt
import Util as Util
import VsCodeExtension.Parser as Parser

-- | コードのツリー構造を整形された文字列に変換する
codeTreeToString :: Parser.CodeTree -> String
codeTreeToString codeTree =
  append
    (codeTreeToStringLoop (UInt.fromInt 0) codeTree)
    "\n"

codeTreeToStringLoop :: UInt.UInt -> Parser.CodeTree -> String
codeTreeToStringLoop indent codeTree@(Parser.CodeTree { name, children }) =
  let
    oneLineText = append (indentCountToIndentString indent) (codeTreeToOneLineStringLoop codeTree)
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
                          codeTreeToStringLoop
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

codeTreeToOneLineStringLoop :: Parser.CodeTree -> String
codeTreeToOneLineStringLoop (Parser.CodeTree { name, children }) =
  append
    (NonEmptyString.toString name)
    ( if Array.null children then
        ""
      else
        Util.append3 "("
          (String.joinWith " " (map codeTreeToOneLineStringLoop children))
          ")"
    )
