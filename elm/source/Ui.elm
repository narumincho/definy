module Ui exposing
    ( AlignSelf
    , BitmapImageAttributes(..)
    , BorderRadius(..)
    , BorderStyle(..)
    , FitStyle(..)
    , ImageRendering(..)
    , Panel
    , Pointer
    , PointerImage(..)
    , Size
    , TextAlignment(..)
    , TextBoxAttributes(..)
    , VectorImageAttributes(..)
    , alignSelf
    , auto
    , backgroundColor
    , bitmapImage
    , border
    , borderRadius
    , button
    , center
    , column
    , depth
    , empty
    , end
    , fix
    , gap
    , grow
    , map
    , offset
    , overflowVisible
    , padding
    , pointerImage
    , row
    , start
    , stretch
    , styleAndEventCompute
    , textBox
    , toHtml
    , vectorImage
    )

import Bitwise
import Css
import Html.Styled
import Html.Styled.Attributes
import Html.Styled.Events
import Json.Decode
import Json.Decode.Pipeline
import VectorImage


{-| デフォルトで幅と高さが外の大きさによって決まる,パネル
-}
type Panel message
    = Panel
        { style : List Style
        , content : Content message
        }


type Content message
    = TextBox TextBoxAttributes
    | BitmapImage BitmapImageAttributes
    | VectorImage (VectorImageAttributes message)
    | Empty
    | DepthList (List (Panel message))
    | RowList (List ( Size, Panel message ))
    | ColumnList (List ( Size, Panel message ))
    | Button (ButtonAttributes message)
    | PointerPanel (PointerPanelAttributes message)


type TextBoxAttributes
    = TextBoxAttributes
        { text : String
        , typeface : String
        , size : Int
        , letterSpacing : Float
        , color : Css.Color
        , textAlignment : TextAlignment
        }


type BitmapImageAttributes
    = BitmapImageAttributes
        { url : String
        , fitStyle : FitStyle
        , alternativeText : String
        , rendering : ImageRendering
        }


type VectorImageAttributes message
    = VectorImageAttributes
        { fitStyle : FitStyle
        , viewBox : { x : Int, y : Int, width : Int, height : Int }
        , elements : List (VectorImage.Element message)
        }


type ButtonAttributes message
    = ButtonAttributes
        { clickMessage : message
        , child : Panel message
        }


type PointerPanelAttributes message
    = PointerPanelAttributes
        { enterMessage : Maybe (Pointer -> message)
        , leaveMessage : Maybe (Pointer -> message)
        , moveMessage : Maybe (Pointer -> message)
        , downMessage : Maybe (Pointer -> message)
        , child : Panel message
        }


type Size
    = Fix Int
    | Grow
    | Auto


{-| 固定サイズにする
-}
fix : Int -> Size
fix =
    Fix


{-| 親の大きさに合わせる
-}
grow : Size
grow =
    Grow


{-| 中身に合わせる
-}
auto : Size
auto =
    Auto


type AlignSelf
    = AlignSelfStretch
    | AlignSelfStart
    | AlignSelfCenter
    | AlignSelfEnd


{-| グリッドセル内で領域いっぱいに伸びる （デフォルト）
-}
stretch : AlignSelf
stretch =
    AlignSelfStretch


{-| グリッドセル内で上に寄せる
-}
start : AlignSelf
start =
    AlignSelfStart


{-| グリッドセル内で中央に寄せる
-}
center : AlignSelf
center =
    AlignSelfCenter


{-| グリッドセル内で下に寄せるg
-}
end : AlignSelf
end =
    AlignSelfEnd


{-| ポインターのイベントで受け取れるマウスの状態
-}
type Pointer
    = Pointer
        { id : Int -- 識別するためのID
        , position : ( Float, Float ) -- 要素内での位置
        , button : Maybe PointerButton -- 押したボタン。Nothingは最初のイベント以降で変更がなかったとき
        , pressure : Float -- 圧力 0～1
        , tangentialPressure : Float
        , size : ( Float, Float )
        , tilt : ( Float, Float )
        , twist : Float
        , type_ : PointerType
        , isPrimary : Bool
        , buttons : List PointerButton
        , target : Bool
        }


type PointerType
    = Mouse
    | Pen
    | Touch
    | PointerTypeUnknown String


type PointerButton
    = Primary
    | Secondary
    | Auxiliary
    | BrowserBack
    | BrowserForward
    | Eraser


