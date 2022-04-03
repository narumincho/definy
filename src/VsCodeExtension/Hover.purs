module VsCodeExtension.Hover
  ( Hover(..)
  , getHoverData
  ) where

import Data.Maybe (Maybe(..))
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

newtype Hover
  = Hover { contents :: Markdown.Markdown, range :: Range.Range }

getHoverData ::
  Range.Position ->
  Evaluate.EvaluatedTree ->
  Maybe Hover
getHoverData position tree@(Evaluate.EvaluatedTree { item, range }) = case item of
  Evaluate.Module partialModule -> case EvaluatedTreeIndex.getEvaluatedItem position tree of
    Just { item: targetItem, range: targetRange } ->
      let
        hoverTree = evaluatedItemToHoverTree { item: targetItem, partialModule }
      in
        Just
          ( Hover
              { contents:
                  Markdown.Markdown
                    [ Markdown.Paragraph hoverTree.description
                    , Markdown.Header2 (NonEmptyString.nes (Proxy :: Proxy "Type"))
                    , Markdown.CodeBlock
                        (ToString.noPositionTreeToString hoverTree.type)
                    , Markdown.Header2 (NonEmptyString.nes (Proxy :: Proxy "Value"))
                    , Markdown.CodeBlock
                        (ToString.noPositionTreeToString hoverTree.value)
                    , Markdown.Header2 (NonEmptyString.nes (Proxy :: Proxy "Tree"))
                    , Markdown.CodeBlock
                        (ToString.noPositionTreeToString hoverTree.tree)
                    ]
              , range: targetRange
              }
          )
    Nothing -> Nothing
  _ ->
    Just
      ( Hover
          { contents:
              Markdown.Markdown
                [ Markdown.Header2
                    (NonEmptyString.nes (Proxy :: Proxy "直下がモジュールでない"))
                ]
          , range: range
          }
      )

evaluatedItemToHoverTree ::
  { item :: Evaluate.EvaluatedItem
  , partialModule :: Evaluate.PartialModule
  } ->
  { type :: ToString.NoPositionTree
  , value :: ToString.NoPositionTree
  , tree :: ToString.NoPositionTree
  , description :: NonEmptyString
  }
evaluatedItemToHoverTree { item, partialModule } = case item of
  Evaluate.Module (Evaluate.PartialModule { description, partList }) ->
    { type:
        ToString.NoPositionTree
          { name: NonEmptyString.nes (Proxy :: Proxy "Module")
          , children: []
          }
    , value:
        ToString.NoPositionTree
          { name: NonEmptyString.nes (Proxy :: Proxy "Module")
          , children:
              [ stringToNoPositionTree description
              , moduleBodyToNoPositionTree partList
              ]
          }
    , tree:
        ToString.NoPositionTree
          { name: NonEmptyString.nes (Proxy :: Proxy "Module")
          , children:
              [ stringToNoPositionTree description
              , moduleBodyToNoPositionTree partList
              ]
          }
    , description: NonEmptyString.nes (Proxy :: Proxy "モジュール")
    }
  Evaluate.Description description ->
    { type:
        ToString.NoPositionTree
          { name: NonEmptyString.nes (Proxy :: Proxy "Description")
          , children: []
          }
    , value:
        ToString.NoPositionTree
          { name: NonEmptyString.nes (Proxy :: Proxy "Description")
          , children: [ stringToNoPositionTree description ]
          }
    , tree:
        ToString.NoPositionTree
          { name: NonEmptyString.nes (Proxy :: Proxy "Description")
          , children: [ stringToNoPositionTree description ]
          }
    , description: NonEmptyString.nes (Proxy :: Proxy "なにかの説明文")
    }
  Evaluate.ModuleBody partList ->
    { type:
        ToString.NoPositionTree
          { name: NonEmptyString.nes (Proxy :: Proxy "ModuleBody")
          , children: []
          }
    , value: moduleBodyToNoPositionTree partList
    , tree: moduleBodyToNoPositionTree partList
    , description: NonEmptyString.nes (Proxy :: Proxy "モジュール本体")
    }
  Evaluate.Part part ->
    { type:
        ToString.NoPositionTree
          { name: NonEmptyString.nes (Proxy :: Proxy "Part")
          , children: []
          }
    , value: partialPartToNoPositionTree part
    , tree: partialPartToNoPositionTree part
    , description: NonEmptyString.nes (Proxy :: Proxy "パーツの定義")
    }
  Evaluate.Expr value ->
    { type:
        ToString.NoPositionTree
          { name: NonEmptyString.nes (Proxy :: Proxy "Expr")
          , children: []
          }
    , value:
        let
          (Evaluate.EvaluateExprResult { value, dummy }) =
            ( Evaluate.evaluateExpr
                value
                partialModule
            )
        in
          ToString.NoPositionTree
            { name: NonEmptyString.nes (Proxy :: Proxy "EvaluateExprResult")
            , children:
                [ stringToNoPositionTree (UInt.toString value)
                , ToString.NoPositionTree
                    { name:
                        if dummy then
                          NonEmptyString.nes (Proxy :: Proxy "True")
                        else
                          NonEmptyString.nes (Proxy :: Proxy "False")
                    , children: []
                    }
                ]
            }
    , tree:
        partialExprToNoPositionTree value
    , description: partialExprToDescription partialModule value
    }
  Evaluate.UIntLiteral uintLiteral ->
    { type:
        ToString.NoPositionTree
          { name: NonEmptyString.nes (Proxy :: Proxy "UIntLiteral")
          , children: []
          }
    , value:
        maybeToNoPositionTree
          (Prelude.map (\v -> stringToNoPositionTree (UInt.toString v)) uintLiteral)
    , tree:
        maybeToNoPositionTree
          (Prelude.map (\v -> stringToNoPositionTree (UInt.toString v)) uintLiteral)
    , description: NonEmptyString.nes (Proxy :: Proxy "自然数リテラル")
    }
  Evaluate.Identifier identifier ->
    { type:
        ToString.NoPositionTree
          { name: NonEmptyString.nes (Proxy :: Proxy "Identifier")
          , children: []
          }
    , value:
        maybeToNoPositionTree
          ( Prelude.map
              ( \v ->
                  stringToNoPositionTree
                    ( NonEmptyString.toString
                        (Identifier.identifierToNonEmptyString v)
                    )
              )
              identifier
          )
    , tree:
        maybeToNoPositionTree
          ( Prelude.map
              ( \v ->
                  stringToNoPositionTree
                    ( NonEmptyString.toString
                        (Identifier.identifierToNonEmptyString v)
                    )
              )
              identifier
          )
    , description: NonEmptyString.nes (Proxy :: Proxy "識別子")
    }

