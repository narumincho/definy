module VsCodeExtension.ToString
  ( codeTreeToString
  ) where

import Prelude
import Data.Array as Array
import Data.String as String
import Data.String.NonEmpty as NonEmptyString
import VsCodeExtension.Parser as Parser

-- | コードのツリー構造を整形された文字列に変換する
codeTreeToString :: Parser.CodeTree -> String
codeTreeToString codeTree =
  append
    (codeTreeToStringLoop codeTree)
    "\n"

codeTreeToStringLoop :: Parser.CodeTree -> String
codeTreeToStringLoop (Parser.CodeTree { name, children }) =
  append
    (NonEmptyString.toString name)
    ( if Array.null children then
        ""
      else
        append
          ( append "("
              (String.joinWith " " (map codeTreeToStringLoop children))
          )
          ")"
    )