{-| スタイルとイベント
-}
type StyleComputed
    = StyleComputed
        { padding : Int
        , offset : Maybe ( Int, Int )
        , overflowVisible : Bool
        , pointerImage : Maybe PointerImage
        , border : Maybe BorderStyle
        , borderRadius : BorderRadius
        , backGroundColor : Maybe Css.Color
        , gap : Int
        , alignSelf : AlignSelf
        }


type Style
    = Padding Int
    | Offset ( Int, Int )
    | OverflowVisible
    | PointerImage PointerImage
    | Border BorderStyle
    | BorderRadius BorderRadius
    | BackGroundColor Css.Color
    | Gap Int
    | AlignSelf AlignSelf


type BorderRadius
    = BorderRadiusPx Int
    | BorderRadiusPercent Int


type PointerImage
    = HorizontalResize -- ew-resize ↔
    | VerticalResize -- ns-resize ↕


type FitStyle
    = Contain
    | Cover


type ImageRendering
    = ImageRenderingPixelated
    | ImageRenderingAuto


type BorderStyle
    = BorderStyle
        { color : Css.Color
        , width :
            { top : Int
            , right : Int
            , left : Int
            , bottom : Int
            }
        }


type TextAlignment
    = TextAlignStart
    | TextAlignEnd
    | TextAlignCenter


toHtml : Panel msg -> Html.Styled.Html msg
toHtml =
    panelToHtml (GridCell { row = 0, column = 0 }) { width = Grow, height = Grow }


padding : Int -> Style
padding =
    Padding


offset : ( Int, Int ) -> Style
offset =
    Offset


overflowVisible : Style
overflowVisible =
    OverflowVisible


pointerImage : PointerImage -> Style
pointerImage =
    PointerImage


border : BorderStyle -> Style
border =
    Border


borderRadius : BorderRadius -> Style
borderRadius =
    BorderRadius


backgroundColor : Css.Color -> Style
backgroundColor =
    BackGroundColor


{-| rowやcolumnの間隔を開けることができる. デフォルトは0
-}
gap : Int -> Style
gap =
    Gap


{-| グリッドセル内での揃え方を指定できる デフォルトはStretch
-}
alignSelf : AlignSelf -> Style
alignSelf =
    AlignSelf


{-| テキストボックス
-}
textBox : List Style -> TextBoxAttributes -> Panel message
textBox style textBoxAttributes =
    Panel
        { style = style
        , content = TextBox textBoxAttributes
        }


{-| ビットマップ画像
-}
bitmapImage : List Style -> BitmapImageAttributes -> Panel message
bitmapImage style bitmapImageAttributes =
    Panel
        { style = style
        , content = BitmapImage bitmapImageAttributes
        }


{-| ベクター画像
-}
vectorImage : List Style -> VectorImageAttributes message -> Panel message
vectorImage style vectorImageAttributes =
    Panel
        { style = style
        , content = VectorImage vectorImageAttributes
        }


{-| からのパネル
-}
empty : List Style -> Panel message
empty style =
    Panel { style = style, content = Empty }


{-| ボタン
-}
button : List Style -> message -> Panel message -> Panel message
button style clickMessage child =
    Panel
        { style = style
        , content =
            Button
                (ButtonAttributes
                    { clickMessage = clickMessage
                    , child = child
                    }
                )
        }


{-| パネルを同じ領域に重ねる
-}
depth : List Style -> List (Panel message) -> Panel message
depth style children =
    Panel
        { style = style
        , content = DepthList children
        }


{-| 横方向に並べる
-}
row : List Style -> List ( Size, Panel message ) -> Panel message
row style children =
    Panel
        { style = style
        , content = RowList children
        }


{-| 縦方向に並べる
-}
column : List Style -> List ( Size, Panel message ) -> Panel message
column style children =
    Panel
        { style = style
        , content = ColumnList children
        }


