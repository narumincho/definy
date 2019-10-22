module Component.Side exposing
    ( Cmd(..)
    , Model
    , Msg(..)
    , Tab
    , initModel
    , update
    , view
    )

{-| サイトパネル
-}

import Color
import Css
import Data.Label
import Data.Language
import Data.Project
import Data.SocialLoginService
import Data.User
import Html.Styled
import Html.Styled.Attributes
import Html.Styled.Events
import Palette.X11
import Component.Style as Style
import Svg.Styled
import Svg.Styled.Attributes
import VectorImage


type Model
    = Model { selectTab : Tab }


type Msg
    = SignOutRequest
    | SelectUp
    | SelectDown
    | SelectParentOrTreeClose
    | SelectFirstChildOrTreeOpen
    | SelectItem
    | Focus


type Cmd
    = CmdLogOutRequest
    | CmdLogInRequest Data.SocialLoginService.SocialLoginService
    | CmdFocusHere


type Tab
    = Document
    | ModuleTree
    | ProjectImport
    | Search
    | Version
    | ToDoList


initModel : Model
initModel =
    Model
        { selectTab = ModuleTree
        }


update : Msg -> Model -> ( Model, List Cmd )
update msg (Model rec) =
    case msg of
        SignOutRequest ->
            ( Model rec
            , [ CmdLogOutRequest ]
            )

        Focus ->
            ( Model rec
            , [ CmdFocusHere ]
            )

        _ ->
            ( Model rec
            , []
            )



{- =======================================================
                        View
   =======================================================
-}


view :
    { width : Int
    , height : Int
    , logInState : Data.User.LogInState
    , language : Data.Language.Language
    , project : Data.Project.Project
    , focus : Bool
    }
    -> Model
    -> Html.Styled.Html Msg
view { logInState, language, project, focus, width } (Model { selectTab }) =
    Html.Styled.div
        ([ Html.Styled.Attributes.css
            [ Css.backgroundColor
                (if focus then
                    Css.rgb 45 45 45

                 else
                    Css.rgb 17 17 17
                )
            , Css.displayFlex
            , Css.flexDirection Css.column
            , Css.flexShrink Css.zero
            , Css.overflowY Css.auto
            , Css.width (Css.px (toFloat width))
            ]
         ]
            ++ (if focus then
                    []

                else
                    [ Html.Styled.Events.onClick Focus ]
               )
        )
        [ definyLogo
        , userView
            { user = Nothing
            , language = language
            }
        , projectOwnerAndName
            (Data.Project.getLeaderName project)
            (Data.Project.getName project)
        , tools
        ]


definyLogo : Html.Styled.Html msg
definyLogo =
    Html.Styled.div
        [ Html.Styled.Attributes.css
            [ Css.displayFlex
            , Css.justifyContent Css.center
            ]
        ]
        [ Html.Styled.div
            [ Html.Styled.Attributes.css
                [ Css.color (Css.rgb 185 208 155)
                , Css.padding (Css.px 3)
                , Css.fontSize (Css.rem 2)
                , Css.textShadow4 Css.zero (Css.px 1) (Css.px 2) (Css.rgba 0 0 0 0.2)
                , Css.property "user-select" "none"
                , Css.fontWeight (Css.int 300)
                ]
            ]
            [ Html.Styled.text "Definy" ]
        ]


userView :
    { user : Maybe Data.User.User
    , language : Data.Language.Language
    }
    -> Html.Styled.Html Msg
userView { user, language } =
    Html.Styled.div
        [ Html.Styled.Attributes.css
            [ Style.textColorStyle
            , Css.property "display" "grid"
            , Css.property "gap" "10px"
            , Css.padding (Css.px 8)
            ]
        ]
        (case user of
            Just u ->
                [ Html.Styled.div
                    [ Html.Styled.Attributes.css
                        [ Css.displayFlex ]
                    ]
                    [ Html.Styled.div
                        []
                        [ Html.Styled.text (Data.User.getName u) ]
                    ]
                ]

            Nothing ->
                [ Html.Styled.div
                    []
                    []
                ]
        )


