module Component.Header exposing (view)

import Component.Style
import Css
import Data
import Data.LogInState
import Dict
import ImageStore
import Ui


view : ImageStore.ImageStore -> Data.LogInState.LogInState -> Ui.Panel msg
view imageStore logInState =
    Ui.row
        [ Ui.backgroundColor (Css.rgb 36 36 36)
        , Ui.width Ui.stretch
        , Ui.height (Ui.fix 56)
        ]
        (case logInState of
            Data.LogInState.GuestUser ->
                [ logo, Ui.empty [ Ui.width Ui.stretch ], guestItem ]

            Data.LogInState.RequestLogInUrl _ ->
                [ logo ]

            Data.LogInState.VerifyingAccessToken _ ->
                [ logo ]

            Data.LogInState.Ok record ->
                [ logo
                , Ui.empty [ Ui.width Ui.stretch ]
                , userItem imageStore record.userSnapshotAndId.snapshot
                ]
        )


logo : Ui.Panel msg
logo =
    Ui.text
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
