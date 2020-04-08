module Component.Header exposing (Message(..), view)

import Component.Style
import Css
import Data
import Data.LogInState
import Data.UrlData
import ImageStore
import Ui


type Message
    = ToHome
    | NoOperation


view : Data.ClientMode -> Data.Language -> ImageStore.ImageStore -> Data.LogInState.LogInState -> Ui.Panel Message
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
                , userItem imageStore record.userSnapshotAndId.snapshot
                ]
        )


logo : Data.ClientMode -> Data.Language -> Ui.Panel Message
logo clientMode language =
    Ui.link
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


userItem : ImageStore.ImageStore -> Data.UserSnapshot -> Ui.Panel msg
userItem imageStore userData =
    Ui.row
        [ Ui.gap 8 ]
        ([ case ImageStore.getImageBlobUrl userData.imageHash imageStore of
            Just blobUrl ->
                [ Ui.bitmapImage
                    [ Ui.width (Ui.fix 48)
                    , Ui.height (Ui.fix 48)
                    , Ui.borderRadius (Ui.BorderRadiusPercent 50)
                    ]
                    (Ui.BitmapImageAttributes
                        { url = blobUrl
                        , fitStyle = Ui.Contain
                        , alternativeText = userData.name ++ "のユーザーアイコン"
                        , rendering = Ui.ImageRenderingPixelated
                        }
                    )
                ]

            Nothing ->
                []
         , [ Ui.text
                []
                (Ui.TextAttributes
                    { text = userData.name
                    , typeface = Component.Style.normalTypeface
                    , size = 16
                    , letterSpacing = 0
                    , color = Css.rgb 200 200 200
                    , textAlignment = Ui.TextAlignCenter
                    }
                )
           ]
         ]
            |> List.concat
        )