logInStateNormalView : Data.Language.Language -> List (Html.Styled.Html Msg)
logInStateNormalView language =
    [ Html.Styled.div
        [ Html.Styled.Attributes.css
            [ Css.cursor Css.pointer ]
        ]
        [ Html.Styled.text
            (case language of
                Data.Language.Japanese ->
                    "ログイン"

                Data.Language.Esperanto ->
                    "Ensaluti"

                Data.Language.English ->
                    "Log In"
            )
        ]
    ]


logInButtonNoLine :
    Html.Styled.Html Msg
    -> Data.Language.Language
    -> Data.SocialLoginService.SocialLoginService
    -> Html.Styled.Html Msg
logInButtonNoLine icon language service =
    Html.Styled.div
        [ Html.Styled.Attributes.css
            [ Css.backgroundColor (Css.rgb 232 232 232)
            , Css.borderRadius (Css.px 4)
            , Css.border2 Css.zero Css.none
            , Css.color (Css.rgb 17 17 17)
            , Css.displayFlex
            , Css.alignItems Css.center
            , Css.padding Css.zero
            , Css.cursor Css.pointer
            , Css.hover
                [ Css.backgroundColor (Css.rgb 255 255 255) ]
            , Css.active
                [ Css.backgroundColor (Css.rgb 204 204 204) ]
            ]
        ]
        [ icon
        , logInButtonText
            (case language of
                Data.Language.Japanese ->
                    Data.SocialLoginService.serviceName service ++ "でログイン"

                Data.Language.Esperanto ->
                    "Ensalutu kun " ++ Data.SocialLoginService.serviceName service

                Data.Language.English ->
                    "Sign in with " ++ Data.SocialLoginService.serviceName service
            )
        ]


logInButtonLine : Data.Language.Language -> Html.Styled.Html Msg
logInButtonLine language =
    Html.Styled.div
        [ Html.Styled.Attributes.css
            [ Css.backgroundColor (Css.rgb 0 195 0)
            , Css.borderRadius (Css.px 4)
            , Css.border2 Css.zero Css.none
            , Css.color (Css.rgb 255 255 255)
            , Css.displayFlex
            , Css.alignItems Css.center
            , Css.padding Css.zero
            , Css.cursor Css.pointer
            , Css.hover
                [ Css.backgroundColor (Css.rgb 0 224 0) ]
            , Css.active
                [ Css.backgroundColor (Css.rgb 0 179 0) ]
            ]
        ]
        [ Html.Styled.img
            [ Html.Styled.Attributes.src "/assets/line_icon120.png"
            , Html.Styled.Attributes.css
                [ Css.display Css.block
                , Css.width (Css.px 36)
                , Css.height (Css.px 36)
                , Css.padding (Css.px 2)
                , Css.borderRight3
                    (Css.px 1)
                    Css.solid
                    (Css.rgb 0 179 0)
                , Css.hover
                    [ Css.borderRightColor (Css.rgb 0 201 0) ]
                , Css.active
                    [ Css.borderRightColor (Css.rgb 0 152 0) ]
                ]
            ]
            []
        , logInButtonText
            (case language of
                Data.Language.Japanese ->
                    "LINEでログイン"

                Data.Language.Esperanto ->
                    "Ensalutu kun LINE"

                Data.Language.English ->
                    "Log in with LINE"
            )
        ]


waitUrlView :
    Data.Language.Language
    -> Data.SocialLoginService.SocialLoginService
    -> List (Html.Styled.Html Msg)
waitUrlView language service =
    [ Html.Styled.text
        (case language of
            Data.Language.Japanese ->
                Data.SocialLoginService.serviceName service ++ "のURLを発行中"

            Data.Language.Esperanto ->
                "Elsendante la URL de " ++ Data.SocialLoginService.serviceName service

            Data.Language.English ->
                "Issuing the URL of " ++ Data.SocialLoginService.serviceName service
        )
    ]


logInButtonText : String -> Html.Styled.Html msg
logInButtonText text =
    Html.Styled.div
        [ Html.Styled.Attributes.css
            [ Css.flexGrow (Css.int 1)
            , Css.fontWeight Css.bold
            ]
        ]
        [ Html.Styled.text text ]