styleAndEventCompute : List Style -> StyleComputed
styleAndEventCompute list =
    case list of
        x :: xs ->
            let
                (StyleComputed rest) =
                    styleAndEventCompute xs
            in
            StyleComputed
                (case x of
                    Padding int ->
                        { rest | padding = int }

                    Offset vector ->
                        { rest | offset = Just vector }

                    OverflowVisible ->
                        { rest | overflowVisible = True }

                    PointerImage pointerImage_ ->
                        { rest | pointerImage = Just pointerImage_ }

                    Border borderStyle ->
                        { rest | border = Just borderStyle }

                    BorderRadius int ->
                        { rest | borderRadius = int }

                    BackGroundColor color ->
                        { rest | backGroundColor = Just color }

                    Gap px ->
                        { rest | gap = px }

                    AlignSelf value ->
                        { rest | alignSelf = value }
                )

        [] ->
            defaultStyleAndEvent


defaultStyleAndEvent : StyleComputed
defaultStyleAndEvent =
    StyleComputed
        { padding = 0
        , offset = Nothing
        , overflowVisible = False
        , pointerImage = Nothing
        , border = Nothing
        , borderRadius = BorderRadiusPx 0
        , backGroundColor = Nothing
        , gap = 0
        , alignSelf = AlignSelfStretch
        }


map : (a -> b) -> Panel a -> Panel b
map func (Panel record) =
    Panel
        { style = record.style
        , content = mapContent func record.content
        }


mapContent : (a -> b) -> Content a -> Content b
mapContent func content =
    case content of
        TextBox textBoxAttributes ->
            TextBox textBoxAttributes

        BitmapImage bitmapImageAttributes ->
            BitmapImage bitmapImageAttributes

        VectorImage (VectorImageAttributes record) ->
            VectorImage
                (VectorImageAttributes
                    { fitStyle = record.fitStyle
                    , viewBox = record.viewBox
                    , elements = List.map (VectorImage.map func) record.elements
                    }
                )

        Empty ->
            Empty

        Button (ButtonAttributes record) ->
            Button
                (ButtonAttributes
                    { clickMessage = func record.clickMessage
                    , child = map func record.child
                    }
                )

        DepthList children ->
            DepthList (List.map (map func) children)

        RowList children ->
            RowList (List.map (Tuple.mapSecond (map func)) children)

        ColumnList children ->
            ColumnList (List.map (Tuple.mapSecond (map func)) children)

        PointerPanel (PointerPanelAttributes record) ->
            PointerPanel
                (PointerPanelAttributes
                    { enterMessage = Maybe.map (\msg pointer -> func (msg pointer)) record.enterMessage
                    , leaveMessage = Maybe.map (\msg pointer -> func (msg pointer)) record.leaveMessage
                    , moveMessage = Maybe.map (\msg pointer -> func (msg pointer)) record.moveMessage
                    , downMessage = Maybe.map (\msg pointer -> func (msg pointer)) record.downMessage
                    , child = map func record.child
                    }
                )


type alias SizeArea =
    { width : Size
    , height : Size
    }


type GridCell
    = GridCell { row : Int, column : Int }


panelToHtml : GridCell -> SizeArea -> Panel msg -> Html.Styled.Html msg
panelToHtml gridCell sizeArea (Panel record) =
    let
        styleAndEventComputed =
            styleAndEventCompute record.style
    in
    case record.content of
        TextBox textBoxAttributes ->
            textBoxToHtml gridCell sizeArea styleAndEventComputed textBoxAttributes

        BitmapImage imageFromUrlAttributes ->
            imageFromUrlToHtml gridCell sizeArea styleAndEventComputed imageFromUrlAttributes

        VectorImage vectorImageAttributes ->
            vectorImageToHtml gridCell sizeArea styleAndEventComputed vectorImageAttributes

        Empty ->
            emptyToHtml gridCell sizeArea styleAndEventComputed

        Button buttonAttributes ->
            buttonToHtml gridCell sizeArea styleAndEventComputed buttonAttributes

        DepthList depthListAttributes ->
            depthListToHtml gridCell sizeArea styleAndEventComputed depthListAttributes

        RowList rowListAttributes ->
            rowListToHtml gridCell sizeArea styleAndEventComputed rowListAttributes

        ColumnList columnListAttributes ->
            columnListToHtml gridCell sizeArea styleAndEventComputed columnListAttributes

        PointerPanel pointerPanelAttributes ->
            pointerPanelToHtml gridCell sizeArea styleAndEventComputed pointerPanelAttributes


