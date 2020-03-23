module Ui exposing
    ( BitmapImageAttributes(..)
    , BorderRadius(..)
    , BorderStyle(..)
    , ColumnListAttributes(..)
    , DepthListAttributes(..)
    , FitStyle(..)
    , ImageRendering(..)
    , Panel
    , Pointer
    , PointerImage(..)
    , RowListAttributes(..)
    , Size
    , TextAlignment(..)
    , TextBoxAttributes(..)
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
    , grow
    , map
    , offset
    , overflowVisible
    , padding
    , pointerImage
    , row
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
import Utility.ListExtra
import VectorImage


{-| デフォルトで幅と高さが外の大きさによって決まる,パネル
-}
type Panel message
    = TextBox TextBoxAttributes
    | BitmapImage BitmapImageAttributes
    | VectorImage (VectorImageAttributes message)
    | Empty (List Style)
    | DepthList (DepthListAttributes message)
    | RowList (RowListAttributes message)
    | ColumnList (ColumnListAttributes message)
    | Button (ButtonAttributes message)
    | PointerPanel (PointerPanelAttributes message)


type TextBoxAttributes
    = TextBoxAttributes
        { style : List Style
        , text : String
        , typeface : String
        , size : Int
        , letterSpacing : Float
        , color : Css.Color
        , textAlignment : TextAlignment
        }


type BitmapImageAttributes
    = BitmapImageAttributes
        { style : List Style
        , url : String
        , fitStyle : FitStyle
        , alternativeText : String
        , rendering : ImageRendering
        }


type VectorImageAttributes message
    = VectorImageAttributes
        { style : List Style
        , fitStyle : FitStyle
        , viewBox : { x : Int, y : Int, width : Int, height : Int }
        , elements : List (VectorImage.Element message)
        }


type DepthListAttributes message
    = DepthListAttributes
        { style : List Style
        , children : List (Panel message)
        }


type RowListAttributes message
    = RowListAttributes
        { style : List Style
        , gap : Int
        , children : List ( Size, Panel message )
        }


type ColumnListAttributes message
    = ColumnListAttributes
        { style : List Style
        , gap : Int
        , children : List ( Size, Panel message )
        }


type ButtonAttributes message
    = ButtonAttributes
        { style : List Style
        , clickMessage : message
        , child : Panel message
        }


type PointerPanelAttributes message
    = PointerPanelAttributes
        { style : List Style
        , enterMessage : Maybe (Pointer -> message)
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
    = AlignSelfStart
    | AlignSelfCenter
    | AlignSelfEnd


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
    panelToHtml { width = Grow, height = Grow }


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


{-| テキストボックス
-}
textBox :
    TextBoxAttributes
    -> Panel message
textBox =
    TextBox


{-| ビットマップ画像
-}
bitmapImage : BitmapImageAttributes -> Panel message
bitmapImage =
    BitmapImage


{-| ベクター画像
-}
vectorImage : VectorImageAttributes message -> Panel message
vectorImage =
    VectorImage


{-| からのパネル
-}
empty : List Style -> Panel message
empty =
    Empty


{-| ボタン
-}
button : List Style -> message -> Panel message -> Panel message
button styleAndEvent clickMessage child =
    Button
        (ButtonAttributes
            { style = styleAndEvent
            , clickMessage = clickMessage
            , child = child
            }
        )


{-| パネルを同じ領域に重ねる
-}
depth : DepthListAttributes message -> Panel message
depth =
    DepthList


{-| 横方向に並べる
-}
row : RowListAttributes message -> Panel message
row =
    RowList


{-| 縦方向に並べる
-}
column : ColumnListAttributes message -> Panel message
column =
    ColumnList


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
        }


map : (a -> b) -> Panel a -> Panel b
map func panel =
    case panel of
        TextBox textBoxAttributes ->
            TextBox textBoxAttributes

        BitmapImage bitmapImageAttributes ->
            BitmapImage bitmapImageAttributes

        VectorImage (VectorImageAttributes record) ->
            VectorImage
                (VectorImageAttributes
                    { style = record.style
                    , fitStyle = record.fitStyle
                    , viewBox = record.viewBox
                    , elements = List.map (VectorImage.map func) record.elements
                    }
                )

        Empty styleAndEvent ->
            Empty styleAndEvent

        Button (ButtonAttributes record) ->
            Button
                (ButtonAttributes
                    { style = record.style
                    , clickMessage = func record.clickMessage
                    , child = map func record.child
                    }
                )

        DepthList (DepthListAttributes record) ->
            DepthList
                (DepthListAttributes
                    { style = record.style
                    , children = List.map (map func) record.children
                    }
                )

        RowList (RowListAttributes record) ->
            RowList
                (RowListAttributes
                    { style = record.style
                    , gap = record.gap
                    , children = List.map (Tuple.mapSecond (map func)) record.children
                    }
                )

        ColumnList (ColumnListAttributes record) ->
            ColumnList
                (ColumnListAttributes
                    { style = record.style
                    , gap = record.gap
                    , children = List.map (Tuple.mapSecond (map func)) record.children
                    }
                )

        PointerPanel (PointerPanelAttributes record) ->
            PointerPanel
                (PointerPanelAttributes
                    { style = record.style
                    , enterMessage = Maybe.map (\msg pointer -> func (msg pointer)) record.enterMessage
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


panelToHtml : SizeArea -> Panel msg -> Html.Styled.Html msg
panelToHtml sizeArea panel =
    case panel of
        TextBox textBoxAttributes ->
            textBoxToHtml sizeArea textBoxAttributes

        BitmapImage imageFromUrlAttributes ->
            imageFromUrlToHtml sizeArea imageFromUrlAttributes

        VectorImage vectorImageAttributes ->
            vectorImageToHtml sizeArea vectorImageAttributes

        Empty styleAndEvent ->
            emptyToHtml sizeArea (styleAndEventCompute styleAndEvent)

        Button buttonAttributes ->
            buttonToHtml sizeArea buttonAttributes

        DepthList depthListAttributes ->
            depthListToHtml sizeArea depthListAttributes

        RowList rowListAttributes ->
            rowListToHtml sizeArea rowListAttributes

        ColumnList columnListAttributes ->
            columnListToHtml sizeArea columnListAttributes

        PointerPanel pointerPanelAttributes ->
            pointerPanelToHtml sizeArea pointerPanelAttributes


textBoxToHtml : SizeArea -> TextBoxAttributes -> Html.Styled.Html message
textBoxToHtml sizeArea (TextBoxAttributes record) =
    let
        styleAndEventComputed =
            styleAndEventCompute record.style
    in
    Html.Styled.div
        [ Html.Styled.Attributes.css
            [ panelToStyle False styleAndEventComputed
            , Css.color record.color
            , Css.fontSize (Css.px (toFloat record.size))
            , Css.fontFamilies [ Css.qt record.typeface ]
            , Css.letterSpacing (Css.px record.letterSpacing)
            , Css.overflowWrap Css.breakWord
            , textAlignToStyle record.textAlignment
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


imageFromUrlToHtml : SizeArea -> BitmapImageAttributes -> Html.Styled.Html message
imageFromUrlToHtml sizeArea (BitmapImageAttributes record) =
    let
        styleAndEventComputed =
            styleAndEventCompute record.style
    in
    Html.Styled.img
        [ Html.Styled.Attributes.css
            ([ panelToStyle False styleAndEventComputed
             , Css.property "object-fit"
                (case record.fitStyle of
                    Contain ->
                        "contain"

                    Cover ->
                        "cover"
                )
             , Css.display Css.block
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


vectorImageToHtml : SizeArea -> VectorImageAttributes message -> Html.Styled.Html message
vectorImageToHtml sizeArea (VectorImageAttributes record) =
    let
        styleAndEventComputed =
            styleAndEventCompute record.style
    in
    Html.Styled.div
        [ Html.Styled.Attributes.css
            [ panelToStyle False styleAndEventComputed
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


emptyToHtml : SizeArea -> StyleComputed -> Html.Styled.Html message
emptyToHtml sizeArea styleAndEvent =
    Html.Styled.div
        [ Html.Styled.Attributes.css
            [ panelToStyle False styleAndEvent
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


buttonToHtml : SizeArea -> ButtonAttributes message -> Html.Styled.Html message
buttonToHtml sizeArea (ButtonAttributes record) =
    let
        styleAndEventComputed =
            styleAndEventCompute record.style
    in
    Html.Styled.button
        [ Html.Styled.Attributes.css
            [ panelToStyle True styleAndEventComputed ]
        , Html.Styled.Events.onClick
            record.clickMessage
        ]
        [ panelToHtml (sizeAreaSubtractPadding sizeArea styleAndEventComputed) record.child ]


depthListToHtml :
    SizeArea
    -> DepthListAttributes message
    -> Html.Styled.Html message
depthListToHtml sizeArea (DepthListAttributes record) =
    let
        styleAndEventComputed =
            styleAndEventCompute record.style
    in
    Html.Styled.div
        [ Html.Styled.Attributes.css
            [ panelToStyle False styleAndEventComputed
            , Css.property "display" "grid"
            , Css.property "grid-template-rows" "1fr"
            , Css.property "grid-template-columns" "1fr"
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
                (sizeAreaSubtractPadding sizeArea styleAndEventComputed)
            )
            record.children
        )


rowListToHtml : SizeArea -> RowListAttributes message -> Html.Styled.Html message
rowListToHtml sizeArea (RowListAttributes record) =
    let
        styleAndEventComputed =
            styleAndEventCompute record.style
    in
    Html.Styled.div
        [ Html.Styled.Attributes.css
            [ panelToStyle False styleAndEventComputed
            , Css.property "display" "grid"
            , Css.property "grid-template-columns"
                (sizeListToGridTemplate
                    (List.map Tuple.first record.children)
                )
            , Css.property "gap" (String.fromInt record.gap ++ "px")
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
            (\( size, panel ) ->
                panelToHtml
                    (sizeAreaSubtractPadding { width = size, height = sizeArea.height } styleAndEventComputed)
                    panel
            )
            record.children
        )


columnListToHtml : SizeArea -> ColumnListAttributes message -> Html.Styled.Html message
columnListToHtml sizeArea (ColumnListAttributes record) =
    let
        styleAndEventComputed =
            styleAndEventCompute record.style
    in
    Html.Styled.div
        [ Html.Styled.Attributes.css
            [ panelToStyle False styleAndEventComputed
            , Css.property "display" "grid"
            , Css.property "grid-template-rows"
                (sizeListToGridTemplate
                    (List.map Tuple.first record.children)
                )
            , Css.property "gap" (String.fromInt record.gap ++ "px")
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
        (List.map
            (\( size, panel ) ->
                panelToHtml
                    (sizeAreaSubtractPadding { width = sizeArea.width, height = size } styleAndEventComputed)
                    panel
            )
            record.children
        )


pointerPanelToHtml : SizeArea -> PointerPanelAttributes message -> Html.Styled.Html message
pointerPanelToHtml sizeArea (PointerPanelAttributes record) =
    let
        styleAndEventComputed =
            styleAndEventCompute record.style
    in
    Html.Styled.div
        (List.concat
            [ case record.enterMessage of
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
            (sizeAreaSubtractPadding sizeArea styleAndEventComputed)
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


panelToStyle : Bool -> StyleComputed -> Css.Style
panelToStyle isButtonElement (StyleComputed record) =
    [ [ Css.padding (Css.px (toFloat record.padding)) ]
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