projectOwnerAndName : String -> Data.Label.Label -> Html.Styled.Html msg
projectOwnerAndName leaderName projectName =
    Html.Styled.div
        [ Html.Styled.Attributes.css
            [ Style.textColorStyle ]
        ]
        [ Html.Styled.text (leaderName ++ "/" ++ Data.Label.toCapitalString projectName) ]


tools : Html.Styled.Html msg
tools =
    Html.Styled.div
        [ Html.Styled.Attributes.css
            [ Css.displayFlex ]
        ]
        [ Html.Styled.div
            [ Html.Styled.Attributes.css
                [ Css.height (Css.px 48)
                , Css.property "display" "grid"
                , Css.property "grid-template-columns" "1fr 1fr 1fr"
                ]
            ]
            [ projectTab
            , searchTab
            , toDoTab
            ]
        , Html.Styled.text "body"
        ]


projectTab : Html.Styled.Html msg
projectTab =
    Html.Styled.div
        [ Html.Styled.Attributes.css
            [ Css.displayFlex
            , Css.justifyContent Css.center
            , Css.alignItems Css.center
            ]
        ]
        [ Svg.Styled.svg
            [ Svg.Styled.Attributes.viewBox "0 0 500 500"
            , Svg.Styled.Attributes.css
                [ Css.width (Css.px 48)
                , Css.height (Css.px 48)
                ]
            ]
            [ Svg.Styled.rect
                [ Svg.Styled.Attributes.x "95"
                , Svg.Styled.Attributes.y "45"
                , Svg.Styled.Attributes.width "300"
                , Svg.Styled.Attributes.height "150"
                , Svg.Styled.Attributes.stroke "rgb(0,0,0)"
                , Svg.Styled.Attributes.fill "rgb(200,200,200)"
                ]
                []
            , Svg.Styled.rect
                [ Svg.Styled.Attributes.x "185"
                , Svg.Styled.Attributes.y "237"
                , Svg.Styled.Attributes.width "210"
                , Svg.Styled.Attributes.height "86"
                , Svg.Styled.Attributes.stroke "rgb(0,0,0)"
                , Svg.Styled.Attributes.fill "rgb(200,200,200)"
                ]
                []
            , Svg.Styled.rect
                [ Svg.Styled.Attributes.x "185"
                , Svg.Styled.Attributes.y "360"
                , Svg.Styled.Attributes.width "210"
                , Svg.Styled.Attributes.height "86"
                , Svg.Styled.Attributes.stroke "rgb(0,0,0)"
                , Svg.Styled.Attributes.fill "rgb(200,200,200)"
                ]
                []
            , Svg.Styled.polyline
                [ Svg.Styled.Attributes.points "114.804 193.017 112.57 406.425 186.592 405.866"
                , Svg.Styled.Attributes.stroke "rgb(200,200,200)"
                , Svg.Styled.Attributes.fill "none"
                ]
                []
            , Svg.Styled.polyline
                [ Svg.Styled.Attributes.points "13.732 284.916 185.52 285.196"
                , Svg.Styled.Attributes.stroke "rgb(200,200,200)"
                , Svg.Styled.Attributes.fill "none"
                ]
                []
            ]
        ]


searchTab : Html.Styled.Html msg
searchTab =
    Html.Styled.div
        [ Html.Styled.Attributes.css
            [ Css.displayFlex
            , Css.justifyContent Css.center
            , Css.alignItems Css.center
            ]
        ]
        [ Html.Styled.text "search" ]


toDoTab : Html.Styled.Html msg
toDoTab =
    Html.Styled.div
        [ Html.Styled.Attributes.css
            [ Css.displayFlex
            , Css.justifyContent Css.center
            , Css.alignItems Css.center
            ]
        ]
        [ Html.Styled.text "TODO" ]


