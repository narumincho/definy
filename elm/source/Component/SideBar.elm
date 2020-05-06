module Component.SideBar exposing (view)

import CommonUi
import Css
import Data
import Data.LogInState
import Message
import Ui


view : Message.SubModel -> Ui.Panel Data.OpenIdConnectProvider
view subModel =
    Ui.column
        (Ui.fix 260)
        Ui.stretch
        [ Ui.backgroundColor (Css.rgb 36 36 36) ]
        [ logo subModel
        , case Message.getLogInState subModel of
            Data.LogInState.GuestUser ->
                logInPanelLogInButton subModel

            Data.LogInState.RequestLogInUrl _ ->
                CommonUi.normalText 16 "RequestLogInUrl"

            Data.LogInState.VerifyingAccessToken _ ->
                CommonUi.normalText 16 "VerifyingAccessToken"

            Data.LogInState.Ok record ->
                userItem subModel record.userSnapshotAndId
        , partListLink subModel
        , typePartLink subModel
        , Ui.empty Ui.stretch Ui.stretch []
        , resourceLink subModel
        ]


logo : Message.SubModel -> Ui.Panel message
logo subModel =
    CommonUi.sameLanguageLink
        Ui.auto
        Ui.auto
        []
        subModel
        Data.LocationHome
        (Ui.text
            Ui.auto
            Ui.auto
            [ Ui.padding 8 ]
            (Ui.TextAttributes
                { text = "Definy"
                , typeface = CommonUi.codeFontTypeface
                , size = 32
                , letterSpacing = 0
                , lineHeight = 1
                , color = Css.rgb 185 208 155
                , textAlignment = Ui.TextAlignStart
                }
            )
        )


logInPanelLogInButton : Message.SubModel -> Ui.Panel Data.OpenIdConnectProvider
logInPanelLogInButton subModel =
    Ui.column
        Ui.auto
        Ui.auto
        [ Ui.gap 8 ]
        [ googleLogInButton (Message.getLanguage subModel)
        , gitHubLogInButton (Message.getLanguage subModel)
        ]


googleLogInButton : Data.Language -> Ui.Panel Data.OpenIdConnectProvider
googleLogInButton language =
    Ui.row
        (Ui.fix 260)
        (Ui.fix 48)
        [ Ui.borderRadius (Ui.BorderRadiusPx 8)
        , Ui.backgroundColor (Css.rgb 66 133 244)
        , Ui.gap 8
        ]
        [ CommonUi.googleIcon (Css.rgb 255 255 255)
        , Ui.text
            Ui.stretch
            Ui.auto
            []
            (Ui.TextAttributes
                { textAlignment = Ui.TextAlignStart
                , text =
                    case language of
                        Data.LanguageEnglish ->
                            "Sign in with Google"

                        Data.LanguageJapanese ->
                            "Googleでログイン"

                        Data.LanguageEsperanto ->
                            "Ensalutu kun Google"
                , typeface = CommonUi.normalTypeface
                , lineHeight = 1
                , size = 20
                , letterSpacing = 0
                , color = Css.rgb 255 255 255
                }
            )
        ]
        |> Ui.button Ui.auto Ui.auto [] Data.OpenIdConnectProviderGoogle


gitHubLogInButton : Data.Language -> Ui.Panel Data.OpenIdConnectProvider
gitHubLogInButton language =
    Ui.row
        (Ui.fix 260)
        (Ui.fix 48)
        [ Ui.borderRadius (Ui.BorderRadiusPx 8)
        , Ui.backgroundColor (Css.rgb 32 32 32)
        , Ui.gap 8
        ]
        [ CommonUi.gitHubIcon (Css.rgb 255 255 255)
        , Ui.text
            Ui.stretch
            Ui.auto
            []
            (Ui.TextAttributes
                { textAlignment = Ui.TextAlignStart
                , text =
                    case language of
                        Data.LanguageEnglish ->
                            "Sign in with GitHub"

                        Data.LanguageJapanese ->
                            "GitHubでログイン"

                        Data.LanguageEsperanto ->
                            "Ensalutu kun GitHub"
                , typeface = CommonUi.normalTypeface
                , size = 20
                , lineHeight = 1
                , letterSpacing = 0
                , color = Css.rgb 255 255 255
                }
            )
        ]
        |> Ui.button Ui.auto Ui.auto [] Data.OpenIdConnectProviderGitHub


userItem : Message.SubModel -> Data.UserSnapshotAndId -> Ui.Panel msg
userItem subModel userSnapshotAndId =
    CommonUi.sameLanguageLink
        Ui.auto
        Ui.auto
        []
        subModel
        (Data.LocationUser userSnapshotAndId.id)
        (Ui.row
            Ui.auto
            Ui.auto
            [ Ui.gap 8 ]
            [ case
                Message.getImageBlobUrl userSnapshotAndId.snapshot.imageHash subModel
              of
                Just blobUrl ->
                    Ui.bitmapImage
                        (Ui.fix 48)
                        (Ui.fix 48)
                        [ Ui.borderRadius (Ui.BorderRadiusPercent 50) ]
                        (Ui.BitmapImageAttributes
                            { blobUrl = blobUrl
                            , fitStyle = Ui.Contain
                            , alternativeText = userSnapshotAndId.snapshot.name ++ "のユーザーアイコン"
                            , rendering = Ui.ImageRenderingAuto
                            }
                        )

                Nothing ->
                    Ui.empty
                        (Ui.fix 48)
                        (Ui.fix 48)
                        []
            , CommonUi.normalText
                16
                userSnapshotAndId.snapshot.name
            ]
        )


resourceLink : Message.SubModel -> Ui.Panel message
resourceLink subModel =
    Ui.column
        Ui.stretch
        Ui.auto
        []
        [ Ui.row
            Ui.stretch
            Ui.auto
            []
            [ partListLink subModel
            , typePartLink subModel
            ]
        , Ui.row
            Ui.stretch
            Ui.auto
            []
            [ userListLink subModel
            , aboutLink subModel
            ]
        ]


userListLink : Message.SubModel -> Ui.Panel message
userListLink subModel =
    sideBarText "User"


partListLink : Message.SubModel -> Ui.Panel message
partListLink subModel =
    sideBarText "Part"


typePartLink : Message.SubModel -> Ui.Panel message
typePartLink subModel =
    sideBarText "TypePart"


aboutLink : Message.SubModel -> Ui.Panel message
aboutLink subModel =
    sideBarText "About"


sideBarText : String -> Ui.Panel message
sideBarText text =
    Ui.text
        Ui.stretch
        Ui.auto
        [ Ui.padding 8 ]
        (Ui.TextAttributes
            { text = text
            , typeface = CommonUi.codeFontTypeface
            , size = 20
            , letterSpacing = 0
            , lineHeight = 1
            , color = Css.rgb 180 180 180
            , textAlignment = Ui.TextAlignStart
            }
        )
