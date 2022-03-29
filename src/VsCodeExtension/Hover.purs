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
getHoverData position (Evaluate.EvaluatedTree { name, nameRange, range, item, children }) =
  if Range.isPositionInsideRange nameRange position then
    let
      hoverTree = evaluatedItemToHoverTree name item
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
            , range: range
            }
        )
  else
    Array.findMap (\(Evaluate.EvaluatedTreeChild { child }) -> getHoverData position child) children

evaluatedItemToHoverTree ::
  NonEmptyString ->
  Evaluate.EvaluatedItem ->
  { type :: ToString.NoPositionTree
  , value :: ToString.NoPositionTree
  , tree :: ToString.NoPositionTree
  }
evaluatedItemToHoverTree name = case _ of
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
        maybeToNoPositionTree
          (Prelude.map (\v -> stringToNoPositionTree (UInt.toString v)) value)
    , tree:
        ToString.NoPositionTree
          { name: name, children: [] }
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
partialPartToNoPositionTree (Evaluate.PartialPart { name, description, value }) =
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
            (Prelude.map (\v -> stringToNoPositionTree (UInt.toString v)) value)
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