textBoxToHtml : GridCell -> SizeArea -> StyleComputed -> TextBoxAttributes -> Html.Styled.Html message
textBoxToHtml gridCell sizeArea styleComputed (TextBoxAttributes record) =
    Html.Styled.div
        [ Html.Styled.Attributes.css
            [ styleComputedToCssStyle False styleComputed
            , Css.color record.color
            , Css.fontSize (Css.px (toFloat record.size))
            , Css.fontFamilies [ Css.qt record.typeface ]
            , Css.letterSpacing (Css.px record.letterSpacing)
            , Css.overflowWrap Css.breakWord
            , textAlignToStyle record.textAlignment
            , gridCellToCssStyle gridCell
            , Css.batch
                (case sizeArea.width of
                    Fix px ->
                        [ Css.width (Css.px (toFloat px)) ]

                    Grow ->
                        [ Css.width (Css.pct 100) ]

                    Auto ->
                        [ Css.width Css.auto ]
                )
            , Css.batch
                (case sizeArea.height of
                    Fix px ->
                        [ Css.height (Css.px (toFloat px)) ]

                    Grow ->
                        [ Css.height (Css.pct 100) ]

                    Auto ->
                        [ Css.height Css.auto ]
                )
            ]
        ]
        [ Html.Styled.text record.text ]


imageFromUrlToHtml : GridCell -> SizeArea -> StyleComputed -> BitmapImageAttributes -> Html.Styled.Html message
imageFromUrlToHtml gridCell sizeArea styleComputed (BitmapImageAttributes record) =
    Html.Styled.img
        [ Html.Styled.Attributes.css
            ([ styleComputedToCssStyle False styleComputed
             , Css.property "object-fit"
                (case record.fitStyle of
                    Contain ->
                        "contain"

                    Cover ->
                        "cover"
                )
             , Css.display Css.block
             , gridCellToCssStyle gridCell
             , Css.batch
                (case sizeArea.width of
                    Fix px ->
                        [ Css.width (Css.px (toFloat px)) ]

                    Grow ->
                        [ Css.width (Css.pct 100) ]

                    Auto ->
                        [ Css.width Css.auto ]
                )
             , Css.batch
                (case sizeArea.height of
                    Fix px ->
                        [ Css.height (Css.px (toFloat px)) ]

                    Grow ->
                        [ Css.height (Css.pct 100) ]

                    Auto ->
                        [ Css.height Css.auto ]
                )
             ]
                ++ (case record.rendering of
                        ImageRenderingAuto ->
                            []

                        ImageRenderingPixelated ->
                            [ Css.property "image-rendering" "pixelated"
                            ]
                   )
            )
        , Html.Styled.Attributes.src record.url
        , Html.Styled.Attributes.alt record.alternativeText
        ]
        []


vectorImageToHtml : GridCell -> SizeArea -> StyleComputed -> VectorImageAttributes message -> Html.Styled.Html message
vectorImageToHtml gridCell sizeArea styleComputed (VectorImageAttributes record) =
    Html.Styled.div
        [ Html.Styled.Attributes.css
            [ styleComputedToCssStyle False styleComputed
            , gridCellToCssStyle gridCell
            , Css.batch
                (case sizeArea.width of
                    Fix px ->
                        [ Css.width (Css.px (toFloat px)) ]

                    Grow ->
                        [ Css.width (Css.pct 100) ]

                    Auto ->
                        [ Css.width Css.auto ]
                )
            , Css.batch
                (case sizeArea.height of
                    Fix px ->
                        [ Css.height (Css.px (toFloat px)) ]

                    Grow ->
                        [ Css.height (Css.pct 100) ]

                    Auto ->
                        [ Css.height Css.auto ]
                )
            ]
        ]
        [ VectorImage.toHtml
            record.viewBox
            Nothing
            record.elements
        ]


emptyToHtml : GridCell -> SizeArea -> StyleComputed -> Html.Styled.Html message
emptyToHtml gridCell sizeArea styleAndEvent =
    Html.Styled.div
        [ Html.Styled.Attributes.css
            [ styleComputedToCssStyle False styleAndEvent
            , gridCellToCssStyle gridCell
            , Css.batch
                (case sizeArea.width of
                    Fix px ->
                        [ Css.width (Css.px (toFloat px)) ]

                    Grow ->
                        [ Css.width (Css.pct 100) ]

                    Auto ->
                        [ Css.width Css.zero ]
                )
            , Css.batch
                (case sizeArea.height of
                    Fix px ->
                        [ Css.height (Css.px (toFloat px)) ]

                    Grow ->
                        [ Css.height (Css.pct 100) ]

                    Auto ->
                        [ Css.height Css.zero ]
                )
            ]
        ]
        []


