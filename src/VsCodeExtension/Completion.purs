module VsCodeExtension.Completion
  ( CompletionItem(..)
  , CompletionItemKind(..)
  , getCompletionList
  , triggerCharacters
  ) where

import Data.Array as Array
import Data.Maybe (Maybe(..))
import Data.String as String
import Data.String.NonEmpty (NonEmptyString)
import Data.String.NonEmpty as NonEmptyString
import Markdown as Markdown
import Prelude as Prelude
import Type.Proxy (Proxy(..))
import VsCodeExtension.Evaluate as Evaluate
import VsCodeExtension.Range as Range
import VsCodeExtension.ToString as ToString

newtype CompletionItem
  = CompletionItem
  { label :: String
  , description :: String
  , detail :: String
  , kind :: CompletionItemKind
  , documentation :: Markdown.Markdown
  , commitCharacters :: Array String
  , insertText :: String
  }

data CompletionItemKind
  = Function
  | Module

newtype SimpleCompletionItem
  = SimpleCompletionItem
  { label :: String
  , description :: String
  , kind :: CompletionItemKind
  , documentation :: Markdown.Markdown
  , insertText :: ToString.NoPositionTree
  }

simpleCompletionItemToCompletionItem :: SimpleCompletionItem -> CompletionItem
simpleCompletionItemToCompletionItem (SimpleCompletionItem rec) =
  CompletionItem
    { label: rec.label
    , description: rec.description
    , detail: ""
    , kind: rec.kind
    , documentation: rec.documentation
    , commitCharacters: [ " ", "(" ]
    , insertText: ToString.noPositionTreeToString rec.insertText
    }

getCompletionList ::
  { tree :: Evaluate.EvaluatedTree, position :: Range.Position } ->
  Array CompletionItem
getCompletionList { tree, position } = Prelude.map simpleCompletionItemToCompletionItem (getSimpleCompletionList { tree, position })

getSimpleCompletionList ::
  { tree :: Evaluate.EvaluatedTree, position :: Range.Position } ->
  Array SimpleCompletionItem
getSimpleCompletionList { tree } =
  let
    partNameSet = getPartNameListInTree tree
  in
    Array.concat
      [ [ SimpleCompletionItem
            { label: "module"
            , description: "Module"
            , kind: Module
            , documentation:
                Markdown.Markdown
                  [ Markdown.Paragraph
                      ( NonEmptyString.nes (Proxy :: Proxy "複数のパーツと説明文を合わせたまとまり")
                      )
                  ]
            , insertText:
                ToString.NoPositionTree
                  { name: NonEmptyString.nes (Proxy :: Proxy "module")
                  , children:
                      snippetPlaceholderListToNoPositionTree
                        [ "description", "body" ]
                  }
            }
        , SimpleCompletionItem
            { label: "body"
            , description: "ModuleBody"
            , kind: Module
            , documentation:
                Markdown.Markdown
                  [ Markdown.Paragraph
                      ( NonEmptyString.nes (Proxy :: Proxy "複数のパーツを合わせたまとまり")
                      )
                  ]
            , insertText:
                ToString.NoPositionTree
                  { name: NonEmptyString.nes (Proxy :: Proxy "body")
                  , children:
                      snippetPlaceholderListToNoPositionTree
                        [ "part" ]
                  }
            }
        , SimpleCompletionItem
            { label: "part"
            , description: "Part"
            , kind: Module
            , documentation:
                Markdown.Markdown
                  [ Markdown.Paragraph
                      ( NonEmptyString.nes (Proxy :: Proxy "パーツの定義 パーツは定数のようなもの")
                      )
                  ]
            , insertText:
                ToString.NoPositionTree
                  { name: NonEmptyString.nes (Proxy :: Proxy "part")
                  , children:
                      snippetPlaceholderListToNoPositionTree
                        [ "partName", "description", "expr" ]
                  }
            }
        , SimpleCompletionItem
            { label: "add"
            , description: "Expr"
            , kind: Function
            , documentation:
                Markdown.Markdown
                  [ Markdown.Paragraph
                      ( NonEmptyString.nes (Proxy :: Proxy "足し算")
                      )
                  ]
            , insertText:
                ToString.NoPositionTree
                  { name: NonEmptyString.nes (Proxy :: Proxy "add")
                  , children:
                      snippetPlaceholderListToNoPositionTree
                        [ "expr", "expr" ]
                  }
            }
        , SimpleCompletionItem
            { label: "uint"
            , description: "Expr"
            , kind: Module
            , documentation:
                Markdown.Markdown
                  [ Markdown.Paragraph
                      ( NonEmptyString.nes (Proxy :: Proxy "自然数リテラル")
                      )
                  ]
            , insertText:
                ToString.NoPositionTree
                  { name: NonEmptyString.nes (Proxy :: Proxy "uint")
                  , children:
                      snippetPlaceholderListToNoPositionTree
                        [ "literal" ]
                  }
            }
        ]
      , Prelude.map
          ( \{ name, description } ->
              SimpleCompletionItem
                { label: NonEmptyString.toString name
                , description: "Expr"
                , kind: Function
                , documentation:
                    Markdown.Markdown
                      [ Markdown.Raw description ]
                , insertText:
                    ToString.NoPositionTree
                      { name: name
                      , children: snippetPlaceholderListToNoPositionTree []
                      }
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

snippetPlaceholderListToNoPositionTree :: Array String -> Array ToString.NoPositionTree
snippetPlaceholderListToNoPositionTree placeholderList =
  Array.mapWithIndex
    ( \index placeholder ->
        ToString.NoPositionTree
          { name:
              NonEmptyString.appendString (NonEmptyString.nes (Proxy :: Proxy "$"))
                ( String.joinWith ""
                    [ "{"
                    , Prelude.show (Prelude.add index 1)
                    , ":"
                    , placeholder
                    , "}"
                    ]
                )
          , children: []
          }
    )
    placeholderList

triggerCharacters :: Array String
triggerCharacters = [ " ", "(", ")" ]
