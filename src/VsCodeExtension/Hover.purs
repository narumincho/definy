module VsCodeExtension.Hover
  ( Hover(..)
  , getHoverData
  ) where

import Data.Maybe (Maybe(..))
import Data.String.NonEmpty as NonEmptyString
import Data.UInt as UInt
import Definy.Identifier as Identifier
import Float as Float
import Markdown as Markdown
import Prelude as Prelude
import Type.Proxy (Proxy(..))
import Util as Util
import VsCodeExtension.BuiltIn as BuiltIn
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
              { contents: hoverTreeToMarkdown hoverTree
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

newtype HoverTree
  = HoverTree
  { type :: ToString.NoPositionTree
  , value :: ToString.NoPositionTree
  , valueDummy :: Boolean
  , description :: Markdown.Markdown
  }

hoverTreeToMarkdown :: HoverTree -> Markdown.Markdown
hoverTreeToMarkdown (HoverTree rec) =
  Markdown.join
    [ rec.description
    , Markdown.Markdown
        [ Markdown.Header2 (NonEmptyString.nes (Proxy :: Proxy "Type"))
        , Markdown.CodeBlock
            (ToString.noPositionTreeToString rec.type)
        , Markdown.Header2 (NonEmptyString.nes (Proxy :: Proxy "Value"))
        ]
    , Markdown.Markdown
        ( if rec.valueDummy then
            [ Markdown.Italic (NonEmptyString.nes (Proxy :: Proxy "dummy data")) ]
          else
            []
        )
    , Markdown.Markdown
        [ Markdown.CodeBlock
            (ToString.noPositionTreeRootToString rec.value)
        ]
    ]

evaluatedItemToHoverTree ::
  { item :: Evaluate.EvaluatedItem
  , partialModule :: Evaluate.PartialModule
  } ->
  HoverTree
evaluatedItemToHoverTree { item, partialModule } = case item of
  Evaluate.Module (Evaluate.PartialModule { description, partList }) ->
    HoverTree
      { type:
          ToString.NoPositionTree
            { name: "Module"
            , children: []
            }
      , value:
          ToString.NoPositionTree
            { name: "Module"
            , children:
                [ ToString.noPositionTreeEmptyChildren description
                , moduleBodyToNoPositionTree partList
                ]
            }
      , valueDummy: false
      , description:
          Markdown.Markdown
            [ Markdown.Paragraph
                (BuiltIn.buildInGetDescription BuiltIn.moduleBuiltIn)
            ]
      }
  Evaluate.Description description ->
    HoverTree
      { type:
          ToString.NoPositionTree
            { name: "Description"
            , children: []
            }
      , value:
          ToString.NoPositionTree
            { name: "Description"
            , children: [ ToString.noPositionTreeEmptyChildren description ]
            }
      , valueDummy: false
      , description:
          Markdown.Markdown
            [ Markdown.Paragraph
                (NonEmptyString.nes (Proxy :: Proxy "説明文"))
            ]
      }
  Evaluate.ModuleBody partList ->
    HoverTree
      { type:
          ToString.NoPositionTree
            { name: "ModuleBody"
            , children: []
            }
      , value: moduleBodyToNoPositionTree partList
      , valueDummy: false
      , description:
          Markdown.Markdown
            [ Markdown.Paragraph
                (BuiltIn.buildInGetDescription BuiltIn.bodyBuiltIn)
            ]
      }
  Evaluate.Part part ->
    HoverTree
      { type:
          ToString.NoPositionTree
            { name: "Part"
            , children: []
            }
      , value: partialPartToNoPositionTree part
      , valueDummy: false
      , description:
          Markdown.Markdown
            [ Markdown.Paragraph
                (BuiltIn.buildInGetDescription BuiltIn.partBuiltIn)
            ]
      }
  Evaluate.Expr value ->
    let
      (Evaluate.EvaluateExprResult { value: evaluatedValue, dummy }) =
        ( Evaluate.evaluateExpr
            value
            partialModule
        )
    in
      HoverTree
        { type:
            ToString.NoPositionTree
              { name: "Expr"
              , children:
                  [ case evaluatedValue of
                      Evaluate.ValueText _ -> ToString.noPositionTreeEmptyChildren "Text"
                      Evaluate.ValueUInt _ -> ToString.noPositionTreeEmptyChildren "UInt"
                      Evaluate.ValueFloat64 _ -> ToString.noPositionTreeEmptyChildren "Float64"
                  ]
              }
        , value:
            ToString.noPositionTreeEmptyChildren
              ( case evaluatedValue of
                  Evaluate.ValueText text -> text
                  Evaluate.ValueUInt uintValue -> UInt.toString uintValue
                  Evaluate.ValueFloat64 f64Value -> Util.numberToString f64Value
              )
        , valueDummy: dummy
        , description:
            Markdown.append
              ( Markdown.Markdown
                  ( case partialExprToDescription partialModule value of
                      Just description -> [ Markdown.Paragraph description ]
                      Nothing -> []
                  )
              )
              (partialExprValueToMarkdown evaluatedValue)
        }
  Evaluate.UIntLiteral uintLiteral ->
    HoverTree
      { type:
          ToString.NoPositionTree
            { name: "UIntLiteral"
            , children: []
            }
      , value:
          maybeToNoPositionTree
            (Prelude.map (\v -> ToString.noPositionTreeEmptyChildren (UInt.toString v)) uintLiteral)
      , valueDummy: false
      , description:
          Markdown.Markdown
            [ Markdown.Paragraph
                (NonEmptyString.nes (Proxy :: Proxy "自然数リテラル"))
            ]
      }
  Evaluate.TextLiteral text ->
    HoverTree
      { type:
          ToString.NoPositionTree
            { name: "TextLiteral"
            , children: []
            }
      , value: ToString.noPositionTreeEmptyChildren text
      , valueDummy: false
      , description:
          Markdown.Markdown
            [ Markdown.Paragraph
                (NonEmptyString.nes (Proxy :: Proxy "テキストリテラル"))
            ]
      }
  Evaluate.Float64Literal numberMaybe ->
    HoverTree
      { type:
          ToString.NoPositionTree
            { name: "Float64Literal"
            , children: []
            }
      , value:
          maybeToNoPositionTree
            ( Prelude.map
                (\num -> ToString.noPositionTreeEmptyChildren (Util.numberToString num))
                numberMaybe
            )
      , valueDummy: false
      , description:
          Markdown.Markdown
            [ Markdown.Paragraph
                (NonEmptyString.nes (Proxy :: Proxy "64bit 浮動小数点数リテラル"))
            ]
      }
  Evaluate.Identifier identifier ->
    HoverTree
      { type:
          ToString.NoPositionTree
            { name: "Identifier"
            , children: []
            }
      , value:
          maybeToNoPositionTree
            ( Prelude.map
                ( \v ->
                    ToString.noPositionTreeEmptyChildren
                      (Identifier.identifierToString v)
                )
                identifier
            )
      , valueDummy: false
      , description:
          Markdown.Markdown
            [ Markdown.Paragraph
                (NonEmptyString.nes (Proxy :: Proxy "識別子"))
            ]
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
        , ToString.noPositionTreeEmptyChildren description
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
              (Prelude.map (\v -> ToString.noPositionTreeEmptyChildren (UInt.toString v)) uintMaybe)
          ]
      }
  Evaluate.ExprFloat64Literal numberMaybe ->
    ToString.NoPositionTree
      { name: "Float64Literal"
      , children:
          [ maybeToNoPositionTree
              (Prelude.map (\v -> ToString.noPositionTreeEmptyChildren (Util.numberToString v)) numberMaybe)
          ]
      }
  Evaluate.ExprTextLiteral text ->
    ToString.NoPositionTree
      { name: "Text"
      , children:
          [ ToString.noPositionTreeEmptyChildren text ]
      }

