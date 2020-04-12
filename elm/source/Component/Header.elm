module Component.Header exposing (view)

import CommonUi
import Css
import Data
import Data.LogInState
import ImageStore
import SubModel
import Ui


view : SubModel.SubModel -> Ui.Panel message
view subModel =
    Ui.row
        [ Ui.backgroundColor (Css.rgb 36 36 36)
        , Ui.width Ui.stretch
        , Ui.height (Ui.fix 56)
        ]
        (case SubModel.getLogInState subModel of
            Data.LogInState.GuestUser ->
                [ logo subModel, Ui.empty [ Ui.width Ui.stretch ], guestItem ]

            Data.LogInState.RequestLogInUrl _ ->
                [ logo subModel ]

            Data.LogInState.VerifyingAccessToken _ ->
                [ logo subModel ]

            Data.LogInState.Ok record ->
                [ logo subModel
                , Ui.empty [ Ui.width Ui.stretch ]
                , userItem subModel record.userSnapshotAndId
                ]
        )


logo : SubModel.SubModel -> Ui.Panel message
logo subModel =
    CommonUi.sameLanguageLink
        []
        subModel
        Data.LocationHome
        (Ui.text
            [ Ui.padding 8 ]
            (Ui.TextAttributes
                { text = "Definy"
                , typeface = CommonUi.codeFontTypeface
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
            , typeface = CommonUi.normalTypeface
            , size = 16
            , letterSpacing = 0
            , color = Css.rgb 200 200 200
            , textAlignment = Ui.TextAlignCenter
            }
        )


userItem : SubModel.SubModel -> Data.UserSnapshotAndId -> Ui.Panel msg
userItem subModel userSnapshotAndId =
    CommonUi.sameLanguageLink
        []
        subModel
        (Data.LocationUser userSnapshotAndId.id)
        (Ui.row
            [ Ui.gap 8 ]
            [ case
                ImageStore.getImageBlobUrl userSnapshotAndId.snapshot.imageHash
                    (SubModel.getImageStore subModel)
              of
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
                    , typeface = CommonUi.normalTypeface
                    , size = 16
                    , letterSpacing = 0
                    , color = Css.rgb 200 200 200
                    , textAlignment = Ui.TextAlignCenter
                    }
                )
            ]
        )
