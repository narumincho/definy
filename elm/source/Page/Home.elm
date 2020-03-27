module Page.Home exposing
    ( Model
    , Msg(..)
    , init
    , update
    , view
    )

import Command
import Component.Style
import Css
import Data
import Data.LogInState
import Data.UrlData
import Icon
import Ui


type Model
    = Model


type Msg
    = PushUrl Data.UrlData
    | NoOp


init : Model
init =
    Model


update : Msg -> Model -> ( Model, Command.Command )
update msg _ =
    case msg of
        PushUrl urlData ->
            ( Model
            , Command.pushUrl urlData
            )

        NoOp ->
            ( Model
            , Command.none
            )


view : Data.ClientMode -> Data.Language -> Data.LogInState.LogInState -> Model -> Ui.Panel Msg
view clientMode language logInState _ =
    Ui.scroll
        [ Ui.width Ui.stretch, Ui.height Ui.stretch ]
        (Ui.column
            [ Ui.gap 16, Ui.height Ui.stretch ]
            [ projectList clientMode language logInState ]
        )


projectList : Data.ClientMode -> Data.Language -> Data.LogInState.LogInState -> Ui.Panel Msg
projectList clientMode language logInState =
    Ui.column
        [ Ui.height Ui.stretch
        , Ui.gap 8
        , Ui.width Ui.auto
        , Ui.padding 8
        ]
        [ projectLineFirstCreateButton clientMode language logInState
        , projectLine
        , projectLine
        , projectLine
        , projectLine
        , projectLine
        , projectLine
        ]


createProjectButton : Data.ClientMode -> Data.Language -> Data.LogInState.LogInState -> Ui.Panel Msg
createProjectButton clientMode language logInState =
    case logInState of
        Data.LogInState.RequestLogInUrl _ ->
            Ui.text
                [ Ui.width (Ui.stretchWithMaxSize 320) ]
                (Ui.TextAttributes
                    { text = "......"
                    , typeface = Component.Style.normalTypeface
                    , size = 16
                    , letterSpacing = 0
                    , color = Css.rgb 200 200 200
                    , textAlignment = Ui.TextAlignStart
                    }
                )

        Data.LogInState.VerifyingAccessToken _ ->
            Ui.text
                [ Ui.width (Ui.stretchWithMaxSize 320) ]
                (Ui.TextAttributes
                    { text =
                        case language of
                            Data.LanguageEnglish ->
                                "Verifying..."

                            Data.LanguageJapanese ->
                                "認証中…"

                            Data.LanguageEsperanto ->
                                "Aŭtentigado ..."
                    , typeface = Component.Style.normalTypeface
                    , size = 16
                    , letterSpacing = 0
                    , color = Css.rgb 200 200 200
                    , textAlignment = Ui.TextAlignStart
                    }
                )

        Data.LogInState.GuestUser ->
            Ui.text
                [ Ui.width (Ui.stretchWithMaxSize 320) ]
                (Ui.TextAttributes
                    { text =
                        case language of
                            Data.LanguageEnglish ->
                                "Creating guest user projects has not been completed yet"

                            Data.LanguageJapanese ->
                                "ゲストユーザーのプロジェクトの作成は,まだできていない"

                            Data.LanguageEsperanto ->
                                "Krei projektojn de invititaj uzantoj ankoraŭ ne estas finita"
                    , typeface = Component.Style.normalTypeface
                    , size = 16
                    , letterSpacing = 0
                    , color = Css.rgb 200 200 200
                    , textAlignment = Ui.TextAlignStart
                    }
                )

        Data.LogInState.Ok _ ->
            createProjectButtonLogInOk clientMode language


createProjectButtonLogInOk : Data.ClientMode -> Data.Language -> Ui.Panel Msg
createProjectButtonLogInOk clientMode language =
    let
        createProjectUrl : Data.UrlData
        createProjectUrl =
            { clientMode = clientMode
            , location = Data.LocationCreateProject
            , language = language
            , accessToken = Nothing
            }
    in
    Ui.link
        [ Ui.width (Ui.stretchWithMaxSize 320)
        , Ui.height Ui.stretch
        , Ui.border
            (Ui.BorderStyle
                { color = Css.rgb 200 200 200
                , width =
                    { top = 1
                    , right = 1
                    , left = 1
                    , bottom = 1
                    }
                }
            )
        ]
        (Ui.LinkAttributes
            { url = Data.UrlData.urlDataToString createProjectUrl
            , clickMessage = PushUrl createProjectUrl
            , noOpMessage = NoOp
            , child =
                Ui.depth
                    [ Ui.width (Ui.stretchWithMaxSize 320)
                    , Ui.height Ui.stretch
                    , Ui.border
                        (Ui.BorderStyle
                            { color = Css.rgb 200 200 200
                            , width =
                                { top = 1
                                , right = 1
                                , left = 1
                                , bottom = 1
                                }
                            }
                        )
                    ]
                    [ ( ( Ui.Center, Ui.Center )
                      , Ui.column
                            []
                            [ Icon.plus
                            , Ui.text
                                []
                                (Ui.TextAttributes
                                    { text =
                                        case language of
                                            Data.LanguageEnglish ->
                                                "Create a new project"

                                            Data.LanguageJapanese ->
                                                "プロジェクトを新規作成"

                                            Data.LanguageEsperanto ->
                                                "Krei novan projekton"
                                    , typeface = Component.Style.normalTypeface
                                    , size = 16
                                    , letterSpacing = 0
                                    , color = Css.rgb 200 200 200
                                    , textAlignment = Ui.TextAlignStart
                                    }
                                )
                            ]
                      )
                    ]
            }
        )


projectLineFirstCreateButton : Data.ClientMode -> Data.Language -> Data.LogInState.LogInState -> Ui.Panel Msg
projectLineFirstCreateButton clientMode language logInState =
    Ui.row
        [ Ui.gap 8, Ui.height (Ui.fix 200) ]
        [ createProjectButton clientMode language logInState
        , projectItem
        , projectItem
        ]


projectLine : Ui.Panel message
projectLine =
    Ui.row
        [ Ui.gap 8, Ui.height (Ui.fix 200) ]
        [ projectItem
        , projectItem
        , projectItem
        ]


projectItem : Ui.Panel message
projectItem =
    Ui.depth
        [ Ui.width (Ui.stretchWithMaxSize 320), Ui.height Ui.stretch ]
        [ ( ( Ui.Center, Ui.Center )
          , Ui.bitmapImage
                [ Ui.width Ui.stretch, Ui.height Ui.stretch ]
                (Ui.BitmapImageAttributes
                    { url = "https://narumincho.com/assets/definy20190212.jpg"
                    , fitStyle = Ui.Cover
                    , alternativeText = "プロジェクト画像"
                    , rendering = Ui.ImageRenderingPixelated
                    }
                )
          )
        , ( ( Ui.Center, Ui.End )
          , Ui.text
                [ Ui.width Ui.stretch, Ui.backgroundColor (Css.rgba 0 0 0 0.6), Ui.padding 8 ]
                (Ui.TextAttributes
                    { text = "プロジェクト名"
                    , typeface = Component.Style.normalTypeface
                    , size = 16
                    , letterSpacing = 0
                    , color = Css.rgb 200 200 200
                    , textAlignment = Ui.TextAlignStart
                    }
                )
          )
        ]
