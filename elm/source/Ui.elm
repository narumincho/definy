module Ui exposing
    ( Alignment(..)
    , BitmapImageAttributes(..)
    , BorderRadius(..)
    , BorderStyle(..)
    , FitStyle(..)
    , ImageRendering(..)
    , LinkAttributes(..)
    , Panel
    , Pointer
    , PointerImage(..)
    , Size
    , TextAlignment(..)
    , TextAttributes(..)
    , VectorImageAttributes(..)
    , auto
    , backgroundColor
    , bitmapImage
    , border
    , borderRadius
    , button
    , column
    , depth
    , empty
    , fix
    , gap
    , height
    , link
    , map
    , offset
    , overflowVisible
    , padding
    , pointerImage
    , row
    , scroll
    , stretch
    , stretchWithMaxSize
    , text
    , textInput
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
    = Text TextAttributes
    | BitmapImage BitmapImageAttributes
    | VectorImage (VectorImageAttributes message)
    | Empty
    | Depth (List ( ( Alignment, Alignment ), Panel message ))
    | Row (List (Panel message))
    | Column (List (Panel message))
    | Button (ButtonAttributes message)
    | Link (LinkAttributes message)
    | PointerPanel (PointerPanelAttributes message)
    | Scroll (Panel message)
    | TextInput (TextInputAttributes message)


type TextAttributes
    = TextAttributes
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


type LinkAttributes message
    = LinkAttributes
        { url : String
        , clickMessage : message
        , noOpMessage : message
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


type TextInputAttributes message
    = TextInputAttributes
        { inputMessage : String -> message
        , name : String
        , multiLine : Bool
        }


type Size
    = Fix Int
    | Stretch (Maybe Int)
    | Auto


{-| 固定サイズにする
-}
fix : Int -> Size
fix =
    Fix


{-| 親の大きさに合わせる (デフォルト)
-}
stretch : Size
stretch =
    Stretch Nothing


{-| 基本的に親のサイズになるように大きくなるが,指定した最大の大きさに収まるようにする
-}
stretchWithMaxSize : Int -> Size
stretchWithMaxSize maxSize =
    Stretch (Just maxSize)


{-| 中身に合わせる
-}
auto : Size
auto =
    Auto


type Alignment
    = Start
    | Center
    | End


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
        , width : Size
        , height : Size
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
    | Width Size
    | Height Size


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
    panelToHtml (GridCell { row = 0, column = 0 }) StretchStretch


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
width : Size -> Style
width =
    Width


{-| グリッドセル内でのパネルの縦方向の伸ばし方と揃え方を指定できる デフォルトはStretch
-}
height : Size -> Style
height =
    Height


{-| テキストボックス
-}
text : List Style -> TextAttributes -> Panel message
text style textBoxAttributes =
    Panel
        { style = computeStyle style
        , content = Text textBoxAttributes
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


link : List Style -> LinkAttributes message -> Panel message
link style linkAttributes =
    Panel
        { style = computeStyle style
        , content = Link linkAttributes
        }


{-| 中身が領域より大きい場合,中身をスクロールできるようにする
-}
scroll : List Style -> Panel message -> Panel message
scroll style child =
    Panel
        { style = computeStyle style
        , content = Scroll child
        }


{-| パネルを同じ領域に重ねる
-}
depth : List Style -> List ( ( Alignment, Alignment ), Panel message ) -> Panel message
depth style children =
    Panel
        { style = computeStyle style
        , content = Depth children
        }


{-| 横方向に並べる
-}
row : List Style -> List (Panel message) -> Panel message
row style children =
    Panel
        { style = computeStyle style
        , content = Row children
        }


{-| 縦方向に並べる
-}
column : List Style -> List (Panel message) -> Panel message
column style children =
    Panel
        { style = computeStyle style
        , content = Column children
        }


{-| 文字の入力ボックス
-}
textInput : List Style -> TextInputAttributes message -> Panel message
textInput style attributes =
    Panel
        { style = computeStyle style
        , content = TextInput attributes
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
        , width = Auto
        , height = Auto
        }


panelGetStyle : Panel message -> StyleComputed
panelGetStyle (Panel record) =
    record.style


styleComputedGetWidth : StyleComputed -> Size
styleComputedGetWidth (StyleComputed record) =
    record.width


styleComputedGetHeight : StyleComputed -> Size
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
        Text textBoxAttributes ->
            Text textBoxAttributes

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

        Link (LinkAttributes record) ->
            Link
                (LinkAttributes
                    { url = record.url
                    , clickMessage = func record.clickMessage
                    , noOpMessage = func record.noOpMessage
                    , child = map func record.child
                    }
                )

        Depth children ->
            Depth (List.map (Tuple.mapSecond (map func)) children)

        Row children ->
            Row (List.map (map func) children)

        Column children ->
            Column (List.map (map func) children)

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

        Scroll child ->
            Scroll (map func child)

        TextInput (TextInputAttributes record) ->
            TextInput
                (TextInputAttributes
                    { inputMessage = \inputtedText -> func (record.inputMessage inputtedText)
                    , name = record.name
                    , multiLine = record.multiLine
                    }
                )


type GridCell
    = GridCell { row : Int, column : Int }


panelToHtml : GridCell -> AlignmentOrStretch -> Panel msg -> Html.Styled.Html msg
panelToHtml gridCell alignmentOrStretch (Panel record) =
    let
        commonStyle =
            Css.batch
                [ alignmentOrStretchToCssStyle record.style alignmentOrStretch
                , gridCellToCssStyle gridCell
                , Css.batch
                    (if isIncludeScrollInPanel (Panel record) then
                        [ Css.overflow Css.auto ]

                     else
                        []
                    )
                ]
    in
    case record.content of
        Text attributes ->
            textBoxToHtml commonStyle record.style attributes

        BitmapImage attributes ->
            imageFromUrlToHtml commonStyle record.style attributes

        VectorImage attributes ->
            vectorImageToHtml commonStyle record.style attributes

        Empty ->
            emptyToHtml commonStyle record.style

        Button attributes ->
            buttonToHtml commonStyle record.style attributes

        Link attributes ->
            linkToHtml commonStyle record.style attributes

        Depth attributes ->
            depthToHtml commonStyle record.style attributes

        Row attributes ->
            rowToHtml commonStyle record.style attributes

        Column attributes ->
            columnToHtml commonStyle record.style attributes

        PointerPanel attributes ->
            pointerPanelToHtml commonStyle record.style attributes

        Scroll child ->
            scrollBoxToHtml commonStyle record.style child

        TextInput attributes ->
            textInputToHtml commonStyle record.style attributes


textBoxToHtml : Css.Style -> StyleComputed -> TextAttributes -> Html.Styled.Html message
textBoxToHtml commonStyle styleComputed (TextAttributes record) =
    Html.Styled.div
        [ Html.Styled.Attributes.css
            [ styleComputedToCssStyle False styleComputed
            , Css.color record.color
            , Css.fontSize (Css.px (toFloat record.size))
            , Css.fontFamilies [ Css.qt record.typeface ]
            , Css.letterSpacing (Css.px record.letterSpacing)
            , Css.overflowWrap Css.breakWord
            , textAlignToStyle record.textAlignment
            , commonStyle
            ]
        ]
        [ Html.Styled.text record.text ]


imageFromUrlToHtml : Css.Style -> StyleComputed -> BitmapImageAttributes -> Html.Styled.Html message
imageFromUrlToHtml commonStyle styleComputed (BitmapImageAttributes record) =
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
             , commonStyle
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


vectorImageToHtml : Css.Style -> StyleComputed -> VectorImageAttributes message -> Html.Styled.Html message
vectorImageToHtml commonStyle styleComputed (VectorImageAttributes record) =
    Html.Styled.div
        [ Html.Styled.Attributes.css
            [ styleComputedToCssStyle False styleComputed
            , commonStyle
            ]
        ]
        [ VectorImage.toHtml
            record.viewBox
            Nothing
            record.elements
        ]


emptyToHtml : Css.Style -> StyleComputed -> Html.Styled.Html message
emptyToHtml commonStyle styleAndEvent =
    Html.Styled.div
        [ Html.Styled.Attributes.css
            [ styleComputedToCssStyle False styleAndEvent
            , commonStyle
            ]
        ]
        []


buttonToHtml : Css.Style -> StyleComputed -> ButtonAttributes message -> Html.Styled.Html message
buttonToHtml commonStyle styleComputed (ButtonAttributes record) =
    Html.Styled.button
        [ Html.Styled.Attributes.css
            [ styleComputedToCssStyle True styleComputed
            , commonStyle
            ]
        , Html.Styled.Events.onClick
            record.clickMessage
        ]
        [ panelToHtml (GridCell { row = 0, column = 0 })
            StretchStretch
            record.child
        ]


linkToHtml : Css.Style -> StyleComputed -> LinkAttributes message -> Html.Styled.Html message
linkToHtml commonStyle styleComputed (LinkAttributes record) =
    Html.Styled.a
        [ Html.Styled.Attributes.css
            [ styleComputedToCssStyle False styleComputed
            , commonStyle
            ]
        , Html.Styled.Attributes.href record.url
        , Html.Styled.Events.custom "click"
            (clickEventButton
                |> Json.Decode.map
                    (\linkButton ->
                        if linkButton.ctrlKey || linkButton.shiftKey || linkButton.metaKey then
                            { message = record.noOpMessage
                            , stopPropagation = False
                            , preventDefault = False
                            }

                        else
                            { message = record.clickMessage
                            , stopPropagation = True
                            , preventDefault = True
                            }
                    )
            )
        ]
        [ panelToHtml (GridCell { row = 0, column = 0 })
            StretchStretch
            record.child
        ]


type alias LinkButton =
    { ctrlKey : Bool
    , shiftKey : Bool
    , metaKey : Bool
    }


clickEventButton : Json.Decode.Decoder LinkButton
clickEventButton =
    Json.Decode.map3
        (\ctrlKey shiftKey metaKey ->
            { ctrlKey = ctrlKey
            , shiftKey = shiftKey
            , metaKey = metaKey
            }
        )
        (Json.Decode.field "ctrlKey" Json.Decode.bool)
        (Json.Decode.field "shitKey" Json.Decode.bool)
        (Json.Decode.field "metaKey" Json.Decode.bool)


depthToHtml : Css.Style -> StyleComputed -> List ( ( Alignment, Alignment ), Panel message ) -> Html.Styled.Html message
depthToHtml commonStyle styleComputed children =
    Html.Styled.div
        [ Html.Styled.Attributes.css
            [ styleComputedToCssStyle False styleComputed
            , Css.property "display" "grid"
            , Css.property "grid-template-rows" "1fr"
            , Css.property "grid-template-columns" "1fr"
            , commonStyle
            ]
        ]
        (List.map
            (\( alignment, panel ) ->
                panelToHtml
                    (GridCell { row = 0, column = 0 })
                    (Alignment alignment)
                    panel
            )
            children
        )


rowToHtml : Css.Style -> StyleComputed -> List (Panel message) -> Html.Styled.Html message
rowToHtml commonStyle styleComputed children =
    Html.Styled.div
        [ Html.Styled.Attributes.css
            [ styleComputedToCssStyle False styleComputed
            , Css.property "display" "grid"
            , Css.property "grid-template-columns"
                (sizeListToGridTemplate
                    (styleComputedGetWidth styleComputed)
                    (List.map (panelGetStyle >> styleComputedGetWidth) children)
                )
            , commonStyle
            ]
        ]
        (List.indexedMap
            (\index panel ->
                panelToHtml
                    (GridCell { row = 0, column = index })
                    StretchRow
                    panel
            )
            children
        )


columnToHtml : Css.Style -> StyleComputed -> List (Panel message) -> Html.Styled.Html message
columnToHtml commonStyle styleComputed children =
    Html.Styled.div
        [ Html.Styled.Attributes.css
            [ styleComputedToCssStyle False styleComputed
            , Css.property "display" "grid"
            , Css.property "grid-template-rows"
                (sizeListToGridTemplate
                    (styleComputedGetHeight styleComputed)
                    (List.map (panelGetStyle >> styleComputedGetHeight) children)
                )
            , commonStyle
            ]
        ]
        (List.indexedMap
            (\index panel ->
                panelToHtml
                    (GridCell { row = index, column = 0 })
                    StretchColumn
                    panel
            )
            children
        )


pointerPanelToHtml : Css.Style -> StyleComputed -> PointerPanelAttributes message -> Html.Styled.Html message
pointerPanelToHtml commonStyle styleComputed (PointerPanelAttributes record) =
    Html.Styled.div
        (List.concat
            [ [ Html.Styled.Attributes.css
                    [ styleComputedToCssStyle False styleComputed
                    , commonStyle
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
            StretchStretch
            record.child
        ]


scrollBoxToHtml : Css.Style -> StyleComputed -> Panel message -> Html.Styled.Html message
scrollBoxToHtml commonStyle styleComputed child =
    Html.Styled.div
        [ Html.Styled.Attributes.css
            [ commonStyle
            , styleComputedToCssStyle False styleComputed
            ]
        ]
        [ panelToHtml (GridCell { row = 0, column = 0 }) StretchStretch child ]


textInputToHtml : Css.Style -> StyleComputed -> TextInputAttributes message -> Html.Styled.Html message
textInputToHtml commonStyle styleComputed (TextInputAttributes attributes) =
    (if attributes.multiLine then
        Html.Styled.textarea

     else
        Html.Styled.input
    )
        [ Html.Styled.Attributes.css
            [ commonStyle
            , styleComputedToCssStyle False styleComputed
            ]
        , Html.Styled.Attributes.name attributes.name
        , Html.Styled.Events.onInput attributes.inputMessage
        ]
        []


styleComputedToCssStyle : Bool -> StyleComputed -> Css.Style
styleComputedToCssStyle isButtonElement (StyleComputed record) =
    [ [ Css.padding (Css.px (toFloat record.padding))
      , Css.zIndex (Css.int 0)
      , Css.textDecoration Css.none
      ]
    , case record.width of
        Fix px ->
            [ Css.width (Css.px (toFloat px)) ]

        Stretch maxSizeMaybe ->
            [ Css.width (Css.pct 100) ]
                ++ (case maxSizeMaybe of
                        Just maxSize ->
                            [ Css.maxWidth (Css.px (toFloat maxSize)) ]

                        Nothing ->
                            []
                   )

        Auto ->
            [ Css.width Css.auto ]
    , case record.height of
        Fix px ->
            [ Css.height (Css.px (toFloat px)) ]

        Stretch maxSizeMaybe ->
            [ Css.height (Css.pct 100) ]
                ++ (case maxSizeMaybe of
                        Just maxSize ->
                            [ Css.maxHeight (Css.px (toFloat maxSize)) ]

                        Nothing ->
                            []
                   )

        Auto ->
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


sizeListToGridTemplate : Size -> List Size -> String
sizeListToGridTemplate sizeAndAlignment panelList =
    let
        itemList : List String
        itemList =
            List.map
                sizeListToGridTemplateItem
                panelList
                ++ (if List.any isStretch panelList then
                        []

                    else
                        case sizeAndAlignment of
                            Stretch _ ->
                                [ "1fr" ]

                            Fix _ ->
                                [ "1fr" ]

                            Auto ->
                                []
                   )
    in
    String.join " " itemList


isStretch : Size -> Bool
isStretch size =
    case size of
        Stretch _ ->
            True

        _ ->
            False


sizeListToGridTemplateItem : Size -> String
sizeListToGridTemplateItem size =
    case size of
        Fix int ->
            String.fromInt int ++ "px"

        Stretch _ ->
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


type AlignmentOrStretch
    = Alignment ( Alignment, Alignment )
    | StretchRow
    | StretchColumn
    | StretchStretch


alignmentOrStretchToCssStyle : StyleComputed -> AlignmentOrStretch -> Css.Style
alignmentOrStretchToCssStyle (StyleComputed style) alignmentOrStretch =
    Css.batch
        (case alignmentOrStretch of
            Alignment ( x, y ) ->
                [ justifySelf
                    (if isStretch style.width then
                        "stretch"

                     else
                        case x of
                            Start ->
                                "start"

                            Center ->
                                "center"

                            End ->
                                "end"
                    )
                , Css.alignSelf
                    (if isStretch style.height then
                        Css.stretch

                     else
                        case y of
                            Start ->
                                Css.start

                            Center ->
                                Css.center

                            End ->
                                Css.end
                    )
                ]

            StretchRow ->
                [ justifySelf "stretch"
                , Css.alignSelf Css.center
                ]

            StretchColumn ->
                [ justifySelf "center"
                , Css.alignSelf Css.stretch
                ]

            StretchStretch ->
                [ justifySelf "stretch"
                , Css.alignSelf Css.stretch
                ]
        )


justifySelf : String -> Css.Style
justifySelf =
    Css.property "justify-self"


isIncludeScrollInPanel : Panel message -> Bool
isIncludeScrollInPanel (Panel record) =
    case record.content of
        Text _ ->
            False

        BitmapImage _ ->
            False

        VectorImage _ ->
            False

        Empty ->
            False

        Depth list ->
            List.any (\( _, panel ) -> isIncludeScrollInPanel panel) list

        Row panels ->
            List.any isIncludeScrollInPanel panels

        Column panels ->
            List.any isIncludeScrollInPanel panels

        Button (ButtonAttributes attributes) ->
            isIncludeScrollInPanel attributes.child

        Link (LinkAttributes attributes) ->
            isIncludeScrollInPanel attributes.child

        PointerPanel (PointerPanelAttributes attributes) ->
            isIncludeScrollInPanel attributes.child

        Scroll _ ->
            True

        TextInput _ ->
            False
