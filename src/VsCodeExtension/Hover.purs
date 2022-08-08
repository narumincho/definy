module VsCodeExtension.Hover
  ( Hover(..)
  , getHoverData
  ) where

import Data.Array as Array
import Data.Array.NonEmpty as NonEmptyArray
import Data.Maybe (Maybe(..))
import Data.String as String
import Data.String.NonEmpty as NonEmptyString
import Data.UInt as UInt
import Definy.Identifier as Identifier
import Float as Float
import Markdown as Markdown
import Prelude as Prelude
import Type.Proxy (Proxy(..))
import Util as Util
import VsCodeExtension.BuiltIn as BuiltIn
import VsCodeExtension.Command as Command
import VsCodeExtension.Evaluate as Evaluate
import VsCodeExtension.EvaluatedItem as EvaluatedItem
import VsCodeExtension.EvaluatedTreeIndex as EvaluatedTreeIndex
import VsCodeExtension.NoPositionTree as NoPositionTree
import VsCodeExtension.Range as Range
import VsCodeExtension.ToString as ToString

newtype Hover
  = Hover { contents :: Markdown.Markdown, range :: Range.Range }

getHoverData ::
  Range.Position ->
  Evaluate.EvaluatedTree ->
  Maybe Hover
getHoverData position tree@(Evaluate.EvaluatedTree { item, range }) = case item of
  EvaluatedItem.Module partialModule -> case EvaluatedTreeIndex.getEvaluatedItem position tree of
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
  { type :: NoPositionTree.NoPositionTree
  , value :: NoPositionTree.NoPositionTree
  , valueDummy :: Boolean
  , evaluatedValue :: Maybe Evaluate.Value
  , description :: Markdown.Markdown
  , valueDetail :: Markdown.Markdown
  }

hoverTreeToMarkdown :: HoverTree -> Markdown.Markdown
hoverTreeToMarkdown (HoverTree rec) =
  Markdown.join
    [ rec.description
    , Markdown.Markdown
        [ Markdown.ListItem (NonEmptyString.nes (Proxy :: Proxy "type"))
        , Markdown.CodeBlock
            (ToString.noPositionTreeToString rec.type)
        , Markdown.ListItem (NonEmptyString.nes (Proxy :: Proxy "value"))
        ]
    , Markdown.Markdown
        ( if rec.valueDummy then
            [ Markdown.ParagraphWithLineBlock
                ( NonEmptyArray.singleton
                    (Markdown.Italic (NonEmptyString.nes (Proxy :: Proxy "dummy data")))
                )
            ]
          else
            []
        )
    , Markdown.Markdown
        [ Markdown.CodeBlock
            (ToString.noPositionTreeToString rec.value)
        ]
    , rec.valueDetail
    , case rec.evaluatedValue of
        Just e -> evaluatedTextOpenAsNewFile e
        Nothing -> Markdown.Markdown []
    ]

evaluatedItemToHoverTree ::
  { item :: EvaluatedItem.EvaluatedItem
  , partialModule :: EvaluatedItem.PartialModule
  } ->
  HoverTree
