module Panel.Side exposing
    ( Emit(..)
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
import Data.SocialLoginService
import Html
import Html.Attributes as A
import Html.Events
import Html.Styled
import Html.Styled.Attributes
import Palette.X11
import Project
import Svg.Styled
import Svg.Styled.Attributes
import User
import Utility.NSvg as NSvg exposing (NSvg)


type Model
    = Model
        { selectTab : Tab
        , logInState : LogInState
        , mouseState : MouseState
        }


type MouseState
    = MouseStateNone
    | MouseStateEnter Data.SocialLoginService.SocialLoginService
    | MouseStateDown Data.SocialLoginService.SocialLoginService


type Msg
    = SignOutRequest
    | SelectUp
    | SelectDown
    | SelectParentOrTreeClose
    | SelectFirstChildOrTreeOpen
    | SelectItem
    | ShowServiceSelectView
    | HideServiceSelectView
    | LogInRequest Data.SocialLoginService.SocialLoginService
    | MouseEnterLogInButton Data.SocialLoginService.SocialLoginService
    | MouseLeave
    | MouseDownLogInButton Data.SocialLoginService.SocialLoginService
    | MouseUp


type Emit
    = EmitLogOutRequest
    | EmitLogInRequest Data.SocialLoginService.SocialLoginService


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
        , logInState = LogInStateNormal
        , mouseState = MouseStateNone
        }


type LogInState
    = LogInStateNormal
    | LogInStateShowSelectServiceView
    | LogInStateWaitUrl Data.SocialLoginService.SocialLoginService


update : Msg -> Model -> ( Model, List Emit )
update msg (Model rec) =
    case msg of
        SignOutRequest ->
            ( Model rec
            , [ EmitLogOutRequest ]
            )

        ShowServiceSelectView ->
            ( Model
                { rec
                    | logInState = LogInStateShowSelectServiceView
                }
            , []
            )

        HideServiceSelectView ->
            ( Model
                { rec | logInState = LogInStateNormal }
            , []
            )

        LogInRequest service ->
            ( Model
                { rec
                    | logInState = LogInStateWaitUrl service
                }
            , [ EmitLogInRequest service ]
            )

        MouseEnterLogInButton service ->
            ( Model
                { rec | mouseState = MouseStateEnter service }
            , []
            )

        MouseLeave ->
            ( Model
                { rec | mouseState = MouseStateNone }
            , []
            )

        MouseDownLogInButton service ->
            ( Model
                { rec | mouseState = MouseStateDown service }
            , []
            )

        MouseUp ->
            ( Model
                { rec
                    | mouseState =
                        case rec.mouseState of
                            MouseStateNone ->
                                MouseStateNone

                            MouseStateEnter element ->
                                MouseStateEnter element

                            MouseStateDown element ->
                                MouseStateEnter element
                }
            , []
            )

        _ ->
            ( Model rec
            , []
            )



{- =======================================================
                        View
   =======================================================
-}


view : { user : Maybe User.User, language : Data.Language.Language, project : Project.Project } -> Model -> List (Html.Html Msg)
view { user, language, project } (Model { selectTab, logInState, mouseState }) =
    [ definyLogo
    , userView
        { user = user
        , language = language
        , logInState = logInState
        , mouseState = mouseState
        }
    , projectOwnerAndName
        (Project.getOwnerName project)
        (Project.getName project)
    , tools
    ]


definyLogo : Html.Html msg
definyLogo =
    Html.div
        [ A.style "display" "flex"
        , A.style "justify-content" "center"
        ]
        [ Html.div
            [ A.style "color" "#b9d09b"
            , A.style "margin" "0"
            , A.style "padding" "3px"
            , A.style "font-size" "32px"
            , A.style "text-shadow" "0 1px 2px rgba(0, 0, 0, 0.2)"
            , A.style "user-select" "none"
            , A.style "text-align" "center"
            , A.style "font-family" "Segoe UI"
            , A.style "font-weight" "300"
            , A.style "letter-spacing" "0.08rem"
            ]
            [ Html.text "Definy" ]
        ]


userView :
    { user : Maybe User.User
    , language : Data.Language.Language
    , logInState : LogInState
    , mouseState : MouseState
    }
    -> Html.Html Msg
userView { user, language, logInState, mouseState } =
    Html.div
        [ A.style "color" "#ddd"
        , A.style "display" "grid"
        , A.style "gap" "10px"
        , A.style "padding" "8px"
        ]
        (case user of
            Just u ->
                [ Html.div
                    [ A.style "display" "flex" ]
                    [ Html.img
                        [ A.style "clip-path" "circle(50% at center)"
                        , A.src (User.getImageUrl u)
                        ]
                        []
                    , Html.div
                        []
                        [ Html.text (User.getDisplayName u) ]
                    ]
                , Html.button
                    [ Html.Events.onClick SignOutRequest ]
                    [ Html.text
                        (case language of
                            Data.Language.Japanese ->
                                "サインアウトする"

                            Data.Language.Esperanto ->
                                "Elsaluti"

                            Data.Language.English ->
                                "Sign Out"
                        )
                    ]
                ]

            Nothing ->
                case logInState of
                    LogInStateNormal ->
                        logInStateNormalView language

                    LogInStateShowSelectServiceView ->
                        serviceSelectView language mouseState

                    LogInStateWaitUrl socialLoginService ->
                        waitUrlView language socialLoginService
        )


