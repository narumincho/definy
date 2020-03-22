module Ui exposing
    ( BitmapImageAttributes(..)
    , BorderStyle(..)
    , ColumnListAttributes(..)
    , DepthListAttributes(..)
    , FitStyle(..)
    , ImageRendering(..)
    , Panel
    , Pointer
    , PointerImage(..)
    , RowListAttributes(..)
    , TextAlignment(..)
    , TextBoxAttributes(..)
    , VectorImageAttributes(..)
    , backGroundColor
    , bitmapImage
    , border
    , borderRadius
    , column
    , depthList
    , empty
    , map
    , offset
    , onClick
    , onPointerDown
    , onPointerEnter
    , onPointerLeave
    , onPointerMove
    , overflowVisible
    , padding
    , pointerGetPosition
    , pointerImage
    , rowList
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
    = TextBox (TextBoxAttributes message)
    | BitmapImage (BitmapImageAttributes message)
    | VectorImage (VectorImageAttributes message)
    | Empty (StyleAndEventComputed message)
    | DepthList (DepthListAttributes message)
    | RowList (RowListAttributes message)
    | ColumnList (ColumnListAttributes message)


type TextBoxAttributes message
    = TextBoxAttributes
        { styleAndEvent : StyleAndEventComputed message
        , text : String
        , typeface : String
        , size : Int
        , letterSpacing : Float
        , color : Css.Color
        , textAlignment : TextAlignment
        }


type BitmapImageAttributes message
    = BitmapImageAttributes
        { styleAndEvent : StyleAndEventComputed message
        , url : String
        , fitStyle : FitStyle
        , alternativeText : String
        , rendering : ImageRendering
        }


type VectorImageAttributes message
    = VectorImageAttributes
        { styleAndEvent : StyleAndEventComputed message
        , fitStyle : FitStyle
        , viewBox : { x : Int, y : Int, width : Int, height : Int }
        , elements : List (VectorImage.Element message)
        }


type DepthListAttributes message
    = DepthListAttributes
        { styleAndEvent : StyleAndEventComputed message
        , children : List (Panel message)
        }


type RowListAttributes message
    = RowListAttributes
        { styleAndEvent : StyleAndEventComputed message
        , gap : Int
        , children : List ( Size, Panel message )
        }


type ColumnListAttributes message
    = ColumnListAttributes
        { styleAndEvent : StyleAndEventComputed message
        , gap : Int
        , children : List ( Size, Panel message )
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
type StyleAndEventComputed message
    = StyleAndEventComputed
        { padding : Int
        , offset : Maybe ( Int, Int )
        , overflowVisible : Bool
        , pointerImage : Maybe PointerImage
        , border : Maybe BorderStyle
        , borderRadius : Int
        , backGroundColor : Maybe Css.Color
        , onClick : Maybe message
        , onPointerEnter : Maybe (Pointer -> message)
        , onPointerLeave : Maybe (Pointer -> message)
        , onPointerMove : Maybe (Pointer -> message)
        , onPointerDown : Maybe (Pointer -> message)
        }


type StyleAndEvent message
    = Padding Int
    | Offset ( Int, Int )
    | OverflowVisible
    | PointerImage PointerImage
    | Border BorderStyle
    | BorderRadius Int
    | BackGroundColor Css.Color
    | OnClick message
    | OnPointerEnter (Pointer -> message)
    | OnPointerLeave (Pointer -> message)
    | OnPointerMove (Pointer -> message)
    | OnPointerDown (Pointer -> message)


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
    panelToHtml (ChildrenStyle { gridPositionLeftTop = False, position = Nothing })


padding : Int -> StyleAndEvent message
padding =
    Padding


offset : ( Int, Int ) -> StyleAndEvent message
offset =
    Offset


overflowVisible : StyleAndEvent message
overflowVisible =
    OverflowVisible


pointerImage : PointerImage -> StyleAndEvent message
pointerImage =
    PointerImage


border : BorderStyle -> StyleAndEvent message
border =
    Border


borderRadius : Int -> StyleAndEvent message
borderRadius =
    BorderRadius


backGroundColor : Css.Color -> StyleAndEvent message
backGroundColor =
    BackGroundColor


onClick : message -> StyleAndEvent message
onClick =
    OnClick


onPointerEnter : (Pointer -> message) -> StyleAndEvent message
onPointerEnter =
    OnPointerEnter


onPointerLeave : (Pointer -> message) -> StyleAndEvent message
onPointerLeave =
    OnPointerLeave


onPointerMove : (Pointer -> message) -> StyleAndEvent message
onPointerMove =
    OnPointerMove


onPointerDown : (Pointer -> message) -> StyleAndEvent message
onPointerDown =
    OnPointerDown


{-| テキストボックス
-}
textBox :
    TextBoxAttributes message
    -> Panel message
textBox =
    TextBox


{-| ビットマップ画像
-}
bitmapImage : BitmapImageAttributes message -> Panel message
bitmapImage =
    BitmapImage


{-| ベクター画像
-}
vectorImage : VectorImageAttributes message -> Panel message
vectorImage =
    VectorImage


{-| からのパネル
-}
empty : List (StyleAndEvent message) -> Panel message
empty styleAndEventList =
    Empty (styleAndEventCompute styleAndEventList)


{-| パネルを同じ領域に重ねる
-}
depthList : DepthListAttributes message -> Panel message
depthList =
    DepthList


{-| 横方向に並べる
-}
rowList : RowListAttributes message -> Panel message
rowList =
    RowList


{-| 縦方向に並べる
-}
column : ColumnListAttributes message -> Panel message
column =
    ColumnList


styleAndEventCompute : List (StyleAndEvent message) -> StyleAndEventComputed message
styleAndEventCompute list =
    case list of
        x :: xs ->
            let
                (StyleAndEventComputed rest) =
                    styleAndEventCompute xs
            in
            StyleAndEventComputed
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

                    OnClick message ->
                        { rest | onClick = Just message }

                    OnPointerEnter function ->
                        { rest | onPointerEnter = Just function }

                    OnPointerLeave function ->
                        { rest | onPointerLeave = Just function }

                    OnPointerMove function ->
                        { rest | onPointerMove = Just function }

                    OnPointerDown function ->
                        { rest | onPointerDown = Just function }
                )

        [] ->
            defaultStyleAndEvent


defaultStyleAndEvent : StyleAndEventComputed message
defaultStyleAndEvent =
    StyleAndEventComputed
        { padding = 0
        , offset = Nothing
        , overflowVisible = False
        , pointerImage = Nothing
        , border = Nothing
        , borderRadius = 0
        , backGroundColor = Nothing
        , onClick = Nothing
        , onPointerEnter = Nothing
        , onPointerLeave = Nothing
        , onPointerMove = Nothing
        , onPointerDown = Nothing
        }


map : (a -> b) -> Panel a -> Panel b
map func panel =
    case panel of
        TextBox (TextBoxAttributes record) ->
            TextBox
                (TextBoxAttributes
                    { styleAndEvent = styleAndEventMap func record.styleAndEvent
                    , text = record.text
                    , typeface = record.typeface
                    , letterSpacing = record.letterSpacing
                    , size = record.size
                    , color = record.color
                    , textAlignment = record.textAlignment
                    }
                )

        BitmapImage (BitmapImageAttributes record) ->
            BitmapImage
                (BitmapImageAttributes
                    { styleAndEvent = styleAndEventMap func record.styleAndEvent
                    , url = String
                    , fitStyle = record.fitStyle
                    , alternativeText = String
                    , rendering = record.rendering
                    }
                )

        VectorImage (VectorImageAttributes record) ->
            VectorImage
                (VectorImageAttributes
                    { styleAndEvent = styleAndEventMap func record.styleAndEvent
                    , fitStyle = record.fitStyle
                    , viewBox = record.viewBox
                    , elements = List.map (VectorImage.map func) record.elements
                    }
                )

        Empty styleAndEvent ->
            Empty (styleAndEventMap func styleAndEvent)

        DepthList (DepthListAttributes record) ->
            DepthList
                (DepthListAttributes
                    { styleAndEvent = styleAndEventMap func record.styleAndEvent
                    , children = List.map (map func) record.children
                    }
                )

        RowList (RowListAttributes record) ->
            RowList
                (RowListAttributes
                    { styleAndEvent = styleAndEventMap func record.styleAndEvent
                    , gap = record.gap
                    , children = List.map (Tuple.mapSecond (map func)) record.children
                    }
                )

        ColumnList (ColumnListAttributes record) ->
            ColumnList
                (ColumnListAttributes
                    { styleAndEvent = styleAndEventMap func record.styleAndEvent
                    , gap = record.gap
                    , children = List.map (Tuple.mapSecond (map func)) record.children
                    }
                )


styleAndEventMap : (a -> b) -> StyleAndEventComputed a -> StyleAndEventComputed b
styleAndEventMap func (StyleAndEventComputed record) =
    StyleAndEventComputed
        { padding = record.padding
        , offset = record.offset
        , overflowVisible = record.overflowVisible
        , pointerImage = record.pointerImage
        , border = record.border
        , borderRadius = record.borderRadius
        , backGroundColor = record.backGroundColor
        , onClick = Maybe.map func record.onClick
        , onPointerEnter = Maybe.map (\msgFunc pointer -> msgFunc pointer |> func) record.onPointerEnter
        , onPointerLeave = Maybe.map (\msgFunc pointer -> msgFunc pointer |> func) record.onPointerLeave
        , onPointerMove = Maybe.map (\msgFunc pointer -> msgFunc pointer |> func) record.onPointerLeave
        , onPointerDown = Maybe.map (\msgFunc pointer -> msgFunc pointer |> func) record.onPointerDown
        }


type ChildrenStyle
    = ChildrenStyle
        { gridPositionLeftTop : Bool
        , position : Maybe ( Int, Int )
        }


styleAndEventComputedGetClickEvent : StyleAndEventComputed message -> Maybe message
styleAndEventComputedGetClickEvent (StyleAndEventComputed record) =
    record.onClick


panelToHtml : ChildrenStyle -> Panel msg -> Html.Styled.Html msg
panelToHtml childrenStyle panel =
    case panel of
        TextBox textBoxAttributes ->
            textBoxToHtml textBoxAttributes

        BitmapImage imageFromUrlAttributes ->
            imageFromUrlToHtml imageFromUrlAttributes

        VectorImage vectorImageAttributes ->
            vectorImageToHtml vectorImageAttributes

        Empty styleAndEvent ->
            emptyToHtml styleAndEvent

        DepthList depthListAttributes ->
            depthListToHtml depthListAttributes

        RowList rowListAttributes ->
            rowListToHtml rowListAttributes

        ColumnList columnListAttributes ->
            columnListToHtml columnListAttributes


textBoxToHtml : TextBoxAttributes message -> Html.Styled.Html message
textBoxToHtml (TextBoxAttributes record) =
    case styleAndEventComputedGetClickEvent record.styleAndEvent of
        Just clickEvent ->
            Html.Styled.button
                ([ Html.Styled.Attributes.css
                    [ panelToStyle True record.styleAndEvent
                    , Css.color record.color
                    , Css.fontSize (Css.px (toFloat record.size))
                    , Css.fontFamilies [ Css.qt record.typeface ]
                    , Css.letterSpacing (Css.px record.letterSpacing)
                    , Css.overflowWrap Css.breakWord
                    , textAlignToStyle record.textAlignment
                    ]
                 , Html.Styled.Events.onClick clickEvent
                 ]
                    ++ eventsToHtmlAttributes record.styleAndEvent
                )
                [ Html.Styled.text record.text ]

        Nothing ->
            Html.Styled.div
                ([ Html.Styled.Attributes.css
                    [ panelToStyle False record.styleAndEvent
                    , Css.color record.color
                    , Css.fontSize (Css.px (toFloat record.size))
                    , Css.fontFamilies [ Css.qt record.typeface ]
                    , Css.letterSpacing (Css.px record.letterSpacing)
                    , Css.overflowWrap Css.breakWord
                    , textAlignToStyle record.textAlignment
                    ]
                 ]
                    ++ eventsToHtmlAttributes record.styleAndEvent
                )
                [ Html.Styled.text record.text ]


imageFromUrlToHtml : BitmapImageAttributes message -> Html.Styled.Html message
imageFromUrlToHtml (BitmapImageAttributes record) =
    case styleAndEventComputedGetClickEvent record.styleAndEvent of
        Just clickEvent ->
            Html.Styled.button
                [ Html.Styled.Attributes.css
                    [ panelToStyle True record.styleAndEvent
                    ]
                , Html.Styled.Events.onClick clickEvent
                ]
                [ Html.Styled.img
                    [ Html.Styled.Attributes.css
                        ([ Css.property "object-fit"
                            (case record.fitStyle of
                                Contain ->
                                    "contain"

                                Cover ->
                                    "cover"
                            )
                         , Css.display Css.block
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
                ]

        Nothing ->
            Html.Styled.img
                ([ Html.Styled.Attributes.css
                    ([ panelToStyle False record.styleAndEvent
                     , Css.property "object-fit"
                        (case record.fitStyle of
                            Contain ->
                                "contain"

                            Cover ->
                                "cover"
                        )
                     , Css.display Css.block
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
                    ++ eventsToHtmlAttributes record.styleAndEvent
                )
                []


vectorImageToHtml : VectorImageAttributes message -> Html.Styled.Html message
vectorImageToHtml (VectorImageAttributes record) =
    case styleAndEventComputedGetClickEvent record.styleAndEvent of
        Just clickEvent ->
            Html.Styled.button
                ([ Html.Styled.Attributes.css
                    [ panelToStyle False record.styleAndEvent ]
                 , Html.Styled.Events.onClick clickEvent
                 ]
                    ++ eventsToHtmlAttributes record.styleAndEvent
                )
                [ VectorImage.toHtml
                    record.viewBox
                    Nothing
                    record.elements
                ]

        Nothing ->
            Html.Styled.div
                ([ Html.Styled.Attributes.css
                    [ panelToStyle False record.styleAndEvent ]
                 ]
                    ++ eventsToHtmlAttributes record.styleAndEvent
                )
                [ VectorImage.toHtml
                    record.viewBox
                    Nothing
                    record.elements
                ]


emptyToHtml : StyleAndEventComputed message -> Html.Styled.Html message
emptyToHtml styleAndEvent =
    case styleAndEventComputedGetClickEvent styleAndEvent of
        Just clickEvent ->
            Html.Styled.button
                ([ Html.Styled.Attributes.css [ panelToStyle True styleAndEvent ]
                 , Html.Styled.Events.onClick clickEvent
                 ]
                    ++ eventsToHtmlAttributes styleAndEvent
                )
                []

        Nothing ->
            Html.Styled.div
                ([ Html.Styled.Attributes.css [ panelToStyle False styleAndEvent ] ]
                    ++ eventsToHtmlAttributes styleAndEvent
                )
                []


depthListToHtml :
    DepthListAttributes message
    -> Html.Styled.Html message
depthListToHtml (DepthListAttributes record) =
    Html.Styled.div
        (List.concat
            [ [ Html.Styled.Attributes.css
                    [ panelToStyle False record.styleAndEvent
                    , Css.property "display" "grid"
                    , Css.property "grid-template-rows" "1fr"
                    , Css.property "grid-template-columns" "1fr"
                    ]
              ]
            , eventsToHtmlAttributes record.styleAndEvent
            ]
        )
        (List.map
            (panelToHtml
                (ChildrenStyle
                    { gridPositionLeftTop = True
                    , position = Nothing
                    }
                )
            )
            record.children
        )


rowListToHtml : RowListAttributes message -> Html.Styled.Html message
rowListToHtml (RowListAttributes record) =
    Html.Styled.div
        (List.concat
            [ [ Html.Styled.Attributes.css
                    [ panelToStyle False record.styleAndEvent
                    , Css.property "display" "grid"
                    , Css.property "grid-template-columns"
                        (sizeListToGridTemplate
                            (List.map Tuple.first record.children)
                        )
                    , Css.property "gap" (String.fromInt record.gap ++ "px")
                    ]
              ]
            , eventsToHtmlAttributes record.styleAndEvent
            ]
        )
        (List.map
            (\( _, panel ) ->
                panelToHtml
                    (ChildrenStyle
                        { gridPositionLeftTop = False
                        , position = Nothing
                        }
                    )
                    panel
            )
            record.children
        )


columnListToHtml : ColumnListAttributes message -> Html.Styled.Html message
columnListToHtml (ColumnListAttributes record) =
    Html.Styled.div
        (List.concat
            [ [ Html.Styled.Attributes.css
                    [ panelToStyle False record.styleAndEvent
                    , Css.property "display" "grid"
                    , Css.property "grid-template-rows"
                        (sizeListToGridTemplate
                            (List.map Tuple.first record.children)
                        )
                    , Css.property "gap" (String.fromInt record.gap ++ "px")
                    ]
              ]
            , eventsToHtmlAttributes record.styleAndEvent
            ]
        )
        (List.map
            (\( _, panel ) ->
                panelToHtml
                    (ChildrenStyle
                        { gridPositionLeftTop = False
                        , position = Nothing
                        }
                    )
                    panel
            )
            record.children
        )


panelToStyle : Bool -> StyleAndEventComputed message -> Css.Style
panelToStyle isButtonElement (StyleAndEventComputed record) =
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
        0 ->
            if isButtonElement then
                [ Css.borderRadius Css.zero ]

            else
                []

        _ ->
            [ Css.borderRadius (Css.px (toFloat record.borderRadius)) ]
    , case record.backGroundColor of
        Just color ->
            [ Css.backgroundColor color ]

        Nothing ->
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


{-| イベントをElmのイベントリスナーの属性に変換する
-}
eventsToHtmlAttributes : StyleAndEventComputed msg -> List (Html.Styled.Attribute msg)
eventsToHtmlAttributes (StyleAndEventComputed record) =
    [ record.onPointerEnter
        |> Maybe.map (\msg -> Html.Styled.Events.on "pointerenter" (pointerEventDecoder |> Json.Decode.map msg))
    , record.onPointerLeave
        |> Maybe.map (\msg -> Html.Styled.Events.on "pointerleave" (pointerEventDecoder |> Json.Decode.map msg))
    , record.onPointerMove
        |> Maybe.map (\msg -> Html.Styled.Events.on "pointermove" (pointerEventDecoder |> Json.Decode.map msg))
    , record.onPointerDown
        |> Maybe.map (\msg -> Html.Styled.Events.on "pointerdown" (pointerEventDecoder |> Json.Decode.map msg))
    ]
        |> Utility.ListExtra.takeFromMaybeList


pointerEventDecoder : Json.Decode.Decoder Pointer
pointerEventDecoder =
    Json.Decode.succeed
        (\id clientX clientY button pressure tangentialPressure width_ height_ tiltX tiltY twist pointerType isPrimary buttons eventPhase ->
            Pointer
                { id = id
                , position = ( clientX, clientY )
                , button =
                    case button of
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


gridSetPosition : Css.Style
gridSetPosition =
    Css.batch
        [ Css.property "grid-row" "1 / 2"
        , Css.property "grid-column" "1 / 2"
        ]


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


pointerGetPosition : Pointer -> ( Float, Float )
pointerGetPosition (Pointer { position }) =
    position