gitHubIcon : Html.Styled.Html msg
gitHubIcon =
    VectorImage.toHtml
        { x = 0, y = 0, width = 20, height = 20 }
        (Just { width = 36, height = 36, padding = 4 })
        [ VectorImage.path
            "M10 0C4.476 0 0 4.477 0 10c0 4.418 2.865 8.166 6.84 9.49.5.09.68-.218.68-.483 0-.237-.007-.866-.012-1.7-2.782.603-3.37-1.34-3.37-1.34-.454-1.157-1.11-1.464-1.11-1.464-.907-.62.07-.608.07-.608 1.003.07 1.53 1.03 1.53 1.03.893 1.53 2.342 1.087 2.912.83.09-.645.35-1.085.634-1.335-2.22-.253-4.555-1.11-4.555-4.943 0-1.09.39-1.984 1.03-2.683-.105-.253-.448-1.27.096-2.647 0 0 .84-.268 2.75 1.026C8.294 4.95 9.15 4.84 10 4.836c.85.004 1.705.115 2.504.337 1.91-1.294 2.747-1.026 2.747-1.026.548 1.377.204 2.394.1 2.647.64.7 1.03 1.592 1.03 2.683 0 3.842-2.34 4.687-4.566 4.935.36.308.678.92.678 1.852 0 1.336-.01 2.415-.01 2.743 0 .267.18.578.687.48C17.14 18.163 20 14.417 20 10c0-5.522-4.478-10-10-10"
            VectorImage.strokeNone
            (VectorImage.fillColor Palette.X11.black)
        ]


googleIcon : Html.Styled.Html msg
googleIcon =
    VectorImage.toHtml
        { x = 0, y = 0, width = 20, height = 20 }
        (Just { width = 36, height = 36, padding = 4 })
        [ VectorImage.path
            "M19.6 10.23c0-.82-.1-1.42-.25-2.05H10v3.72h5.5c-.15.96-.74 2.31-2.04 3.22v2.45h3.16c1.89-1.73 2.98-4.3 2.98-7.34z"
            VectorImage.strokeNone
            (VectorImage.fillColor (Color.fromRGB ( 66, 133, 244 )))
        , VectorImage.path
            "M13.46 15.13c-.83.59-1.96 1-3.46 1-2.64 0-4.88-1.74-5.68-4.15H1.07v2.52C2.72 17.75 6.09 20 10 20c2.7 0 4.96-.89 6.62-2.42l-3.16-2.45z"
            VectorImage.strokeNone
            (VectorImage.fillColor (Color.fromRGB ( 52, 168, 83 )))
        , VectorImage.path
            "M3.99 10c0-.69.12-1.35.32-1.97V5.51H1.07A9.973 9.973 0 0 0 0 10c0 1.61.39 3.14 1.07 4.49l3.24-2.52c-.2-.62-.32-1.28-.32-1.97z"
            VectorImage.strokeNone
            (VectorImage.fillColor (Color.fromRGB ( 251, 188, 5 )))
        , VectorImage.path
            "M10 3.88c1.88 0 3.13.81 3.85 1.48l2.84-2.76C14.96.99 12.7 0 10 0 6.09 0 2.72 2.25 1.07 5.51l3.24 2.52C5.12 5.62 7.36 3.88 10 3.88z"
            VectorImage.strokeNone
            (VectorImage.fillColor (Color.fromRGB ( 234, 67, 53 )))
        ]


twitterIcon : Html.Styled.Html msg
twitterIcon =
    VectorImage.toHtml
        { x = 0, y = 0, width = 20, height = 20 }
        (Just { width = 36, height = 36, padding = 4 })
        [ VectorImage.path
            "M20 3.924c-.736.326-1.527.547-2.357.646.848-.508 1.498-1.312 1.804-2.27-.792.47-1.67.812-2.605.996C16.092 2.498 15.027 2 13.847 2 11.58 2 9.743 3.837 9.743 6.103c0 .322.037.635.107.935-3.41-.17-6.434-1.804-8.458-4.287-.352.61-.555 1.314-.555 2.066 0 1.423.724 2.68 1.825 3.415-.672-.02-1.305-.206-1.858-.513v.052c0 1.987 1.414 3.645 3.29 4.022-.344.096-.706.146-1.08.146-.265 0-.522-.026-.772-.074.522 1.63 2.037 2.818 3.833 2.85C4.67 15.81 2.9 16.468.98 16.468c-.332 0-.66-.02-.98-.057 1.816 1.166 3.973 1.846 6.29 1.846 7.547 0 11.674-6.253 11.674-11.675 0-.18-.004-.355-.01-.53.8-.58 1.496-1.3 2.046-2.125"
            VectorImage.strokeNone
            (VectorImage.fillColor (Color.fromRGB ( 85, 172, 238 )))
        ]