evaluatedItemToHoverTree { item, partialModule } = case item of
  EvaluatedItem.Module (EvaluatedItem.PartialModule { description, partOrTypePartList }) ->
    HoverTree
      { type:
          NoPositionTree.NoPositionTree
            { name: "Module"
            , children: []
            }
      , value:
          NoPositionTree.NoPositionTree
            { name: "Module"
            , children:
                [ NoPositionTree.noPositionTreeEmptyChildren description
                , moduleBodyToNoPositionTree partOrTypePartList
                ]
            }
      , valueDummy: false
      , evaluatedValue: Nothing
      , description:
          Markdown.Markdown
            [ Markdown.Paragraph
                (BuiltIn.buildInGetDescription BuiltIn.moduleBuiltIn)
            ]
      , valueDetail: Markdown.Markdown []
      }
  EvaluatedItem.Description description ->
    HoverTree
      { type:
          NoPositionTree.noPositionTreeEmptyChildren "Description"
      , value:
          NoPositionTree.NoPositionTree
            { name: "Description"
            , children: [ NoPositionTree.noPositionTreeEmptyChildren description ]
            }
      , valueDummy: false
      , evaluatedValue: Nothing
      , description:
          Markdown.Markdown
            [ Markdown.Paragraph
                (NonEmptyString.nes (Proxy :: Proxy "説明文"))
            ]
      , valueDetail: Markdown.Markdown []
      }
  EvaluatedItem.ModuleBody partList ->
    HoverTree
      { type:
          NoPositionTree.noPositionTreeEmptyChildren "ModuleBody"
      , value: moduleBodyToNoPositionTree partList
      , valueDummy: false
      , evaluatedValue: Nothing
      , description:
          Markdown.Markdown
            [ Markdown.Paragraph
                (BuiltIn.buildInGetDescription BuiltIn.bodyBuiltIn)
            ]
      , valueDetail: Markdown.Markdown []
      }
  EvaluatedItem.Part part ->
    HoverTree
      { type:
          NoPositionTree.noPositionTreeEmptyChildren "Part"
      , value: partialPartToNoPositionTree part
      , valueDummy: false
      , evaluatedValue: Nothing
      , description:
          Markdown.Markdown
            [ Markdown.Paragraph
                (BuiltIn.buildInGetDescription BuiltIn.partBuiltIn)
            ]
      , valueDetail: Markdown.Markdown []
      }
  EvaluatedItem.Type typePart ->
    HoverTree
      { type:
          NoPositionTree.noPositionTreeEmptyChildren "Type"
      , value: partialTypeToNoPositionTree typePart
      , valueDummy: false
      , evaluatedValue: Nothing
      , description:
          Markdown.Markdown
            [ Markdown.Paragraph
                (BuiltIn.buildInGetDescription BuiltIn.typeBuiltIn)
            ]
      , valueDetail: Markdown.Markdown []
      }
  EvaluatedItem.Expr value ->
    let
      (Evaluate.EvaluateExprResult { value: evaluatedValue, dummy }) =
        ( Evaluate.evaluateExpr
            value
            partialModule
        )
    in
      HoverTree
        { type:
            NoPositionTree.NoPositionTree
              { name: "Expr"
              , children:
                  [ case evaluatedValue of
                      Evaluate.ValueText _ -> NoPositionTree.noPositionTreeEmptyChildren "Text"
                      Evaluate.ValueNonEmptyText _ -> NoPositionTree.noPositionTreeEmptyChildren "ValueNonEmptyText"
                      Evaluate.ValueUInt _ -> NoPositionTree.noPositionTreeEmptyChildren "UInt"
                      Evaluate.ValueFloat64 _ -> NoPositionTree.noPositionTreeEmptyChildren "Float64"
                      Evaluate.ValueList _ -> NoPositionTree.noPositionTreeEmptyChildren "List"
                      Evaluate.ValuePattern _ -> NoPositionTree.noPositionTreeEmptyChildren "Pattern"
                  ]
              }
        , value: valueToValueTree evaluatedValue
        , valueDummy: dummy
        , evaluatedValue: Just evaluatedValue
        , description:
            Markdown.Markdown
              ( case partialExprToDescription partialModule value of
                  Just description -> [ Markdown.Paragraph description ]
                  Nothing -> []
              )
        , valueDetail: valueToValueMarkdown evaluatedValue
        }
  EvaluatedItem.UIntLiteral uintLiteral ->
    HoverTree
      { type:
          NoPositionTree.NoPositionTree
            { name: "UIntLiteral"
            , children: []
            }
      , value:
          maybeToNoPositionTree
            (Prelude.map (\v -> NoPositionTree.noPositionTreeEmptyChildren (UInt.toString v)) uintLiteral)
      , valueDummy: false
      , evaluatedValue: Nothing
      , description:
          Markdown.Markdown
            [ Markdown.Paragraph
                (NonEmptyString.nes (Proxy :: Proxy "自然数リテラル"))
            ]
      , valueDetail: Markdown.Markdown []
      }
  EvaluatedItem.TextLiteral text ->
    HoverTree
      { type:
          NoPositionTree.noPositionTreeEmptyChildren "TextLiteral"
      , value: NoPositionTree.noPositionTreeEmptyChildren text
      , valueDummy: false
      , evaluatedValue: Just (Evaluate.ValueText text)
      , description:
          Markdown.Markdown
            [ Markdown.Paragraph
                (NonEmptyString.nes (Proxy :: Proxy "テキストリテラル"))
            ]
      , valueDetail: Markdown.Markdown []
      }
  EvaluatedItem.NonEmptyTextLiteral text ->
    HoverTree
      { type:
          NoPositionTree.NoPositionTree
            { name: "NonEmptyTextLiteral"
            , children: []
            }
      , value:
          maybeToNoPositionTree
            ( Prelude.map
                (\t -> NoPositionTree.noPositionTreeEmptyChildren (NonEmptyString.toString t))
                text
            )
      , valueDummy: false
      , evaluatedValue: Prelude.map Evaluate.ValueNonEmptyText text
      , description:
          Markdown.Markdown
            [ Markdown.Paragraph
                (NonEmptyString.nes (Proxy :: Proxy "空ではないテキストリテラル"))
            ]
      , valueDetail: Markdown.Markdown []
      }
  EvaluatedItem.Float64Literal numberMaybe ->
    HoverTree
      { type:
          NoPositionTree.NoPositionTree
            { name: "Float64Literal"
            , children: []
            }
      , value:
          maybeToNoPositionTree
            ( Prelude.map
                (\num -> NoPositionTree.noPositionTreeEmptyChildren (Util.numberToString num))
                numberMaybe
            )
      , valueDummy: false
      , evaluatedValue: Nothing
      , description:
          Markdown.Markdown
            [ Markdown.Paragraph
                (NonEmptyString.nes (Proxy :: Proxy "64bit 浮動小数点数リテラル"))
            ]
      , valueDetail: Markdown.Markdown []
      }
  EvaluatedItem.Identifier { identifier, isUppercase } ->
    HoverTree
      { type:
          NoPositionTree.NoPositionTree
            { name: "Identifier"
            , children: []
            }
      , value:
          maybeToNoPositionTree
            ( Prelude.map
                ( \v ->
                    NoPositionTree.noPositionTreeEmptyChildren
                      (Identifier.identifierToString isUppercase v)
                )
                identifier
            )
      , valueDummy: false
      , evaluatedValue: Nothing
      , description:
          Markdown.Markdown
            [ Markdown.Paragraph
                (NonEmptyString.nes (Proxy :: Proxy "識別子"))
            ]
      , valueDetail: Markdown.Markdown []
      }

