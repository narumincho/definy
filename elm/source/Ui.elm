module Ui exposing
    ( BitmapImageAttributes(..)
    , BorderRadius(..)
    , BorderStyle(..)
    , FitStyle(..)
    , ImageRendering(..)
    , Panel
    , Pointer
    , PointerImage(..)
    , SizeAndAlignment
    , TextAlignment(..)
    , TextBoxAttributes(..)
    , VectorImageAttributes(..)
    , auto
    , backgroundColor
    , bitmapImage
    , border
    , borderRadius
    , button
    , center
    , column
    , computeStyle
    , depth
    , empty
    , end
    , fix
    , gap
    , height
    , map
    , offset
    , overflowVisible
    , padding
    , pointerImage
    , row
    , start
    , stretch
    , textBox
    , toHtml
    , vectorImage
    , width
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
        { style : StyleComputed
        , content : Content message
        }


type Content message
    = TextBox TextBoxAttributes
    | BitmapImage BitmapImageAttributes
    | VectorImage (VectorImageAttributes message)
    | Empty
    | DepthList (List (Panel message))
    | RowList (List (Panel message))
    | ColumnList (List (Panel message))
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


type SizeAndAlignment
    = Fix Int Alignment
    | Stretch
    | Auto Alignment


{-| 固定サイズにする
-}
fix : Int -> Alignment -> SizeAndAlignment
fix =
    Fix


{-| 親の大きさに合わせる (デフォルト)
-}
stretch : SizeAndAlignment
stretch =
    Stretch


{-| 中身に合わせる
-}
auto : Alignment -> SizeAndAlignment
auto =
    Auto


type Alignment
    = Start
    | Center
    | End


{-| グリッドセル内で上,左に寄せる
-}
start : Alignment
start =
    Start


{-| グリッドセル内で中央に寄せる
-}
center : Alignment
center =
    Center


{-| グリッドセル内で下,右に寄せる
-}
end : Alignment
end =
    End


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
        , width : SizeAndAlignment
        , height : SizeAndAlignment
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
    | Width SizeAndAlignment
    | Height SizeAndAlignment


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
    panelToHtml (GridCell { row = 0, column = 0 })


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


{-| グリッドセル内でのパネルの横方向の伸ばし方と揃え方を指定できる. デフォルトはStretch
-}
width : SizeAndAlignment -> Style
width =
    Width


{-| グリッドセル内でのパネルの縦方向の伸ばし方と揃え方を指定できる デフォルトはStretch
-}
height : SizeAndAlignment -> Style
height =
    Height


{-| テキストボックス
-}
textBox : List Style -> TextBoxAttributes -> Panel message
textBox style textBoxAttributes =
    Panel
        { style = computeStyle style
        , content = TextBox textBoxAttributes
        }


{-| ビットマップ画像
-}
bitmapImage : List Style -> BitmapImageAttributes -> Panel message
bitmapImage style bitmapImageAttributes =
    Panel
        { style = computeStyle style
        , content = BitmapImage bitmapImageAttributes
        }


{-| ベクター画像
-}
vectorImage : List Style -> VectorImageAttributes message -> Panel message
vectorImage style vectorImageAttributes =
    Panel
        { style = computeStyle style
        , content = VectorImage vectorImageAttributes
        }


{-| からのパネル
-}
empty : List Style -> Panel message
empty style =
    Panel
        { style = computeStyle style
        , content = Empty
        }


{-| ボタン
-}
button : List Style -> message -> Panel message -> Panel message
button style clickMessage child =
    Panel
        { style = computeStyle style
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
        { style = computeStyle style
        , content = DepthList children
        }


{-| 横方向に並べる
-}
row : List Style -> List (Panel message) -> Panel message
row style children =
    Panel
        { style = computeStyle style
        , content = RowList children
        }


{-| 縦方向に並べる
-}
column : List Style -> List (Panel message) -> Panel message
column style children =
    Panel
        { style = computeStyle style
        , content = ColumnList children
        }


computeStyle : List Style -> StyleComputed
computeStyle list =
    case list of
        x :: xs ->
            let
                (StyleComputed rest) =
                    computeStyle xs
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

                    Width value ->
                        { rest | width = value }

                    Height value ->
                        { rest | height = value }
                )

        [] ->
            defaultStyleComputed


defaultStyleComputed : StyleComputed
defaultStyleComputed =
    StyleComputed
        { padding = 0
        , offset = Nothing
        , overflowVisible = False
        , pointerImage = Nothing
        , border = Nothing
        , borderRadius = BorderRadiusPx 0
        , backGroundColor = Nothing
        , gap = 0
        , width = Stretch
        , height = Stretch
        }


panelGetStyle : Panel message -> StyleComputed
panelGetStyle (Panel record) =
    record.style


styleComputedGetWidth : StyleComputed -> SizeAndAlignment
styleComputedGetWidth (StyleComputed record) =
    record.width


styleComputedGetHeight : StyleComputed -> SizeAndAlignment
styleComputedGetHeight (StyleComputed record) =
    record.height


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
            RowList (List.map (map func) children)

        ColumnList children ->
            ColumnList (List.map (map func) children)

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


type GridCell
    = GridCell { row : Int, column : Int }


panelToHtml : GridCell -> Panel msg -> Html.Styled.Html msg
panelToHtml gridCell (Panel record) =
    case record.content of
        TextBox textBoxAttributes ->
            textBoxToHtml gridCell record.style textBoxAttributes

        BitmapImage imageFromUrlAttributes ->
            imageFromUrlToHtml gridCell record.style imageFromUrlAttributes

        VectorImage vectorImageAttributes ->
            vectorImageToHtml gridCell record.style vectorImageAttributes

        Empty ->
            emptyToHtml gridCell record.style

        Button buttonAttributes ->
            buttonToHtml gridCell record.style buttonAttributes

        DepthList depthListAttributes ->
            depthListToHtml gridCell record.style depthListAttributes

        RowList rowListAttributes ->
            rowListToHtml gridCell record.style rowListAttributes

        ColumnList columnListAttributes ->
            columnListToHtml gridCell record.style columnListAttributes

        PointerPanel pointerPanelAttributes ->
            pointerPanelToHtml gridCell record.style pointerPanelAttributes


textBoxToHtml : GridCell -> StyleComputed -> TextBoxAttributes -> Html.Styled.Html message
textBoxToHtml gridCell styleComputed (TextBoxAttributes record) =
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
            ]
        ]
        [ Html.Styled.text record.text ]


