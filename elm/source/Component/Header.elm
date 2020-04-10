module Component.Header exposing (view)

import Component.Style
import Css
import Data
import Data.LogInState
import ImageStore
import Ui


view : Data.ClientMode -> Data.Language -> ImageStore.ImageStore -> Data.LogInState.LogInState -> Ui.Panel message
view clientMode language imageStore logInState =
    Ui.row
        [ Ui.backgroundColor (Css.rgb 36 36 36)
        , Ui.width Ui.stretch
        , Ui.height (Ui.fix 56)
        ]
        (case logInState of
            Data.LogInState.GuestUser ->
                [ logo clientMode language, Ui.empty [ Ui.width Ui.stretch ], guestItem ]

            Data.LogInState.RequestLogInUrl _ ->
                [ logo clientMode language ]

            Data.LogInState.VerifyingAccessToken _ ->
                [ logo clientMode language ]

            Data.LogInState.Ok record ->
                [ logo clientMode language
                , Ui.empty [ Ui.width Ui.stretch ]
                , userItem clientMode language imageStore record.userSnapshotAndId
                ]
        )


logo : Data.ClientMode -> Data.Language -> Ui.Panel message
logo clientMode language =
    Component.Style.link
        []
        { clientMode = clientMode
        , language = language
        , location = Data.LocationHome
        }
        (Ui.text
            [ Ui.padding 8 ]
            (Ui.TextAttributes
                { text = "Definy"
                , typeface = Component.Style.codeFontTypeface
                , size = 32
                , letterSpacing = 0
                , color = Css.rgb 185 208 155
                , textAlignment = Ui.TextAlignStart
                }
            )
        )


guestItem : Ui.Panel msg
guestItem =
    Ui.text
        []
        (Ui.TextAttributes
            { text = "ゲスト"
            , typeface = Component.Style.normalTypeface
            , size = 16
            , letterSpacing = 0
            , color = Css.rgb 200 200 200
            , textAlignment = Ui.TextAlignCenter
            }
        )


userItem : Data.ClientMode -> Data.Language -> ImageStore.ImageStore -> Data.UserSnapshotAndId -> Ui.Panel msg
userItem clientMode language imageStore userSnapshotAndId =
    Component.Style.link
        []
        { clientMode = clientMode
        , language = language
        , location = Data.LocationUser userSnapshotAndId.id
        }
        (Ui.row
            [ Ui.gap 8 ]
            [ case ImageStore.getImageBlobUrl userSnapshotAndId.snapshot.imageHash imageStore of
                Just blobUrl ->
                    Ui.bitmapImage
                        [ Ui.width (Ui.fix 48)
                        , Ui.height (Ui.fix 48)
                        , Ui.borderRadius (Ui.BorderRadiusPercent 50)
                        ]
                        (Ui.BitmapImageAttributes
                            { url = blobUrl
                            , fitStyle = Ui.Contain
                            , alternativeText = userSnapshotAndId.snapshot.name ++ "のユーザーアイコン"
                            , rendering = Ui.ImageRenderingPixelated
                            }
                        )

                Nothing ->
                    Ui.empty
                        [ Ui.width (Ui.fix 48)
                        , Ui.height (Ui.fix 48)
                        ]
            , Ui.text
                []
                (Ui.TextAttributes
                    { text = userSnapshotAndId.snapshot.name
                    , typeface = Component.Style.normalTypeface
                    , size = 16
                    , letterSpacing = 0
                    , color = Css.rgb 200 200 200
                    , textAlignment = Ui.TextAlignCenter
                    }
                )
            ]
        )
