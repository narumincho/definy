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
    , commitCharacters: [ ",", "(" ]
    , insertText: ToString.noPositionTreeToString rec.insertText
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
                      ToString.NoPositionTree
                        { name: Identifier.identifierToString name
                        , children: snippetPlaceholderListToNoPositionTree []
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
        ToString.NoPositionTree
          { name: "module"
          , children:
              snippetPlaceholderListToNoPositionTree
                [ "description", "body" ]
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
              ( NonEmptyString.nes (Proxy :: Proxy "複数のパーツを合わせたまとまり")
              )
          ]
    , insertText:
        ToString.NoPositionTree
          { name: "body"
          , children:
              snippetPlaceholderListToNoPositionTree
                [ "part" ]
          }
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
        ToString.NoPositionTree
          { name: "part"
          , children:
              snippetPlaceholderListToNoPositionTree
                [ "partName", "description", "expr" ]
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
    , insertText:
        ToString.NoPositionTree
          { name: "add"
          , children:
              snippetPlaceholderListToNoPositionTree
                [ "expr", "expr" ]
          }
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
    , insertText:
        ToString.NoPositionTree
          { name: "uint"
          , children:
              snippetPlaceholderListToNoPositionTree
                [ "literal" ]
          }
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

snippetPlaceholderListToNoPositionTree :: Array String -> Array ToString.NoPositionTree
snippetPlaceholderListToNoPositionTree placeholderList =
  Array.mapWithIndex
    ( \index placeholder ->
        ToString.NoPositionTree
          { name:
              Prelude.append "$"
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

newtype InsertTextTree
  = InsertTextTree
  { name :: NonEmptyString, children :: Array InsertTextTree, focus :: Boolean }

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

    content :: NonEmptyString
    content =
      NonEmptyString.appendString
        name
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
    { text:
        if focus then
          snippetPlaceholderToString index content
        else
          content
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