buttonToHtml : GridCell -> SizeArea -> StyleComputed -> ButtonAttributes message -> Html.Styled.Html message
buttonToHtml gridCell sizeArea styleComputed (ButtonAttributes record) =
    Html.Styled.button
        [ Html.Styled.Attributes.css
            [ styleComputedToCssStyle True styleComputed
            , gridCellToCssStyle gridCell
            ]
        , Html.Styled.Events.onClick
            record.clickMessage
        ]
        [ panelToHtml (GridCell { row = 0, column = 0 })
            (sizeAreaSubtractPadding sizeArea styleComputed)
            record.child
        ]


depthListToHtml :
    GridCell
    -> SizeArea
    -> StyleComputed
    -> List (Panel message)
    -> Html.Styled.Html message
depthListToHtml gridCell sizeArea styleComputed children =
    Html.Styled.div
        [ Html.Styled.Attributes.css
            [ styleComputedToCssStyle False styleComputed
            , Css.property "display" "grid"
            , Css.property "grid-template-rows" "1fr"
            , Css.property "grid-template-columns" "1fr"
            , gridCellToCssStyle gridCell
            , Css.batch
                (case sizeArea.width of
                    Fix px ->
                        [ Css.width (Css.px (toFloat px)) ]

                    Grow ->
                        [ Css.width (Css.pct 100) ]

                    Auto ->
                        [ Css.width Css.auto ]
                )
            , Css.batch
                (case sizeArea.height of
                    Fix px ->
                        [ Css.height (Css.px (toFloat px)) ]

                    Grow ->
                        [ Css.height (Css.pct 100) ]

                    Auto ->
                        [ Css.height Css.auto ]
                )
            ]
        ]
        (List.map
            (panelToHtml
                (GridCell { row = 0, column = 0 })
                (sizeAreaSubtractPadding sizeArea styleComputed)
            )
            children
        )


rowListToHtml : GridCell -> SizeArea -> StyleComputed -> List ( Size, Panel message ) -> Html.Styled.Html message
rowListToHtml gridCell sizeArea styleComputed children =
    Html.Styled.div
        [ Html.Styled.Attributes.css
            [ styleComputedToCssStyle False styleComputed
            , Css.property "display" "grid"
            , Css.property "grid-template-columns"
                (sizeListToGridTemplate
                    (List.map Tuple.first children)
                )
            , gridCellToCssStyle gridCell
            , Css.batch
                (case sizeArea.width of
                    Fix px ->
                        [ Css.width (Css.px (toFloat px)) ]

                    Grow ->
                        [ Css.width (Css.pct 100) ]

                    Auto ->
                        [ Css.width Css.auto ]
                )
            , Css.batch
                (case sizeArea.height of
                    Fix px ->
                        [ Css.height (Css.px (toFloat px)) ]

                    Grow ->
                        [ Css.height (Css.pct 100) ]

                    Auto ->
                        [ Css.height Css.auto ]
                )
            ]
        ]
        (List.indexedMap
            (\index ( size, panel ) ->
                panelToHtml
                    (GridCell { row = 0, column = index })
                    (sizeAreaSubtractPadding { width = size, height = sizeArea.height } styleComputed)
                    panel
            )
            children
        )


columnListToHtml : GridCell -> SizeArea -> StyleComputed -> List ( Size, Panel message ) -> Html.Styled.Html message
columnListToHtml gridCell sizeArea styleComputed children =
    Html.Styled.div
        [ Html.Styled.Attributes.css
            [ styleComputedToCssStyle False styleComputed
            , Css.property "display" "grid"
            , Css.property "grid-template-rows"
                (sizeListToGridTemplate
                    (List.map Tuple.first children)
                )
            , gridCellToCssStyle gridCell
            , case sizeArea.width of
                Fix px ->
                    Css.width (Css.px (toFloat px))

                Grow ->
                    Css.width (Css.pct 100)

                Auto ->
                    Css.width Css.auto
            , Css.batch
                (case sizeArea.height of
                    Fix px ->
                        [ Css.height (Css.px (toFloat px)) ]

                    Grow ->
                        [ Css.height (Css.pct 100) ]

                    Auto ->
                        [ Css.height Css.auto ]
                )
            ]
        ]
        (List.indexedMap
            (\index ( size, panel ) ->
                panelToHtml
                    (GridCell { row = index, column = 0 })
                    (sizeAreaSubtractPadding { width = sizeArea.width, height = size } styleComputed)
                    panel
            )
            children
        )