logInStateNormalView : Data.Language.Language -> List (Html.Html Msg)
logInStateNormalView language =
    [ Html.button
        [ Html.Events.onClick ShowServiceSelectView
        , A.style "cursor" "pointer"
        ]
        [ Html.text
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


serviceSelectView : Data.Language.Language -> MouseState -> List (Html.Html Msg)
serviceSelectView language mouseState =
    [ Html.button
        [ Html.Events.onClick HideServiceSelectView
        , A.style "cursor" "pointer"
        ]
        [ Html.text "▲" ]
    , logInButtonNoLine mouseState googleIcon language Data.SocialLoginService.Google
    , logInButtonNoLine mouseState gitHubIcon language Data.SocialLoginService.GitHub
    , logInButtonLine mouseState language
    ]


waitUrlView : Data.Language.Language -> Data.SocialLoginService.SocialLoginService -> List (Html.Html Msg)
waitUrlView language service =
    [ Html.text
        (case language of
            Data.Language.Japanese ->
                Data.SocialLoginService.serviceName service ++ "のURLを発行中"

            Data.Language.Esperanto ->
                "Elsendante la URL de " ++ Data.SocialLoginService.serviceName service

            Data.Language.English ->
                "Issuing the URL of " ++ Data.SocialLoginService.serviceName service
        )
    ]


logInButtonNoLine : MouseState -> Html.Html Msg -> Data.Language.Language -> Data.SocialLoginService.SocialLoginService -> Html.Html Msg
logInButtonNoLine mouseSate icon language service =
    Html.button
        [ Html.Events.onClick (LogInRequest service)
        , Html.Events.onMouseEnter (MouseEnterLogInButton service)
        , Html.Events.onMouseLeave MouseLeave
        , Html.Events.onMouseDown (MouseDownLogInButton service)
        , Html.Events.onMouseUp MouseUp
        , A.style "background-color"
            (case mouseSate of
                MouseStateDown s ->
                    if s == service then
                        "#ccc"

                    else
                        "#e8e8e8"

                MouseStateEnter s ->
                    if s == service then
                        "#fff"

                    else
                        "#e8e8e8"

                MouseStateNone ->
                    "e8e8e8"
            )
        , A.style "border-radius" "4px"
        , A.style "border" "none"
        , A.style "color" "#111"
        , A.style "display" "flex"
        , A.style "align-items" "center"
        , A.style "padding" "0"
        , A.style "cursor" "pointer"
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


logInButtonLine : MouseState -> Data.Language.Language -> Html.Html Msg
logInButtonLine mouseState language =
    Html.button
        [ Html.Events.onClick (LogInRequest Data.SocialLoginService.Line)
        , Html.Events.onMouseEnter (MouseEnterLogInButton Data.SocialLoginService.Line)
        , Html.Events.onMouseLeave MouseLeave
        , Html.Events.onMouseDown (MouseDownLogInButton Data.SocialLoginService.Line)
        , Html.Events.onMouseUp MouseUp
        , A.style "background-color"
            (case mouseState of
                MouseStateEnter Data.SocialLoginService.Line ->
                    "#00e000"

                MouseStateDown Data.SocialLoginService.Line ->
                    "#00b300"

                _ ->
                    "#00c300"
            )
        , A.style "border-radius" "4px"
        , A.style "border" "none"
        , A.style "color" "#FFF"
        , A.style "display" "flex"
        , A.style "align-items" "center"
        , A.style "padding" "0"
        , A.style "cursor" "pointer"
        ]
        [ Html.img
            [ A.src "/assets/line_icon120.png"
            , A.style "width" "36px"
            , A.style "height" "36px"
            , A.style "border-right"
                ("solid 1px "
                    ++ (case mouseState of
                            MouseStateEnter Data.SocialLoginService.Line ->
                                "#00c900"

                            MouseStateDown Data.SocialLoginService.Line ->
                                "#009800"

                            _ ->
                                "#00b300"
                       )
                )
            , A.style "padding" "2px"
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


logInButtonText : String -> Html.Html msg
logInButtonText text =
    Html.div
        [ A.style "flex-grow" "1"
        , A.style "font-weight" "bold"
        ]
        [ Html.text text ]


projectOwnerAndName : Data.Label.Label -> Data.Label.Label -> Html.Html msg
projectOwnerAndName ownerName projectName =
    Html.div
        [ A.style "color" "#ddd" ]
        [ Html.text (Data.Label.toCapitalString ownerName ++ "/" ++ Data.Label.toCapitalString projectName) ]


tools : Html.Html msg
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
        |> Html.Styled.toUnstyled


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


gitHubIcon : Html.Html msg
gitHubIcon =
    NSvg.toHtml
        { x = 0, y = 0, width = 20, height = 20 }
        (Just { width = 36, height = 36, padding = 4 })
        [ NSvg.path
            "M10 0C4.476 0 0 4.477 0 10c0 4.418 2.865 8.166 6.84 9.49.5.09.68-.218.68-.483 0-.237-.007-.866-.012-1.7-2.782.603-3.37-1.34-3.37-1.34-.454-1.157-1.11-1.464-1.11-1.464-.907-.62.07-.608.07-.608 1.003.07 1.53 1.03 1.53 1.03.893 1.53 2.342 1.087 2.912.83.09-.645.35-1.085.634-1.335-2.22-.253-4.555-1.11-4.555-4.943 0-1.09.39-1.984 1.03-2.683-.105-.253-.448-1.27.096-2.647 0 0 .84-.268 2.75 1.026C8.294 4.95 9.15 4.84 10 4.836c.85.004 1.705.115 2.504.337 1.91-1.294 2.747-1.026 2.747-1.026.548 1.377.204 2.394.1 2.647.64.7 1.03 1.592 1.03 2.683 0 3.842-2.34 4.687-4.566 4.935.36.308.678.92.678 1.852 0 1.336-.01 2.415-.01 2.743 0 .267.18.578.687.48C17.14 18.163 20 14.417 20 10c0-5.522-4.478-10-10-10"
            NSvg.strokeNone
            (NSvg.fillColor Palette.X11.black)
        ]


googleIcon : Html.Html msg
googleIcon =
    NSvg.toHtml
        { x = 0, y = 0, width = 20, height = 20 }
        (Just { width = 36, height = 36, padding = 4 })
        [ NSvg.path
            "M19.6 10.23c0-.82-.1-1.42-.25-2.05H10v3.72h5.5c-.15.96-.74 2.31-2.04 3.22v2.45h3.16c1.89-1.73 2.98-4.3 2.98-7.34z"
            NSvg.strokeNone
            (NSvg.fillColor (Color.fromRGB ( 66, 133, 244 )))
        , NSvg.path
            "M13.46 15.13c-.83.59-1.96 1-3.46 1-2.64 0-4.88-1.74-5.68-4.15H1.07v2.52C2.72 17.75 6.09 20 10 20c2.7 0 4.96-.89 6.62-2.42l-3.16-2.45z"
            NSvg.strokeNone
            (NSvg.fillColor (Color.fromRGB ( 52, 168, 83 )))
        , NSvg.path
            "M3.99 10c0-.69.12-1.35.32-1.97V5.51H1.07A9.973 9.973 0 0 0 0 10c0 1.61.39 3.14 1.07 4.49l3.24-2.52c-.2-.62-.32-1.28-.32-1.97z"
            NSvg.strokeNone
            (NSvg.fillColor (Color.fromRGB ( 251, 188, 5 )))
        , NSvg.path
            "M10 3.88c1.88 0 3.13.81 3.85 1.48l2.84-2.76C14.96.99 12.7 0 10 0 6.09 0 2.72 2.25 1.07 5.51l3.24 2.52C5.12 5.62 7.36 3.88 10 3.88z"
            NSvg.strokeNone
            (NSvg.fillColor (Color.fromRGB ( 234, 67, 53 )))
        ]


twitterIcon : Html.Html msg
twitterIcon =
    NSvg.toHtml
        { x = 0, y = 0, width = 20, height = 20 }
        (Just { width = 36, height = 36, padding = 4 })
        [ NSvg.path
            "M20 3.924c-.736.326-1.527.547-2.357.646.848-.508 1.498-1.312 1.804-2.27-.792.47-1.67.812-2.605.996C16.092 2.498 15.027 2 13.847 2 11.58 2 9.743 3.837 9.743 6.103c0 .322.037.635.107.935-3.41-.17-6.434-1.804-8.458-4.287-.352.61-.555 1.314-.555 2.066 0 1.423.724 2.68 1.825 3.415-.672-.02-1.305-.206-1.858-.513v.052c0 1.987 1.414 3.645 3.29 4.022-.344.096-.706.146-1.08.146-.265 0-.522-.026-.772-.074.522 1.63 2.037 2.818 3.833 2.85C4.67 15.81 2.9 16.468.98 16.468c-.332 0-.66-.02-.98-.057 1.816 1.166 3.973 1.846 6.29 1.846 7.547 0 11.674-6.253 11.674-11.675 0-.18-.004-.355-.01-.53.8-.58 1.496-1.3 2.046-2.125"
            NSvg.strokeNone
            (NSvg.fillColor (Color.fromRGB ( 85, 172, 238 )))
        ]