partialExprToDescription :: Evaluate.PartialModule -> Evaluate.PartialExpr -> Maybe NonEmptyString.NonEmptyString
partialExprToDescription partialModule = case _ of
  Evaluate.ExprAdd {} -> Just (BuiltIn.buildInGetDescription BuiltIn.addBuiltIn)
  Evaluate.ExprPartReference { name } -> case Evaluate.findPart partialModule name of
    Just (Evaluate.PartialPart { description }) -> NonEmptyString.fromString description
    Nothing -> Just (NonEmptyString.nes (Proxy :: Proxy "不明なパーツの参照"))
  Evaluate.ExprPartReferenceInvalidName _ -> Just (NonEmptyString.nes (Proxy :: Proxy "パーツの参照 識別子としてエラー"))
  Evaluate.ExprUIntLiteral _ -> Just (BuiltIn.buildInGetDescription BuiltIn.uintBuiltIn)
  Evaluate.ExprFloat64Literal _ -> Just (BuiltIn.buildInGetDescription BuiltIn.float64BuiltIn)
  Evaluate.ExprTextLiteral _ -> Just (BuiltIn.buildInGetDescription BuiltIn.textBuiltIn)

partialExprValueToMarkdown :: Evaluate.Value -> Markdown.Markdown
partialExprValueToMarkdown value =
  Markdown.Markdown
    ( case value of
        Evaluate.ValueText text -> case NonEmptyString.fromString text of
          Just nonEmpty -> [ Markdown.Paragraph nonEmpty ]
          Nothing -> []
        Evaluate.ValueUInt uintValue -> case NonEmptyString.fromString (UInt.toString uintValue) of
          Just nonEmpty -> [ Markdown.Paragraph nonEmpty ]
          Nothing -> []
        Evaluate.ValueFloat64 f64Value -> case NonEmptyString.fromString
            ( Float.float64RawDataToString
                (Float.numberToFloatRawData f64Value)
            ) of
          Just nonEmpty -> [ Markdown.Paragraph nonEmpty ]
          Nothing -> []
    )

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