stringToNoPositionTree :: String -> ToString.NoPositionTree
stringToNoPositionTree str =
  ToString.NoPositionTree
    { name:
        case NonEmptyString.fromString str of
          Just nonEmptyString -> nonEmptyString
          Nothing -> NonEmptyString.nes (Proxy :: Proxy "\"\"")
    , children: []
    }

moduleBodyToNoPositionTree :: Array Evaluate.PartialPart -> ToString.NoPositionTree
moduleBodyToNoPositionTree moduleBody =
  ToString.NoPositionTree
    { name: NonEmptyString.nes (Proxy :: Proxy "ModuleBody")
    , children: Prelude.map partialPartToNoPositionTree moduleBody
    }

partialPartToNoPositionTree :: Evaluate.PartialPart -> ToString.NoPositionTree
partialPartToNoPositionTree (Evaluate.PartialPart { name, description, expr }) =
  ToString.NoPositionTree
    { name: NonEmptyString.nes (Proxy :: Proxy "Part")
    , children:
        [ maybeToNoPositionTree
            ( Prelude.map
                ( \nonEmpty ->
                    ToString.NoPositionTree
                      { name: Identifier.identifierToNonEmptyString nonEmpty
                      , children: []
                      }
                )
                name
            )
        , stringToNoPositionTree description
        , maybeToNoPositionTree
            (Prelude.map partialExprToNoPositionTree expr)
        ]
    }

partialExprToNoPositionTree :: Evaluate.PartialExpr -> ToString.NoPositionTree
partialExprToNoPositionTree = case _ of
  Evaluate.ExprAdd { a, b } ->
    ToString.NoPositionTree
      { name: NonEmptyString.nes (Proxy :: Proxy "Add")
      , children:
          [ maybeToNoPositionTree
              (Prelude.map partialExprToNoPositionTree a)
          , maybeToNoPositionTree
              (Prelude.map partialExprToNoPositionTree b)
          ]
      }
  Evaluate.ExprPartReference { name } ->
    ToString.NoPositionTree
      { name: Identifier.identifierToNonEmptyString name
      , children: []
      }
  Evaluate.ExprPartReferenceInvalidName { name } ->
    ToString.NoPositionTree
      { name: name, children: [] }
  Evaluate.ExprUIntLiteral uintMaybe ->
    ToString.NoPositionTree
      { name: NonEmptyString.nes (Proxy :: Proxy "UIntLiteral")
      , children:
          [ maybeToNoPositionTree
              (Prelude.map (\v -> stringToNoPositionTree (UInt.toString v)) uintMaybe)
          ]
      }

partialExprToDescription :: Evaluate.PartialModule -> Evaluate.PartialExpr -> NonEmptyString
partialExprToDescription partialModule = case _ of
  Evaluate.ExprAdd {} -> NonEmptyString.nes (Proxy :: Proxy "組み込みの足し算")
  Evaluate.ExprPartReference { name } -> case Evaluate.findPart partialModule name of
    Just (Evaluate.PartialPart { description }) -> case NonEmptyString.fromString description of
      Just descriptionNonEmpty -> descriptionNonEmpty
      Nothing -> NonEmptyString.nes (Proxy :: Proxy "パーツの参照 (説明文なし)")
    Nothing -> NonEmptyString.nes (Proxy :: Proxy "不明なパーツの参照")
  Evaluate.ExprPartReferenceInvalidName _ -> NonEmptyString.nes (Proxy :: Proxy "パーツの参照 識別子としてエラー")
  Evaluate.ExprUIntLiteral _ -> NonEmptyString.nes (Proxy :: Proxy "自然数リテラル")

maybeToNoPositionTree :: Maybe ToString.NoPositionTree -> ToString.NoPositionTree
maybeToNoPositionTree = case _ of
  Just value ->
    ToString.NoPositionTree
      { name: NonEmptyString.nes (Proxy :: Proxy "Just")
      , children: [ value ]
      }
  Nothing ->
    ToString.NoPositionTree
      { name: NonEmptyString.nes (Proxy :: Proxy "Nothing")
      , children: []
      }