moduleBodyToNoPositionTree :: Array EvaluatedItem.PartialPartOrTypePart -> NoPositionTree.NoPositionTree
moduleBodyToNoPositionTree moduleBody =
  NoPositionTree.NoPositionTree
    { name: "ModuleBody"
    , children: Prelude.map partialPartOrTypePartToNoPositionTree moduleBody
    }

partialPartToNoPositionTree :: EvaluatedItem.PartialPart -> NoPositionTree.NoPositionTree
partialPartToNoPositionTree (EvaluatedItem.PartialPart { name, description, expr }) =
  NoPositionTree.NoPositionTree
    { name: "Part"
    , children:
        [ maybeToNoPositionTree
            ( Prelude.map
                ( \nonEmpty ->
                    NoPositionTree.noPositionTreeEmptyChildren
                      (Identifier.identifierToString false nonEmpty)
                )
                name
            )
        , NoPositionTree.noPositionTreeEmptyChildren description
        , maybeToNoPositionTree
            (Prelude.map partialExprToNoPositionTree expr)
        ]
    }

partialPartOrTypePartToNoPositionTree :: EvaluatedItem.PartialPartOrTypePart -> NoPositionTree.NoPositionTree
partialPartOrTypePartToNoPositionTree = case _ of
  EvaluatedItem.PartialPartOrTypePartPart (EvaluatedItem.PartialPart { name, description, expr }) ->
    NoPositionTree.NoPositionTree
      { name: "Part"
      , children:
          [ maybeToNoPositionTree
              ( Prelude.map
                  ( \nonEmpty ->
                      NoPositionTree.noPositionTreeEmptyChildren
                        (Identifier.identifierToString false nonEmpty)
                  )
                  name
              )
          , NoPositionTree.noPositionTreeEmptyChildren description
          , maybeToNoPositionTree
              (Prelude.map partialExprToNoPositionTree expr)
          ]
      }
  EvaluatedItem.PartialPartOrTypePartTypePart (EvaluatedItem.PartialType { name, description, expr }) ->
    NoPositionTree.NoPositionTree
      { name: "Type"
      , children:
          [ maybeToNoPositionTree
              ( Prelude.map
                  ( \nonEmpty ->
                      NoPositionTree.noPositionTreeEmptyChildren
                        (Identifier.identifierToString true nonEmpty)
                  )
                  name
              )
          , NoPositionTree.noPositionTreeEmptyChildren description
          , maybeToNoPositionTree
              (Prelude.map partialExprToNoPositionTree expr)
          ]
      }

