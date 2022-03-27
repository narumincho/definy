module VsCodeExtension.Completion
  ( CompletionItem(..)
  , CompletionItemKind(..)
  , getCompletionList
  ) where

import VsCodeExtension.Range as Range

newtype CompletionItem
  = CompletionItem
  { label :: String
  , description :: String
  , detail :: String
  , kind :: CompletionItemKind
  , documentation :: String
  , commitCharacters :: Array String
  , insertText :: String
  }

data CompletionItemKind
  = Function
  | Module

getCompletionList ::
  { code :: String, position :: Range.Position } ->
  Array CompletionItem
getCompletionList {} =
  [ CompletionItem
      { label: "module"
      , description: "複数のパーツと説明文を合わせたまとまり"
      , detail: "ファイルの直下に必ず指定するもの"
      , kind: Module
      , documentation: "複数のパーツと説明文を合わせたまとまり"
      , commitCharacters: [ " ", "(" ]
      , insertText: "module(${1:description} ${2:body})"
      }
  , CompletionItem
      { label: "body"
      , description: "複数のパーツを合わせたまとまり"
      , detail: "moduleの説明文の次に指定するもの"
      , kind: Module
      , documentation: "複数のパーツを合わせたまとまり"
      , commitCharacters: [ " ", "(" ]
      , insertText: "body(${1:part})"
      }
  , CompletionItem
      { label: "part"
      , description: "パーツの定義"
      , detail: "パーツは定数のようなもの "
      , kind: Module
      , documentation: "複数のパーツを合わせたまとまり"
      , commitCharacters: [ " ", "(" ]
      , insertText: "part(${1:partName} ${2:description} ${3:expr})"
      }
  ]