imageFromUrlToHtml : GridCell -> StyleComputed -> BitmapImageAttributes -> Html.Styled.Html message
imageFromUrlToHtml gridCell styleComputed (BitmapImageAttributes record) =
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


vectorImageToHtml : GridCell -> StyleComputed -> VectorImageAttributes message -> Html.Styled.Html message
vectorImageToHtml gridCell styleComputed (VectorImageAttributes record) =
    Html.Styled.div
        [ Html.Styled.Attributes.css
            [ styleComputedToCssStyle False styleComputed
            , gridCellToCssStyle gridCell
            ]
        ]
        [ VectorImage.toHtml
            record.viewBox
            Nothing
            record.elements
        ]


emptyToHtml : GridCell -> StyleComputed -> Html.Styled.Html message
emptyToHtml gridCell styleAndEvent =
    Html.Styled.div
        [ Html.Styled.Attributes.css
            [ styleComputedToCssStyle False styleAndEvent
            , gridCellToCssStyle gridCell
            ]
        ]
        []


buttonToHtml : GridCell -> StyleComputed -> ButtonAttributes message -> Html.Styled.Html message
buttonToHtml gridCell styleComputed (ButtonAttributes record) =
    Html.Styled.button
        [ Html.Styled.Attributes.css
            [ styleComputedToCssStyle True styleComputed
            , gridCellToCssStyle gridCell
            ]
        , Html.Styled.Events.onClick
            record.clickMessage
        ]
        [ panelToHtml (GridCell { row = 0, column = 0 })
            record.child
        ]