partialTypeToNoPositionTree :: EvaluatedItem.PartialType -> NoPositionTree.NoPositionTree
partialTypeToNoPositionTree (EvaluatedItem.PartialType { name, description, expr }) =
  NoPositionTree.NoPositionTree
    { name: "Type"
    , children:
        [ maybeToNoPositionTree
            ( Prelude.map
                ( \nonEmpty ->
                    NoPositionTree.NoPositionTree
                      { name: Identifier.identifierToString true nonEmpty
                      , children: []
                      }
                )
                name
            )
        , NoPositionTree.noPositionTreeEmptyChildren description
        , maybeToNoPositionTree
            (Prelude.map partialExprToNoPositionTree expr)
        ]
    }

partialExprToNoPositionTree :: EvaluatedItem.PartialExpr -> NoPositionTree.NoPositionTree
partialExprToNoPositionTree = case _ of
  EvaluatedItem.ExprAdd { a, b } ->
    NoPositionTree.NoPositionTree
      { name: "Add"
      , children:
          [ maybeToNoPositionTree
              (Prelude.map partialExprToNoPositionTree a)
          , maybeToNoPositionTree
              (Prelude.map partialExprToNoPositionTree b)
          ]
      }
  EvaluatedItem.ExprPartReference { name } ->
    NoPositionTree.NoPositionTree
      { name: Identifier.identifierToString false name
      , children: []
      }
  EvaluatedItem.ExprPartReferenceInvalidName { name } ->
    NoPositionTree.NoPositionTree
      { name: name, children: [] }
  EvaluatedItem.ExprUIntLiteral uintMaybe ->
    NoPositionTree.NoPositionTree
      { name: "UIntLiteral"
      , children:
          [ maybeToNoPositionTree
              ( Prelude.map
                  (\v -> NoPositionTree.noPositionTreeEmptyChildren (UInt.toString v))
                  uintMaybe
              )
          ]
      }
  EvaluatedItem.ExprFloat64Literal numberMaybe ->
    NoPositionTree.NoPositionTree
      { name: "Float64Literal"
      , children:
          [ maybeToNoPositionTree
              ( Prelude.map
                  (\v -> NoPositionTree.noPositionTreeEmptyChildren (Util.numberToString v))
                  numberMaybe
              )
          ]
      }
  EvaluatedItem.ExprTextLiteral text ->
    NoPositionTree.NoPositionTree
      { name: "Text"
      , children:
          [ NoPositionTree.noPositionTreeEmptyChildren text ]
      }
  EvaluatedItem.ExprNonEmptyTextLiteral textMaybe ->
    NoPositionTree.NoPositionTree
      { name: "Text"
      , children:
          [ maybeToNoPositionTree
              ( Prelude.map
                  ( \v ->
                      NoPositionTree.noPositionTreeEmptyChildren
                        (NonEmptyString.toString v)
                  )
                  textMaybe
              )
          ]
      }
  EvaluatedItem.ExprTypeBodySum sum ->
    NoPositionTree.NoPositionTree
      { name: "TypeBodySum"
      , children:
          Prelude.map partialExprToNoPositionTree sum
      }
  EvaluatedItem.ExprPattern rec ->
    NoPositionTree.NoPositionTree
      { name: "Pattern"
      , children:
          [ maybeToNoPositionTree
              ( Prelude.map
                  ( \v ->
                      NoPositionTree.noPositionTreeEmptyChildren
                        (Identifier.identifierToString false v)
                  )
                  rec.name
              )
          , NoPositionTree.noPositionTreeEmptyChildren rec.description
          ]
      }

