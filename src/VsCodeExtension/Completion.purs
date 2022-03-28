module VsCodeExtension.Completion
  ( CompletionItem(..)
  , CompletionItemKind(..)
  , getCompletionList
  ) where

import Data.Array as Array
import Data.Maybe (Maybe(..))
import Data.String.NonEmpty (NonEmptyString)
import Data.String.NonEmpty as NonEmptyString
import Prelude as Prelude
import VsCodeExtension.Evaluate as Evaluate
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
  { tree :: Evaluate.EvaluatedTree, position :: Range.Position } ->
  Array CompletionItem
getCompletionList { tree } =
  let
    partNameSet = getPartNameListInTree tree
  in
    Array.concat
      [ [ CompletionItem
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
        , CompletionItem
            { label: "add"
            , description: "足し算"
            , detail: "足し算 "
            , kind: Function
            , documentation: "足し算"
            , commitCharacters: [ " ", "(" ]
            , insertText: "add(${1:expr} ${2:expr})"
            }
        , CompletionItem
            { label: "uint"
            , description: "自然数リテラル"
            , detail: "自然数リテラル"
            , kind: Function
            , documentation: "自然数リテラル"
            , commitCharacters: [ " ", "(" ]
            , insertText: "uint(${1:literal})"
            }
        ]
      , Prelude.map
          ( \{ name, description } ->
              CompletionItem
                { label: NonEmptyString.toString name
                , description: description
                , detail: ""
                , kind: Function
                , documentation: description
                , commitCharacters: [ " ", "(" ]
                , insertText: NonEmptyString.toString name
                }
          )
          partNameSet
      ]

getPartNameListInTree ::
  Evaluate.EvaluatedTree ->
  Array
    { name :: NonEmptyString
    , description :: String
    }
getPartNameListInTree (Evaluate.EvaluatedTree { item }) = case item of
  Evaluate.Module (Evaluate.PartialModule { partList }) ->
    Array.mapMaybe
      ( \(Evaluate.PartialPart { name, description }) -> case name of
          Just nameNonEmpty -> Just { name: nameNonEmpty, description }
          Nothing -> Nothing
      )
      partList
  _ -> []
