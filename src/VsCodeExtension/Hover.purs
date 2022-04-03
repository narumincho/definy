module VsCodeExtension.Hover
  ( Hover(..)
  , getHoverData
  ) where

import Data.Array as Array
import Data.Maybe (Maybe(..))
import Data.String.NonEmpty (NonEmptyString)
import Data.String.NonEmpty as NonEmptyString
import Data.UInt as UInt
import Definy.Identifier as Identifier
import Markdown as Markdown
import Prelude as Prelude
import Type.Proxy (Proxy(..))
import VsCodeExtension.Evaluate as Evaluate
import VsCodeExtension.Range as Range
import VsCodeExtension.ToString as ToString

newtype Hover
  = Hover { contents :: Markdown.Markdown, range :: Range.Range }

getHoverData ::
  Range.Position ->
  Evaluate.EvaluatedTree ->
  Maybe Hover
getHoverData position tree@(Evaluate.EvaluatedTree { item, range }) = case item of
  Evaluate.Module partialModule -> getHoverDataLoop { position, tree, partialModule }
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

getHoverDataLoop ::
  { position :: Range.Position
  , tree :: Evaluate.EvaluatedTree
  , partialModule :: Evaluate.PartialModule
  } ->
  Maybe Hover
getHoverDataLoop { position, tree: Evaluate.EvaluatedTree { name, nameRange, item, children }, partialModule } =
  if Range.isPositionInsideRange nameRange position then
    let
      hoverTree = evaluatedItemToHoverTree { name, item, partialModule }
    in
      Just
        ( Hover
            { contents:
                Markdown.Markdown
                  [ Markdown.Header2 (NonEmptyString.nes (Proxy :: Proxy "Type"))
                  , Markdown.CodeBlock
                      (ToString.noPositionTreeToString hoverTree.type)
                  , Markdown.Header2 (NonEmptyString.nes (Proxy :: Proxy "Value"))
                  , Markdown.CodeBlock
                      (ToString.noPositionTreeToString hoverTree.value)
                  , Markdown.Header2 (NonEmptyString.nes (Proxy :: Proxy "Tree"))
                  , Markdown.CodeBlock
                      (ToString.noPositionTreeToString hoverTree.tree)
                  ]
            , range: nameRange
            }
        )
  else
    Array.findMap
      ( \(Evaluate.EvaluatedTreeChild { child }) ->
          getHoverDataLoop { position, tree: child, partialModule }
      )
      children

evaluatedItemToHoverTree ::
  { name :: NonEmptyString
  , item :: Evaluate.EvaluatedItem
  , partialModule :: Evaluate.PartialModule
  } ->
  { type :: ToString.NoPositionTree
  , value :: ToString.NoPositionTree
  , tree :: ToString.NoPositionTree
  }
evaluatedItemToHoverTree { name, item, partialModule } = case item of
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
    }
  Evaluate.ModuleBody partList ->
    { type:
        ToString.NoPositionTree
          { name: NonEmptyString.nes (Proxy :: Proxy "ModuleBody")
          , children: []
          }
    , value: moduleBodyToNoPositionTree partList
    , tree: moduleBodyToNoPositionTree partList
    }
  Evaluate.Part part ->
    { type:
        ToString.NoPositionTree
          { name: NonEmptyString.nes (Proxy :: Proxy "Part")
          , children: []
          }
    , value: partialPartToNoPositionTree part
    , tree: partialPartToNoPositionTree part
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
        ToString.NoPositionTree
          { name: name, children: [] }
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
        ToString.NoPositionTree
          { name: name, children: [] }
    }
  Evaluate.Unknown ->
    { type:
        ToString.NoPositionTree
          { name: NonEmptyString.nes (Proxy :: Proxy "Unknown")
          , children: []
          }
    , value: maybeToNoPositionTree Nothing
    , tree:
        ToString.NoPositionTree
          { name: name, children: [] }
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
  Evaluate.ExprUIntLiteral uintMaybe ->
    ToString.NoPositionTree
      { name: NonEmptyString.nes (Proxy :: Proxy "UIntLiteral")
      , children:
          [ maybeToNoPositionTree
              (Prelude.map (\v -> stringToNoPositionTree (UInt.toString v)) uintMaybe)
          ]
      }

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