partialExprToDescription :: EvaluatedItem.PartialModule -> EvaluatedItem.PartialExpr -> Maybe NonEmptyString.NonEmptyString
partialExprToDescription partialModule = case _ of
  EvaluatedItem.ExprAdd {} -> Just (BuiltIn.buildInGetDescription BuiltIn.addBuiltIn)
  EvaluatedItem.ExprPartReference { name } -> case EvaluatedItem.findPart partialModule name of
    Just (EvaluatedItem.PartialPart { description }) -> NonEmptyString.fromString description
    Nothing -> Just (NonEmptyString.nes (Proxy :: Proxy "不明なパーツの参照"))
  EvaluatedItem.ExprPartReferenceInvalidName _ -> Just (NonEmptyString.nes (Proxy :: Proxy "パーツの参照 識別子としてエラー"))
  EvaluatedItem.ExprUIntLiteral _ -> Just (BuiltIn.buildInGetDescription BuiltIn.uintBuiltIn)
  EvaluatedItem.ExprFloat64Literal _ -> Just (BuiltIn.buildInGetDescription BuiltIn.float64BuiltIn)
  EvaluatedItem.ExprTextLiteral _ -> Just (BuiltIn.buildInGetDescription BuiltIn.textBuiltIn)
  EvaluatedItem.ExprNonEmptyTextLiteral _ -> Just (BuiltIn.buildInGetDescription BuiltIn.nonEmptyTextBuiltIn)
  EvaluatedItem.ExprTypeBodySum _ -> Just (BuiltIn.buildInGetDescription BuiltIn.typeBodySumBuiltIn)
  EvaluatedItem.ExprPattern _ -> Just (BuiltIn.buildInGetDescription BuiltIn.patternBuiltIn)

maybeToNoPositionTree :: Maybe NoPositionTree.NoPositionTree -> NoPositionTree.NoPositionTree
maybeToNoPositionTree = case _ of
  Just value ->
    NoPositionTree.NoPositionTree
      { name: "Just"
      , children: [ value ]
      }
  Nothing ->
    NoPositionTree.NoPositionTree
      { name: "Nothing"
      , children: []
      }

