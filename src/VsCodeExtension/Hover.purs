module VsCodeExtension.Hover
  ( Hover(..)
  , getHoverData
  ) where

import Data.Maybe (Maybe(..))
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
                    [ Markdown.Raw hoverTree.description
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
  , description :: String
  }
evaluatedItemToHoverTree { item, partialModule } = case item of
  Evaluate.Module (Evaluate.PartialModule { description, partList }) ->
    { type:
        ToString.NoPositionTree
          { name: "Module"
          , children: []
          }
    , value:
        ToString.NoPositionTree
          { name: "Module"
          , children:
              [ stringToNoPositionTree description
              , moduleBodyToNoPositionTree partList
              ]
          }
    , tree:
        ToString.NoPositionTree
          { name: "Module"
          , children:
              [ stringToNoPositionTree description
              , moduleBodyToNoPositionTree partList
              ]
          }
    , description: "モジュール"
    }
  Evaluate.Description description ->
    { type:
        ToString.NoPositionTree
          { name: "Description"
          , children: []
          }
    , value:
        ToString.NoPositionTree
          { name: "Description"
          , children: [ stringToNoPositionTree description ]
          }
    , tree:
        ToString.NoPositionTree
          { name: "Description"
          , children: [ stringToNoPositionTree description ]
          }
    , description: "なにかの説明文"
    }
  Evaluate.ModuleBody partList ->
    { type:
        ToString.NoPositionTree
          { name: "ModuleBody"
          , children: []
          }
    , value: moduleBodyToNoPositionTree partList
    , tree: moduleBodyToNoPositionTree partList
    , description: "モジュール本体"
    }
  Evaluate.Part part ->
    { type:
        ToString.NoPositionTree
          { name: "Part"
          , children: []
          }
    , value: partialPartToNoPositionTree part
    , tree: partialPartToNoPositionTree part
    , description: "パーツの定義"
    }
  Evaluate.Expr value ->
    { type:
        ToString.NoPositionTree
          { name: "Expr"
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
            { name: "EvaluateExprResult"
            , children:
                [ stringToNoPositionTree (UInt.toString value)
                , ToString.NoPositionTree
                    { name:
                        if dummy then
                          "True"
                        else
                          "False"
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
          { name: "UIntLiteral"
          , children: []
          }
    , value:
        maybeToNoPositionTree
          (Prelude.map (\v -> stringToNoPositionTree (UInt.toString v)) uintLiteral)
    , tree:
        maybeToNoPositionTree
          (Prelude.map (\v -> stringToNoPositionTree (UInt.toString v)) uintLiteral)
    , description: "自然数リテラル"
    }
  Evaluate.Identifier identifier ->
    { type:
        ToString.NoPositionTree
          { name: "Identifier"
          , children: []
          }
    , value:
        maybeToNoPositionTree
          ( Prelude.map
              ( \v ->
                  stringToNoPositionTree
                    (Identifier.identifierToString v)
              )
              identifier
          )
    , tree:
        maybeToNoPositionTree
          ( Prelude.map
              ( \v ->
                  stringToNoPositionTree
                    (Identifier.identifierToString v)
              )
              identifier
          )
    , description: "識別子"
    }

stringToNoPositionTree :: String -> ToString.NoPositionTree
stringToNoPositionTree str =
  ToString.NoPositionTree
    { name: str
    , children: []
    }

moduleBodyToNoPositionTree :: Array Evaluate.PartialPart -> ToString.NoPositionTree
moduleBodyToNoPositionTree moduleBody =
  ToString.NoPositionTree
    { name: "ModuleBody"
    , children: Prelude.map partialPartToNoPositionTree moduleBody
    }

partialPartToNoPositionTree :: Evaluate.PartialPart -> ToString.NoPositionTree
partialPartToNoPositionTree (Evaluate.PartialPart { name, description, expr }) =
  ToString.NoPositionTree
    { name: "Part"
    , children:
        [ maybeToNoPositionTree
            ( Prelude.map
                ( \nonEmpty ->
                    ToString.NoPositionTree
                      { name: Identifier.identifierToString nonEmpty
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
      { name: "Add"
      , children:
          [ maybeToNoPositionTree
              (Prelude.map partialExprToNoPositionTree a)
          , maybeToNoPositionTree
              (Prelude.map partialExprToNoPositionTree b)
          ]
      }
  Evaluate.ExprPartReference { name } ->
    ToString.NoPositionTree
      { name: Identifier.identifierToString name
      , children: []
      }
  Evaluate.ExprPartReferenceInvalidName { name } ->
    ToString.NoPositionTree
      { name: name, children: [] }
  Evaluate.ExprUIntLiteral uintMaybe ->
    ToString.NoPositionTree
      { name: "UIntLiteral"
      , children:
          [ maybeToNoPositionTree
              (Prelude.map (\v -> stringToNoPositionTree (UInt.toString v)) uintMaybe)
          ]
      }

partialExprToDescription :: Evaluate.PartialModule -> Evaluate.PartialExpr -> String
partialExprToDescription partialModule = case _ of
  Evaluate.ExprAdd {} -> "組み込みの足し算"
  Evaluate.ExprPartReference { name } -> case Evaluate.findPart partialModule name of
    Just (Evaluate.PartialPart { description }) -> description
    Nothing -> "不明なパーツの参照"
  Evaluate.ExprPartReferenceInvalidName _ -> "パーツの参照 識別子としてエラー"
  Evaluate.ExprUIntLiteral _ -> "自然数リテラル"

maybeToNoPositionTree :: Maybe ToString.NoPositionTree -> ToString.NoPositionTree
maybeToNoPositionTree = case _ of
  Just value ->
    ToString.NoPositionTree
      { name: "Just"
      , children: [ value ]
      }
  Nothing ->
    ToString.NoPositionTree
      { name: "Nothing"
      , children: []
      }