pointerPanelToHtml : GridCell -> SizeArea -> StyleComputed -> PointerPanelAttributes message -> Html.Styled.Html message
pointerPanelToHtml gridCell sizeArea styleComputed (PointerPanelAttributes record) =
    Html.Styled.div
        (List.concat
            [ [ Html.Styled.Attributes.css
                    [ styleComputedToCssStyle False styleComputed
                    , gridCellToCssStyle gridCell
                    ]
              ]
            , case record.enterMessage of
                Just msg ->
                    [ Html.Styled.Events.on "pointerenter" (pointerEventDecoder |> Json.Decode.map msg) ]

                Nothing ->
                    []
            , case record.leaveMessage of
                Just msg ->
                    [ Html.Styled.Events.on "pointerleave" (pointerEventDecoder |> Json.Decode.map msg) ]

                Nothing ->
                    []
            , case record.moveMessage of
                Just msg ->
                    [ Html.Styled.Events.on "pointermove" (pointerEventDecoder |> Json.Decode.map msg) ]

                Nothing ->
                    []
            , case record.downMessage of
                Just msg ->
                    [ Html.Styled.Events.on "pointerdown" (pointerEventDecoder |> Json.Decode.map msg) ]

                Nothing ->
                    []
            ]
        )
        [ panelToHtml
            (GridCell { row = 0, column = 0 })
            (sizeAreaSubtractPadding sizeArea styleComputed)
            record.child
        ]


sizeAreaSubtractPadding : SizeArea -> StyleComputed -> SizeArea
sizeAreaSubtractPadding sizeArea (StyleComputed record) =
    { width =
        case sizeArea.width of
            Fix px ->
                Fix (px - record.padding)

            _ ->
                sizeArea.width
    , height =
        case sizeArea.height of
            Fix px ->
                Fix (px - record.padding)

            _ ->
                sizeArea.height
    }


styleComputedToCssStyle : Bool -> StyleComputed -> Css.Style
styleComputedToCssStyle isButtonElement (StyleComputed record) =
    [ [ Css.padding (Css.px (toFloat record.padding))
      , Css.alignSelf
            (case record.alignSelf of
                AlignSelfStretch ->
                    Css.stretch

                AlignSelfStart ->
                    Css.start

                AlignSelfCenter ->
                    Css.center

                AlignSelfEnd ->
                    Css.end
            )
      ]
    , if isButtonElement then
        [ Css.cursor Css.pointer ]

      else
        []
    , case record.border of
        Just border_ ->
            [ borderStyleToStyle border_ ]

        Nothing ->
            if isButtonElement then
                [ Css.border2 Css.zero Css.none ]

            else
                []
    , case record.offset of
        Just ( left, top ) ->
            [ Css.transform
                (Css.translate2
                    (Css.px (toFloat left))
                    (Css.px (toFloat top))
                )
            ]

        Nothing ->
            []
    , case record.pointerImage of
        Just HorizontalResize ->
            [ Css.cursor Css.ewResize ]

        Just VerticalResize ->
            [ Css.cursor Css.ewResize ]

        Nothing ->
            []
    , case record.borderRadius of
        BorderRadiusPx 0 ->
            if isButtonElement then
                [ Css.borderRadius Css.zero ]

            else
                []

        BorderRadiusPercent 0 ->
            if isButtonElement then
                [ Css.borderRadius Css.zero ]

            else
                []

        BorderRadiusPx size ->
            [ Css.borderRadius (Css.px (toFloat size)) ]

        BorderRadiusPercent percent ->
            [ Css.borderRadius (Css.pct (toFloat percent)) ]
    , case record.backGroundColor of
        Just color ->
            [ Css.backgroundColor color ]

        Nothing ->
            if isButtonElement then
                [ Css.backgroundColor Css.transparent ]

            else
                []
    , case record.gap of
        0 ->
            []

        size ->
            [ Css.property "gap" (String.fromInt size ++ "px") ]
    ]
        |> List.concat
        |> Css.batch


