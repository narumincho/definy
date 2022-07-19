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
import VsCodeExtension.BuiltIn as BuiltIn
import VsCodeExtension.Evaluate as Evaluate
import VsCodeExtension.EvaluatedItem as EvaluatedItem
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
  Just { item: EvaluatedItem.Description _ } -> []
  Just { item: EvaluatedItem.UIntLiteral _ } -> []
  Just { item: EvaluatedItem.Float64Literal _ } -> []
  Just { item: EvaluatedItem.TextLiteral _ } -> []
  Just { item: EvaluatedItem.Identifier _ } -> []
  _ ->
    let
      partNameSet = getPartNameListInTree tree
    in
      Prelude.append
        (Prelude.map buildInToSimpleCompletionItem BuiltIn.all)
        ( Prelude.map
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
        )

buildInToSimpleCompletionItem :: BuiltIn.BuiltIn -> SimpleCompletionItem
buildInToSimpleCompletionItem (BuiltIn.BuiltIn rec) =
  SimpleCompletionItem
    { label: NonEmptyString.toString rec.name
    , description:
        ToString.noPositionTreeToString
          (BuiltIn.builtInTypeToNoPositionTree rec.outputType)
    , kind:
        case rec.outputType of
          BuiltIn.Module -> Module
          BuiltIn.ModuleBody -> Module
          BuiltIn.PartDefinition -> Module
          _ -> Function
    , documentation:
        Markdown.Markdown [ Markdown.Paragraph rec.description ]
    , insertText:
        InsertTextTree
          { name: rec.name
          , focus: true
          , children: inputTypeToInsertTextTree rec.inputType
          }
    }

builtInTypeToInsertTextTree :: BuiltIn.BuiltInType -> InsertTextTree
builtInTypeToInsertTextTree = case _ of
  BuiltIn.Module -> builtInToInsertTextTree BuiltIn.moduleBuiltIn
  BuiltIn.Description ->
    InsertTextTree
      { name: NonEmptyString.nes (Proxy :: Proxy "分かりやすい説明文")
      , focus: true
      , children: []
      }
  BuiltIn.ModuleBody -> builtInToInsertTextTree BuiltIn.bodyBuiltIn
  BuiltIn.PartDefinition -> builtInToInsertTextTree BuiltIn.partBuiltIn
  BuiltIn.Expr BuiltIn.UInt -> builtInToInsertTextTree BuiltIn.uintBuiltIn
  BuiltIn.Expr BuiltIn.Text -> builtInToInsertTextTree BuiltIn.textBuiltIn
  BuiltIn.Expr BuiltIn.Float64 -> builtInToInsertTextTree BuiltIn.float64BuiltIn
  BuiltIn.Expr BuiltIn.NonEmptyText -> builtInToInsertTextTree BuiltIn.nonEmptyTextBuiltIn
  BuiltIn.Expr BuiltIn.TypePart -> builtInToInsertTextTree BuiltIn.typeBuiltIn
  BuiltIn.Expr BuiltIn.TypeBody -> builtInToInsertTextTree BuiltIn.typeBodySumBuiltIn
  BuiltIn.Expr BuiltIn.Pattern -> builtInToInsertTextTree BuiltIn.patternBuiltIn
  BuiltIn.Expr BuiltIn.Unknown -> builtInToInsertTextTree BuiltIn.uintBuiltIn
  BuiltIn.Identifier ->
    InsertTextTree
      { name: NonEmptyString.nes (Proxy :: Proxy "identifierSample")
      , focus: true
      , children: []
      }
  BuiltIn.UIntLiteral ->
    InsertTextTree
      { name: NonEmptyString.nes (Proxy :: Proxy "28")
      , focus: true
      , children: []
      }
  BuiltIn.TextLiteral ->
    InsertTextTree
      { name: NonEmptyString.nes (Proxy :: Proxy "Hello, World!")
      , focus: true
      , children: []
      }
  BuiltIn.Float64Literal ->
    InsertTextTree
      { name: NonEmptyString.nes (Proxy :: Proxy "6.28")
      , focus: true
      , children: []
      }
  BuiltIn.NonEmptyTextLiteral ->
    InsertTextTree
      { name: NonEmptyString.nes (Proxy :: Proxy "Hello, World!")
      , focus: true
      , children: []
      }

builtInToInsertTextTree :: BuiltIn.BuiltIn -> InsertTextTree
builtInToInsertTextTree (BuiltIn.BuiltIn { name, inputType }) =
  InsertTextTree
    { name: name
    , focus: true
    , children: inputTypeToInsertTextTree inputType
    }

inputTypeToInsertTextTree :: BuiltIn.InputType -> Array InsertTextTree
inputTypeToInsertTextTree = case _ of
  BuiltIn.InputTypeNormal types -> Prelude.map builtInTypeToInsertTextTree types
  BuiltIn.InputTypeRepeat t ->
    Prelude.map
      builtInTypeToInsertTextTree
      (Array.replicate 2 t)

getPartNameListInTree ::
  Evaluate.EvaluatedTree ->
  Array
    { name :: Identifier.Identifier
    , description :: String
    }
getPartNameListInTree (Evaluate.EvaluatedTree { item }) = case item of
  EvaluatedItem.Module (EvaluatedItem.PartialModule { partOrTypePartList }) ->
    Array.mapMaybe
      ( case _ of
          (EvaluatedItem.PartialPartOrTypePartPart (EvaluatedItem.PartialPart { name, description })) -> case name of
            Just nameNonEmpty -> Just { name: nameNonEmpty, description }
            Nothing -> Nothing
          EvaluatedItem.PartialPartOrTypePartTypePart _ -> Nothing
      )
      partOrTypePartList
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