depthListToHtml : GridCell -> StyleComputed -> List (Panel message) -> Html.Styled.Html message
depthListToHtml gridCell styleComputed children =
    Html.Styled.div
        [ Html.Styled.Attributes.css
            [ styleComputedToCssStyle False styleComputed
            , Css.property "display" "grid"
            , Css.property "grid-template-rows" "1fr"
            , Css.property "grid-template-columns" "1fr"
            , gridCellToCssStyle gridCell
            ]
        ]
        (List.map
            (panelToHtml
                (GridCell { row = 0, column = 0 })
            )
            children
        )


rowListToHtml : GridCell -> StyleComputed -> List (Panel message) -> Html.Styled.Html message
rowListToHtml gridCell styleComputed children =
    Html.Styled.div
        [ Html.Styled.Attributes.css
            [ styleComputedToCssStyle False styleComputed
            , Css.property "display" "grid"
            , Css.property "grid-template-columns"
                (sizeListToGridTemplate
                    (styleComputedGetWidth styleComputed)
                    (List.map (panelGetStyle >> styleComputedGetWidth) children)
                )
            , gridCellToCssStyle gridCell
            ]
        ]
        (List.indexedMap
            (\index panel ->
                panelToHtml
                    (GridCell { row = 0, column = index })
                    panel
            )
            children
        )


columnListToHtml : GridCell -> StyleComputed -> List (Panel message) -> Html.Styled.Html message
columnListToHtml gridCell styleComputed children =
    Html.Styled.div
        [ Html.Styled.Attributes.css
            [ styleComputedToCssStyle False styleComputed
            , Css.property "display" "grid"
            , Css.property "grid-template-rows"
                (sizeListToGridTemplate
                    (styleComputedGetHeight styleComputed)
                    (List.map (panelGetStyle >> styleComputedGetHeight) children)
                )
            , gridCellToCssStyle gridCell
            ]
        ]
        (List.indexedMap
            (\index panel ->
                panelToHtml
                    (GridCell { row = index, column = 0 })
                    panel
            )
            children
        )


pointerPanelToHtml : GridCell -> StyleComputed -> PointerPanelAttributes message -> Html.Styled.Html message
pointerPanelToHtml gridCell styleComputed (PointerPanelAttributes record) =
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
            record.child
        ]


styleComputedToCssStyle : Bool -> StyleComputed -> Css.Style
styleComputedToCssStyle isButtonElement (StyleComputed record) =
    [ [ Css.padding (Css.px (toFloat record.padding))
      , Css.property "justify-self" (sizeAndAlignmentToAlignmentCssValueAsString record.width)
      , Css.property "align-self" (sizeAndAlignmentToAlignmentCssValueAsString record.height)
      ]
    , case record.width of
        Fix px _ ->
            [ Css.width (Css.px (toFloat px)) ]

        Stretch ->
            [ Css.width (Css.pct 100) ]

        Auto _ ->
            [ Css.width Css.auto ]
    , case record.height of
        Fix px _ ->
            [ Css.height (Css.px (toFloat px)) ]

        Stretch ->
            [ Css.height (Css.pct 100) ]

        Auto _ ->
            [ Css.height Css.auto ]
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


sizeAndAlignmentToAlignmentCssValueAsString : SizeAndAlignment -> String
sizeAndAlignmentToAlignmentCssValueAsString sizeAndAlignment =
    case sizeAndAlignment of
        Fix _ alignment ->
            alignmentToCssValueAsString alignment

        Stretch ->
            "stretch"

        Auto alignment ->
            alignmentToCssValueAsString alignment


alignmentToCssValueAsString : Alignment -> String
alignmentToCssValueAsString alignment =
    case alignment of
        Start ->
            "start"

        Center ->
            "center"

        End ->
            "end"


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


sizeListToGridTemplate : SizeAndAlignment -> List SizeAndAlignment -> String
sizeListToGridTemplate sizeAndAlignment panelList =
    let
        itemList : List String
        itemList =
            List.map
                sizeListToGridTemplateItem
                panelList
                ++ (if sizeAndAlignment == Stretch && not (List.member Stretch panelList) then
                        [ "1fr" ]

                    else
                        []
                   )
    in
    String.join " " itemList


sizeListToGridTemplateItem : SizeAndAlignment -> String
sizeListToGridTemplateItem size =
    case size of
        Fix int _ ->
            String.fromInt int ++ "px"

        Stretch ->
            "1fr"

        Auto _ ->
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
