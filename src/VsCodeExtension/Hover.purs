module VsCodeExtension.Hover
  ( Hover(..)
  , getHoverData
  ) where

import Data.Array as Array
import Data.Maybe (Maybe(..))
import Data.String.NonEmpty (NonEmptyString)
import Data.String.NonEmpty as NonEmptyString
import Data.UInt as UInt
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
    Just
      ( Hover
          { contents:
              Markdown.Markdown
                [ Markdown.Header2 (NonEmptyString.nes (Proxy :: Proxy "Type"))
                , Markdown.CodeBlock "..."
                , Markdown.Header2 (NonEmptyString.nes (Proxy :: Proxy "Value"))
                , Markdown.CodeBlock "..."
                , Markdown.Header2 (NonEmptyString.nes (Proxy :: Proxy "Tree"))
                , Markdown.CodeBlock
                    ( ToString.noPositionTreeToString
                        (evaluatedItemToHoverTree name item)
                    )
                ]
          , range: range
          }
      )
  else
    Array.findMap (\(Evaluate.EvaluatedTreeChild { child }) -> getHoverData position child) children

evaluatedItemToHoverTree :: NonEmptyString -> Evaluate.EvaluatedItem -> ToString.NoPositionTree
evaluatedItemToHoverTree name = case _ of
  Evaluate.Module (Evaluate.PartialModule { description, partList }) ->
    ToString.NoPositionTree
      { name: NonEmptyString.nes (Proxy :: Proxy "Module")
      , children:
          [ stringToNoPositionTree description
          , moduleBodyToNoPositionTree partList
          ]
      }
  Evaluate.Description description ->
    ToString.NoPositionTree
      { name: NonEmptyString.nes (Proxy :: Proxy "Description")
      , children: [ stringToNoPositionTree description ]
      }
  Evaluate.ModuleBody partList -> moduleBodyToNoPositionTree partList
  Evaluate.Part part -> partialPartToNoPositionTree part
  Evaluate.Expr value ->
    ToString.NoPositionTree
      { name: NonEmptyString.nes (Proxy :: Proxy "Expr")
      , children:
          [ ToString.NoPositionTree
              { name: name, children: [] }
          , maybeToNoPositionTree
              (Prelude.map (\v -> stringToNoPositionTree (UInt.toString v)) value)
          ]
      }
  Evaluate.UIntLiteral uintLiteral ->
    ToString.NoPositionTree
      { name: NonEmptyString.nes (Proxy :: Proxy "UIntLiteral")
      , children:
          [ maybeToNoPositionTree
              (Prelude.map (\v -> stringToNoPositionTree (UInt.toString v)) uintLiteral)
          ]
      }
  Evaluate.Unknown ->
    ToString.NoPositionTree
      { name: NonEmptyString.nes (Proxy :: Proxy "Unknown")
      , children: []
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
                      { name: nonEmpty, children: [] }
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
