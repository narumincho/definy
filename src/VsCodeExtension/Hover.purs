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
  { type :: ToString.NoPositionTree
  , value :: ToString.NoPositionTree
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
            (ToString.noPositionTreeRootToString rec.value)
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
  EvaluatedItem.Module (EvaluatedItem.PartialModule { description, partList }) ->
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
          ToString.NoPositionTree
            { name: "ModuleBody"
            , children: []
            }
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
          ToString.NoPositionTree
            { name: "Part"
            , children: []
            }
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
          ToString.NoPositionTree
            { name: "Type"
            , children: []
            }
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
            ToString.NoPositionTree
              { name: "Expr"
              , children:
                  [ case evaluatedValue of
                      Evaluate.ValueText _ -> ToString.noPositionTreeEmptyChildren "Text"
                      Evaluate.ValueNonEmptyText _ -> ToString.noPositionTreeEmptyChildren "ValueNonEmptyText"
                      Evaluate.ValueUInt _ -> ToString.noPositionTreeEmptyChildren "UInt"
                      Evaluate.ValueFloat64 _ -> ToString.noPositionTreeEmptyChildren "Float64"
                      Evaluate.ValueTypeBody _ -> ToString.noPositionTreeEmptyChildren "TypeBody"
                      Evaluate.ValuePattern _ -> ToString.noPositionTreeEmptyChildren "Pattern"
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
          ToString.NoPositionTree
            { name: "UIntLiteral"
            , children: []
            }
      , value:
          maybeToNoPositionTree
            (Prelude.map (\v -> ToString.noPositionTreeEmptyChildren (UInt.toString v)) uintLiteral)
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
          ToString.NoPositionTree
            { name: "TextLiteral"
            , children: []
            }
      , value: ToString.noPositionTreeEmptyChildren text
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
          ToString.NoPositionTree
            { name: "NonEmptyTextLiteral"
            , children: []
            }
      , value:
          maybeToNoPositionTree
            ( Prelude.map
                (\t -> ToString.noPositionTreeEmptyChildren (NonEmptyString.toString t))
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
      , evaluatedValue: Nothing
      , description:
          Markdown.Markdown
            [ Markdown.Paragraph
                (NonEmptyString.nes (Proxy :: Proxy "64bit 浮動小数点数リテラル"))
            ]
      , valueDetail: Markdown.Markdown []
      }
  EvaluatedItem.Identifier identifier ->
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
      , evaluatedValue: Nothing
      , description:
          Markdown.Markdown
            [ Markdown.Paragraph
                (NonEmptyString.nes (Proxy :: Proxy "識別子"))
            ]
      , valueDetail: Markdown.Markdown []
      }

moduleBodyToNoPositionTree :: Array EvaluatedItem.PartialPart -> ToString.NoPositionTree
moduleBodyToNoPositionTree moduleBody =
  ToString.NoPositionTree
    { name: "ModuleBody"
    , children: Prelude.map partialPartToNoPositionTree moduleBody
    }

partialPartToNoPositionTree :: EvaluatedItem.PartialPart -> ToString.NoPositionTree
partialPartToNoPositionTree (EvaluatedItem.PartialPart { name, description, expr }) =
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

partialTypeToNoPositionTree :: EvaluatedItem.PartialType -> ToString.NoPositionTree
partialTypeToNoPositionTree (EvaluatedItem.PartialType { name, description, expr }) =
  ToString.NoPositionTree
    { name: "Type"
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

partialExprToNoPositionTree :: EvaluatedItem.PartialExpr -> ToString.NoPositionTree
partialExprToNoPositionTree = case _ of
  EvaluatedItem.ExprAdd { a, b } ->
    ToString.NoPositionTree
      { name: "Add"
      , children:
          [ maybeToNoPositionTree
              (Prelude.map partialExprToNoPositionTree a)
          , maybeToNoPositionTree
              (Prelude.map partialExprToNoPositionTree b)
          ]
      }
  EvaluatedItem.ExprPartReference { name } ->
    ToString.NoPositionTree
      { name: Identifier.identifierToString name
      , children: []
      }
  EvaluatedItem.ExprPartReferenceInvalidName { name } ->
    ToString.NoPositionTree
      { name: name, children: [] }
  EvaluatedItem.ExprUIntLiteral uintMaybe ->
    ToString.NoPositionTree
      { name: "UIntLiteral"
      , children:
          [ maybeToNoPositionTree
              ( Prelude.map
                  (\v -> ToString.noPositionTreeEmptyChildren (UInt.toString v))
                  uintMaybe
              )
          ]
      }
  EvaluatedItem.ExprFloat64Literal numberMaybe ->
    ToString.NoPositionTree
      { name: "Float64Literal"
      , children:
          [ maybeToNoPositionTree
              ( Prelude.map
                  (\v -> ToString.noPositionTreeEmptyChildren (Util.numberToString v))
                  numberMaybe
              )
          ]
      }
  EvaluatedItem.ExprTextLiteral text ->
    ToString.NoPositionTree
      { name: "Text"
      , children:
          [ ToString.noPositionTreeEmptyChildren text ]
      }
  EvaluatedItem.ExprNonEmptyTextLiteral textMaybe ->
    ToString.NoPositionTree
      { name: "Text"
      , children:
          [ maybeToNoPositionTree
              ( Prelude.map
                  (\v -> ToString.noPositionTreeEmptyChildren (NonEmptyString.toString v))
                  textMaybe
              )
          ]
      }
  EvaluatedItem.ExprTypeBodySum sum ->
    ToString.NoPositionTree
      { name: "TypeBodySum"
      , children:
          Prelude.map partialExprToNoPositionTree sum
      }
  EvaluatedItem.ExprPattern rec ->
    ToString.NoPositionTree
      { name: "Pattern"
      , children:
          [ maybeToNoPositionTree
              ( Prelude.map
                  (\v -> ToString.noPositionTreeEmptyChildren (Identifier.identifierToString v))
                  rec.name
              )
          , ToString.noPositionTreeEmptyChildren rec.description
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

valueToValueTree :: Evaluate.Value -> ToString.NoPositionTree
valueToValueTree = case _ of
  Evaluate.ValueText text ->
    ToString.NoPositionTree
      { name: NonEmptyString.toString (BuiltIn.builtInGetName BuiltIn.textBuiltIn)
      , children: [ ToString.noPositionTreeEmptyChildren text ]
      }
  Evaluate.ValueNonEmptyText text ->
    ToString.NoPositionTree
      { name: NonEmptyString.toString (BuiltIn.builtInGetName BuiltIn.nonEmptyTextBuiltIn)
      , children: [ ToString.noPositionTreeEmptyChildren (NonEmptyString.toString text) ]
      }
  Evaluate.ValueUInt uintValue ->
    ToString.NoPositionTree
      { name: NonEmptyString.toString (BuiltIn.builtInGetName BuiltIn.uintBuiltIn)
      , children: [ ToString.noPositionTreeEmptyChildren (UInt.toString uintValue) ]
      }
  Evaluate.ValueFloat64 f64Value ->
    ToString.NoPositionTree
      { name: NonEmptyString.toString (BuiltIn.builtInGetName BuiltIn.float64BuiltIn)
      , children: [ ToString.noPositionTreeEmptyChildren (Util.numberToString f64Value) ]
      }
  Evaluate.ValueTypeBody body ->
    ToString.NoPositionTree
      { name: NonEmptyString.toString (BuiltIn.builtInGetName BuiltIn.typeBodySumBuiltIn)
      , children:
          Prelude.map
            (\pattern -> valueToValueTree (Evaluate.ValuePattern pattern))
            body
      }
  Evaluate.ValuePattern (Evaluate.Pattern { name, description }) ->
    ToString.NoPositionTree
      { name: NonEmptyString.toString (BuiltIn.builtInGetName BuiltIn.patternBuiltIn)
      , children:
          [ ToString.noPositionTreeEmptyChildren (Identifier.identifierToString name)
          , ToString.noPositionTreeEmptyChildren description
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