borderStyleToStyle : BorderStyle -> Css.Style
borderStyleToStyle (BorderStyle record) =
    [ Css.borderColor record.color
    , Css.borderStyle Css.solid
    , Css.borderWidth4
        (Css.px (toFloat record.width.top))
        (Css.px (toFloat record.width.right))
        (Css.px (toFloat record.width.bottom))
        (Css.px (toFloat record.width.left))
    ]
        |> Css.batch


pointerEventDecoder : Json.Decode.Decoder Pointer
pointerEventDecoder =
    Json.Decode.succeed
        (\id clientX clientY button_ pressure tangentialPressure width_ height_ tiltX tiltY twist pointerType isPrimary buttons eventPhase ->
            Pointer
                { id = id
                , position = ( clientX, clientY )
                , button =
                    case button_ of
                        0 ->
                            Just Primary

                        1 ->
                            Just Auxiliary

                        2 ->
                            Just Secondary

                        3 ->
                            Just BrowserBack

                        4 ->
                            Just BrowserForward

                        5 ->
                            Just Eraser

                        _ ->
                            Nothing
                , pressure = pressure
                , tangentialPressure = tangentialPressure
                , size = ( width_, height_ )
                , tilt = ( tiltX, tiltY )
                , twist = twist
                , type_ =
                    case pointerType of
                        "mouse" ->
                            Mouse

                        "pen" ->
                            Pen

                        "touch" ->
                            Touch

                        _ ->
                            PointerTypeUnknown pointerType
                , isPrimary = isPrimary
                , buttons =
                    [ ( Primary, (buttons |> Bitwise.and 1) /= 0 )
                    , ( Secondary, (buttons |> Bitwise.and 2) /= 0 )
                    , ( Auxiliary, (buttons |> Bitwise.and 4) /= 0 )
                    , ( BrowserBack, (buttons |> Bitwise.and 8) /= 0 )
                    , ( BrowserForward, (buttons |> Bitwise.and 16) /= 0 )
                    , ( Eraser, (buttons |> Bitwise.and 32) /= 0 )
                    ]
                        |> List.filter Tuple.second
                        |> List.map Tuple.first
                , target = eventPhase == 2
                }
        )
        |> Json.Decode.Pipeline.required "pointerId" Json.Decode.int
        |> Json.Decode.Pipeline.required "clientX" Json.Decode.float
        |> Json.Decode.Pipeline.required "clientY" Json.Decode.float
        |> Json.Decode.Pipeline.required "button" Json.Decode.int
        |> Json.Decode.Pipeline.required "pressure" Json.Decode.float
        |> Json.Decode.Pipeline.required "tangentialPressure" Json.Decode.float
        |> Json.Decode.Pipeline.required "width" Json.Decode.float
        |> Json.Decode.Pipeline.required "height" Json.Decode.float
        |> Json.Decode.Pipeline.required "tiltX" Json.Decode.float
        |> Json.Decode.Pipeline.required "tiltY" Json.Decode.float
        |> Json.Decode.Pipeline.required "twist" Json.Decode.float
        |> Json.Decode.Pipeline.required "pointerType" Json.Decode.string
        |> Json.Decode.Pipeline.required "isPrimary" Json.Decode.bool
        |> Json.Decode.Pipeline.required "buttons" Json.Decode.int
        |> Json.Decode.Pipeline.required "eventPhase" Json.Decode.int


sizeListToGridTemplate : List Size -> String
sizeListToGridTemplate =
    List.map
        sizeListToGridTemplateItem
        >> String.join " "


sizeListToGridTemplateItem : Size -> String
sizeListToGridTemplateItem size =
    case size of
        Fix int ->
            String.fromInt int ++ "px"

        Grow ->
            "1fr"

        Auto ->
            "auto"


textAlignToStyle : TextAlignment -> Css.Style
textAlignToStyle textAlignment =
    Css.textAlign
        (case textAlignment of
            TextAlignStart ->
                Css.start

            TextAlignEnd ->
                Css.end

            TextAlignCenter ->
                Css.center
        )


gridCellToCssStyle : GridCell -> Css.Style
gridCellToCssStyle (GridCell record) =
    Css.batch
        [ Css.property "grid-row"
            (String.fromInt (record.row + 1)
                ++ " / "
                ++ String.fromInt (record.row + 2)
            )
        , Css.property "grid-column"
            (String.fromInt (record.column + 1)
                ++ " / "
                ++ String.fromInt (record.column + 2)
            )
        ]
