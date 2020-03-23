module Component.Header exposing (view)

import Component.Style
import Css
import Data
import Data.LogInState
import Dict
import SubData
import Ui


view : Dict.Dict String String -> Data.LogInState.LogInState -> ( Ui.Size, Ui.Panel msg )
view imageBlobUrlDict logInState =
    ( Ui.fix 56
    , Ui.row
        [ Ui.backgroundColor (Css.rgb 36 36 36) ]
        (case logInState of
            Data.LogInState.GuestUser ->
                [ logo, ( Ui.grow, Ui.empty [] ), ( Ui.auto, guestItem ) ]

            Data.LogInState.RequestLogInUrl _ ->
                [ logo, ( Ui.grow, Ui.empty [] ) ]

            Data.LogInState.VerifyingAccessToken _ ->
                [ logo, ( Ui.grow, Ui.empty [] ) ]

            Data.LogInState.Ok record ->
                [ logo, ( Ui.grow, Ui.empty [] ), ( Ui.auto, userIcon imageBlobUrlDict record.user ) ]
        )
    )


logo : ( Ui.Size, Ui.Panel msg )
logo =
    ( Ui.auto
    , Ui.textBox
        (Ui.TextBoxAttributes
            { style = [ Ui.padding 8 ]
            , text = "Definy"
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
    Ui.textBox
        (Ui.TextBoxAttributes
            { style = []
            , text = "ゲスト"
            , typeface = Component.Style.normalTypeface
            , size = 16
            , letterSpacing = 0
            , color = Css.rgb 200 200 200
            , textAlignment = Ui.TextAlignCenter
            }
        )


userIcon : Dict.Dict String String -> Data.UserPublic -> Ui.Panel msg
userIcon imageBlobUrlDict userData =
    Ui.row
        [ Ui.gap 8 ]
        ([ case SubData.getUserImage imageBlobUrlDict userData of
            Just blobUrl ->
                [ ( Ui.auto
                  , Ui.bitmapImage
                        (Ui.BitmapImageAttributes
                            { style = [ Ui.borderRadius (Ui.BorderRadiusPercent 50) ]
                            , url = blobUrl
                            , fitStyle = Ui.Contain
                            , alternativeText = userData.name ++ "のユーザーアイコン"
                            , rendering = Ui.ImageRenderingPixelated
                            }
                        )
                  )
                ]

            Nothing ->
                []
         , [ ( Ui.auto
             , Ui.textBox
                (Ui.TextBoxAttributes
                    { style = []
                    , text = userData.name
                    , typeface = Component.Style.normalTypeface
                    , size = 16
                    , letterSpacing = 0
                    , color = Css.rgb 200 200 200
                    , textAlignment = Ui.TextAlignCenter
                    }
                )
             )
           ]
         ]
            |> List.concat
        )
