module VsCodeExtension.Completion
  ( CompletionItem(..)
  , CompletionItemKind(..)
  , InsertTextTree(..)
  , getCompletionList
  , insertTextTreeToString
  , triggerCharacters
  ) where

import Data.Array as Array
import Data.Maybe (Maybe(..))
import Data.String as String
import Data.String.NonEmpty (NonEmptyString)
import Data.String.NonEmpty as NonEmptyString
import Data.UInt as UInt
import Definy.Identifier as Identifier
import Markdown as Markdown
import Prelude as Prelude
import Type.Proxy (Proxy(..))
import VsCodeExtension.Evaluate as Evaluate
import VsCodeExtension.EvaluatedTreeIndex as EvaluatedTreeIndex
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
  , insertText :: InsertTextTree
  }

simpleCompletionItemToCompletionItem :: SimpleCompletionItem -> CompletionItem
simpleCompletionItemToCompletionItem (SimpleCompletionItem rec) =
  CompletionItem
    { label: rec.label
    , description: rec.description
    , detail: ""
    , kind: rec.kind
    , documentation: rec.documentation
    , commitCharacters: [ ",", "(" ]
    , insertText:
        NonEmptyString.toString
          (insertTextTreeToString (setRootFocusFalse rec.insertText))
    }

getCompletionList ::
  { tree :: Evaluate.EvaluatedTree, position :: Range.Position } ->
  Array CompletionItem
getCompletionList { tree, position } = Prelude.map simpleCompletionItemToCompletionItem (getSimpleCompletionList { tree, position })

getSimpleCompletionList ::
  { tree :: Evaluate.EvaluatedTree, position :: Range.Position } ->
  Array SimpleCompletionItem
getSimpleCompletionList { tree, position } = case EvaluatedTreeIndex.getEvaluatedItem position tree of
  Just { item: Evaluate.Description _ } -> []
  Just { item: Evaluate.UIntLiteral _ } -> []
  Just { item: Evaluate.Identifier _ } -> []
  _ ->
    let
      partNameSet = getPartNameListInTree tree
    in
      Array.concat
        [ [ moduleCompletionItem
          , bodyCompletionItem
          , partCompletionItem
          , addCompletionItem
          , uintCompletionItem
          , textCompletionItem
          , float64CompletionItem
          ]
        , Prelude.map
            ( \{ name, description } ->
                SimpleCompletionItem
                  { label: Identifier.identifierToString name
                  , description: "Expr"
                  , kind: Function
                  , documentation:
                      Markdown.Markdown
                        [ Markdown.Raw description ]
                  , insertText:
                      InsertTextTree
                        { name: Identifier.identifierToNonEmptyString name
                        , focus: false
                        , children: []
                        }
                  }
            )
            partNameSet
        ]

moduleCompletionItem :: SimpleCompletionItem
moduleCompletionItem =
  SimpleCompletionItem
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
        InsertTextTree
          { name: NonEmptyString.nes (Proxy :: Proxy "module")
          , focus: false
          , children:
              [ InsertTextTree
                  { name: NonEmptyString.nes (Proxy :: Proxy "module description")
                  , focus: false
                  , children: []
                  }
              , bodyInsertText
              ]
          }
    }

bodyCompletionItem :: SimpleCompletionItem
bodyCompletionItem =
  SimpleCompletionItem
    { label: "body"
    , description: "ModuleBody"
    , kind: Module
    , documentation:
        Markdown.Markdown
          [ Markdown.Paragraph
              (NonEmptyString.nes (Proxy :: Proxy "複数のパーツを合わせたまとまり"))
          ]
    , insertText: bodyInsertText
    }

partCompletionItem :: SimpleCompletionItem
partCompletionItem =
  SimpleCompletionItem
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
        InsertTextTree
          { name: NonEmptyString.nes (Proxy :: Proxy "part")
          , focus: false
          , children:
              [ InsertTextTree
                  { name: NonEmptyString.nes (Proxy :: Proxy "partName")
                  , focus: false
                  , children: []
                  }
              , InsertTextTree
                  { name: NonEmptyString.nes (Proxy :: Proxy "part description")
                  , focus: false
                  , children: []
                  }
              , exprInsertText
              ]
          }
    }

addCompletionItem :: SimpleCompletionItem
addCompletionItem =
  SimpleCompletionItem
    { label: "add"
    , description: "Expr"
    , kind: Function
    , documentation:
        Markdown.Markdown
          [ Markdown.Paragraph
              ( NonEmptyString.nes (Proxy :: Proxy "足し算")
              )
          ]
    , insertText: exprInsertText
    }

uintCompletionItem :: SimpleCompletionItem
uintCompletionItem =
  SimpleCompletionItem
    { label: "uint"
    , description: "Expr"
    , kind: Module
    , documentation:
        Markdown.Markdown
          [ Markdown.Paragraph
              ( NonEmptyString.nes (Proxy :: Proxy "自然数リテラル")
              )
          ]
    , insertText: setRootFocusFalse exprInsertText
    }

textCompletionItem :: SimpleCompletionItem
textCompletionItem =
  SimpleCompletionItem
    { label: "text"
    , description: "Expr"
    , kind: Module
    , documentation:
        Markdown.Markdown
          [ Markdown.Paragraph
              ( NonEmptyString.nes (Proxy :: Proxy "文字列リテラル")
              )
          ]
    , insertText: setRootFocusFalse textInsertText
    }