valueToValueTree :: Evaluate.Value -> NoPositionTree.NoPositionTree
valueToValueTree = case _ of
  Evaluate.ValueText text ->
    NoPositionTree.NoPositionTree
      { name: NonEmptyString.toString (BuiltIn.builtInGetName BuiltIn.textBuiltIn)
      , children: [ NoPositionTree.noPositionTreeEmptyChildren text ]
      }
  Evaluate.ValueNonEmptyText text ->
    NoPositionTree.NoPositionTree
      { name: NonEmptyString.toString (BuiltIn.builtInGetName BuiltIn.nonEmptyTextBuiltIn)
      , children: [ NoPositionTree.noPositionTreeEmptyChildren (NonEmptyString.toString text) ]
      }
  Evaluate.ValueUInt uintValue ->
    NoPositionTree.NoPositionTree
      { name: NonEmptyString.toString (BuiltIn.builtInGetName BuiltIn.uintBuiltIn)
      , children: [ NoPositionTree.noPositionTreeEmptyChildren (UInt.toString uintValue) ]
      }
  Evaluate.ValueFloat64 f64Value ->
    NoPositionTree.NoPositionTree
      { name: NonEmptyString.toString (BuiltIn.builtInGetName BuiltIn.float64BuiltIn)
      , children: [ NoPositionTree.noPositionTreeEmptyChildren (Util.numberToString f64Value) ]
      }
  Evaluate.ValueList list ->
    NoPositionTree.NoPositionTree
      { name: "list"
      , children:
          Prelude.map
            (\v -> valueToValueTree v)
            list
      }
  Evaluate.ValuePattern (Evaluate.Pattern { name, description }) ->
    NoPositionTree.NoPositionTree
      { name: NonEmptyString.toString (BuiltIn.builtInGetName BuiltIn.patternBuiltIn)
      , children:
          [ NoPositionTree.noPositionTreeEmptyChildren (Identifier.identifierToString false name)
          , NoPositionTree.noPositionTreeEmptyChildren description
          ]
      }

valueToValueMarkdown :: Evaluate.Value -> Markdown.Markdown
valueToValueMarkdown = case _ of
  Evaluate.ValueText text -> valueTextToMarkdown text
  Evaluate.ValueNonEmptyText text -> valueTextToMarkdown (NonEmptyString.toString text)
  Evaluate.ValueFloat64 f64Value ->
    let
      (Float.Float64RawData { isPositive }) = Float.numberToFloatRawData f64Value
    in
      Markdown.Markdown
        [ Markdown.CodeBlock (if isPositive then "+" else "-")
        , case NonEmptyString.fromString (Float.float64RawDataToString (Float.numberToFloatRawData f64Value)) of
            Just v -> Markdown.Paragraph v
            Nothing -> Markdown.Paragraph (NonEmptyString.nes (Proxy :: Proxy " "))
        ]
  _ -> Markdown.Markdown []

valueTextToMarkdown :: String -> Markdown.Markdown
valueTextToMarkdown text =
  let
    codePointArray = String.toCodePointArray text
  in
    Markdown.Markdown
      ( Prelude.append
          [ Markdown.Paragraph
              ( NonEmptyString.appendString
                  (NonEmptyString.nes (Proxy :: Proxy "length: "))
                  (Prelude.show (Array.length codePointArray))
              )
          ]
          ( Prelude.map
              ( \codePoint ->
                  Markdown.ListItem
                    ( Prelude.append
                        ( NonEmptyString.fromNonEmptyCodePointArray
                            (NonEmptyArray.singleton codePoint)
                        )
                        ( NonEmptyString.appendString
                            (NonEmptyString.nes (Proxy :: Proxy " "))
                            (Prelude.show codePoint)
                        )
                    )
              )
              codePointArray
          )
      )

evaluatedTextOpenAsNewFile :: Evaluate.Value -> Markdown.Markdown
evaluatedTextOpenAsNewFile evaluatedValue =
  Markdown.Markdown
    ( case evaluatedValue of
        Evaluate.ValueText text ->
          [ Markdown.ParagraphWithLineBlock
              ( NonEmptyArray.singleton
                  ( Markdown.LinkVSCodeCommand
                      ( NonEmptyArray.singleton
                          ( Markdown.PlanText
                              ( NonEmptyString.nes (Proxy :: Proxy "評価結果を新しいエディタで開く")
                              )
                          )
                      )
                      (Command.definyOpenTextFileWithParameterUrl text)
                  )
              )
          ]
        _ -> []
    )
