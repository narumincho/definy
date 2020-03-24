module Component.Header exposing (view)

import Component.Style
import Css
import Data
import Data.LogInState
import Dict
import SubData
import Ui


view : Dict.Dict String String -> Data.LogInState.LogInState -> Ui.Panel msg
view imageBlobUrlDict logInState =
    Ui.row
        [ Ui.backgroundColor (Css.rgb 36 36 36), Ui.height (Ui.fix 56 Ui.start) ]
        (case logInState of
            Data.LogInState.GuestUser ->
                [ logo, Ui.empty [], guestItem ]

            Data.LogInState.RequestLogInUrl _ ->
                [ logo, Ui.empty [] ]

            Data.LogInState.VerifyingAccessToken _ ->
                [ logo, Ui.empty [] ]

            Data.LogInState.Ok record ->
                [ logo, Ui.empty [], userItem imageBlobUrlDict record.user ]
        )


logo : Ui.Panel msg
logo =
    Ui.textBox
        [ Ui.padding 8, Ui.width (Ui.auto Ui.start) ]
        (Ui.TextBoxAttributes
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
    Ui.textBox
        [ Ui.width (Ui.auto Ui.start) ]
        (Ui.TextBoxAttributes
            { text = "ゲスト"
            , typeface = Component.Style.normalTypeface
            , size = 16
            , letterSpacing = 0
            , color = Css.rgb 200 200 200
            , textAlignment = Ui.TextAlignCenter
            }
        )


userItem : Dict.Dict String String -> Data.UserPublic -> Ui.Panel msg
userItem imageBlobUrlDict userData =
    Ui.row
        [ Ui.gap 8 ]
        ([ case SubData.getUserImage imageBlobUrlDict userData of
            Just blobUrl ->
                [ Ui.bitmapImage
                    [ Ui.width (Ui.auto Ui.start), Ui.borderRadius (Ui.BorderRadiusPercent 50) ]
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
         , [ Ui.textBox
                [ Ui.width (Ui.auto Ui.start), Ui.height (Ui.auto Ui.center) ]
                (Ui.TextBoxAttributes
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