float64CompletionItem :: SimpleCompletionItem
float64CompletionItem =
  SimpleCompletionItem
    { label: "float64"
    , description: "Expr"
    , kind: Module
    , documentation:
        Markdown.Markdown
          [ Markdown.Paragraph
              ( NonEmptyString.nes (Proxy :: Proxy "64bit 浮動小数点数リテラル")
              )
          ]
    , insertText: setRootFocusFalse float64InsertText
    }

bodyInsertText :: InsertTextTree
bodyInsertText =
  InsertTextTree
    { name: NonEmptyString.nes (Proxy :: Proxy "body")
    , focus: true
    , children:
        [ partInsertText
        , partInsertText
        ]
    }

partInsertText :: InsertTextTree
partInsertText =
  InsertTextTree
    { name: NonEmptyString.nes (Proxy :: Proxy "part")
    , focus: true
    , children:
        [ InsertTextTree
            { name: NonEmptyString.nes (Proxy :: Proxy "partName")
            , focus: true
            , children: []
            }
        , InsertTextTree
            { name: NonEmptyString.nes (Proxy :: Proxy "part description")
            , focus: true
            , children: []
            }
        , exprInsertText
        ]
    }

exprInsertText :: InsertTextTree
exprInsertText =
  InsertTextTree
    { name: NonEmptyString.nes (Proxy :: Proxy "add")
    , focus: true
    , children:
        [ uintInsertText
        , uintInsertText
        ]
    }

uintInsertText :: InsertTextTree
uintInsertText =
  InsertTextTree
    { name: NonEmptyString.nes (Proxy :: Proxy "uint")
    , focus: true
    , children:
        [ InsertTextTree
            { name: NonEmptyString.nes (Proxy :: Proxy "28")
            , focus: true
            , children: []
            }
        ]
    }

textInsertText :: InsertTextTree
textInsertText =
  InsertTextTree
    { name: NonEmptyString.nes (Proxy :: Proxy "text")
    , focus: true
    , children:
        [ InsertTextTree
            { name: NonEmptyString.nes (Proxy :: Proxy "hello")
            , focus: true
            , children: []
            }
        ]
    }

float64InsertText :: InsertTextTree
float64InsertText =
  InsertTextTree
    { name: NonEmptyString.nes (Proxy :: Proxy "float64")
    , focus: true
    , children:
        [ InsertTextTree
            { name: NonEmptyString.nes (Proxy :: Proxy "6.28")
            , focus: true
            , children: []
            }
        ]
    }

getPartNameListInTree ::
  Evaluate.EvaluatedTree ->
  Array
    { name :: Identifier.Identifier
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

triggerCharacters :: Array String
triggerCharacters = [ " ", "(", ")" ]

newtype InsertTextTree
  = InsertTextTree
  { name :: NonEmptyString, children :: Array InsertTextTree, focus :: Boolean }

setRootFocusFalse :: InsertTextTree -> InsertTextTree
setRootFocusFalse (InsertTextTree rec) = InsertTextTree (rec { focus = false })

insertTextTreeToString :: InsertTextTree -> NonEmptyString
insertTextTreeToString tree = (insertTextTreeToStringLoop (UInt.fromInt 0) tree).text

insertTextTreeToStringLoop ::
  UInt.UInt ->
  InsertTextTree ->
  { text :: NonEmptyString, nextIndex :: UInt.UInt }
insertTextTreeToStringLoop index (InsertTextTree { name, children, focus }) =
  let
    result :: { textList :: Array NonEmptyString, nextIndex :: UInt.UInt }
    result =
      ( Array.foldl
          ( \{ textList, nextIndex } tree ->
              let
                r = insertTextTreeToStringLoop nextIndex tree
              in
                { textList: Array.snoc textList r.text
                , nextIndex: r.nextIndex
                }
          )
          { textList: []
          , nextIndex:
              if focus then Prelude.add index (UInt.fromInt 1) else index
          }
          children
      )

    text :: NonEmptyString
    text = case ToString.isSafeName (NonEmptyString.toString name) of
      Just safeName ->
        let
          content =
            NonEmptyString.appendString
              safeName
              ( if Array.null result.textList then
                  ""
                else
                  String.joinWith ""
                    [ "("
                    , NonEmptyString.joinWith ", " result.textList
                    , ")"
                    ]
              )
        in
          if focus then
            snippetPlaceholderToString index content
          else
            content
      Nothing ->
        if focus then
          ToString.quoteString
            (NonEmptyString.toString (snippetPlaceholderToString index name))
        else
          ToString.quoteString (NonEmptyString.toString name)
  in
    { text: text
    , nextIndex: result.nextIndex
    }

snippetPlaceholderToString :: UInt.UInt -> NonEmptyString -> NonEmptyString
snippetPlaceholderToString index placeholder =
  NonEmptyString.appendString
    (NonEmptyString.nes (Proxy :: Proxy "$"))
    ( String.joinWith ""
        [ "{"
        , UInt.toString (Prelude.add index (UInt.fromInt 1))
        , ":"
        , NonEmptyString.toString placeholder
        , "}"
        ]
    )
