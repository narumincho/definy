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
import Html
import Html.Attributes as A
import Html.Events
import Palette.X11
import SocialLoginService
import User
import Utility.NSvg as NSvg exposing (NSvg)


type Model
    = Model
        { selectTab : Tab
        , waitLogInUrl : Maybe SocialLoginService.SocialLoginService
        , mouseOverElement : MouseState
        }


type MouseState
    = MouseStateNone
    | MouseStateEnter SocialLoginService.SocialLoginService
    | MouseStateDown SocialLoginService.SocialLoginService


type Msg
    = SignOutRequest
    | SelectUp
    | SelectDown
    | SelectParentOrTreeClose
    | SelectFirstChildOrTreeOpen
    | ToFocusEditorPanel
    | LogInRequest SocialLoginService.SocialLoginService
    | MouseEnterLogInButton SocialLoginService.SocialLoginService
    | MouseLeave
    | MouseDownLogInButton SocialLoginService.SocialLoginService
    | MouseUp


type Emit
    = EmitLogOutRequest
    | EmitLogInRequest SocialLoginService.SocialLoginService


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
        , waitLogInUrl = Nothing
        , mouseOverElement = MouseStateNone
        }


update : Msg -> Model -> ( Model, List Emit )
update msg (Model rec) =
    case msg of
        SignOutRequest ->
            ( Model rec
            , [ EmitLogOutRequest ]
            )

        LogInRequest service ->
            ( Model
                { rec
                    | waitLogInUrl = Just service
                }
            , [ EmitLogInRequest service ]
            )

        MouseEnterLogInButton service ->
            ( Model
                { rec | mouseOverElement = MouseStateEnter service }
            , []
            )

        MouseLeave ->
            ( Model
                { rec | mouseOverElement = MouseStateNone }
            , []
            )

        MouseDownLogInButton service ->
            ( Model
                { rec | mouseOverElement = MouseStateDown service }
            , []
            )

        MouseUp ->
            ( Model
                { rec
                    | mouseOverElement =
                        case rec.mouseOverElement of
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


view : Maybe User.User -> Model -> List (Html.Html Msg)
view user (Model { selectTab, waitLogInUrl, mouseOverElement }) =
    [ definyLogo
    , userView user waitLogInUrl mouseOverElement
    , project
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


userView : Maybe User.User -> Maybe SocialLoginService.SocialLoginService -> MouseState -> Html.Html Msg
userView userMaybe logInServiceMaybe mouseState =
    Html.div
        [ A.style "color" "#ddd"
        , A.style "display" "grid"
        , A.style "gap" "10px"
        , A.style "padding" "8px"
        ]
        (case ( userMaybe, logInServiceMaybe ) of
            ( Just user, _ ) ->
                [ Html.div
                    [ A.style "display" "flex" ]
                    [ Html.img
                        [ A.style "clip-path" "circle(50% at center)"
                        , A.src (User.getgoogleAccountImageUrl user)
                        ]
                        []
                    , Html.div
                        []
                        [ Html.text (User.getGoogleAccountName user) ]
                    ]
                , Html.button
                    [ Html.Events.onClick SignOutRequest ]
                    [ Html.text "サインアウトする" ]
                ]

            ( Nothing, Just service ) ->
                [ Html.text (SocialLoginService.serviceName service ++ "のURLを発行中") ]

            ( Nothing, Nothing ) ->
                [ logInButtonNoLine mouseState googleIcon SocialLoginService.Google
                , logInButtonNoLine mouseState gitHubIcon SocialLoginService.GitHub
                , logInButtonNoLine mouseState twitterIcon SocialLoginService.Twitter
                , Html.button
                    [ Html.Events.onClick (LogInRequest SocialLoginService.Line)
                    , Html.Events.onMouseEnter (MouseEnterLogInButton SocialLoginService.Line)
                    , Html.Events.onMouseLeave MouseLeave
                    , Html.Events.onMouseDown (MouseDownLogInButton SocialLoginService.Line)
                    , Html.Events.onMouseUp MouseUp
                    , A.style "background-color"
                        (case mouseState of
                            MouseStateEnter SocialLoginService.Line ->
                                "#00e000"

                            MouseStateDown SocialLoginService.Line ->
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
                                        MouseStateEnter SocialLoginService.Line ->
                                            "#00c900"

                                        MouseStateDown SocialLoginService.Line ->
                                            "#009800"

                                        _ ->
                                            "#00b300"
                                   )
                            )
                        , A.style "padding" "2px"
                        ]
                        []
                    , logInButtonText "LINEでログイン"
                    ]
                ]
        )


logInButtonNoLine : MouseState -> Html.Html Msg -> SocialLoginService.SocialLoginService -> Html.Html Msg
logInButtonNoLine mouseSate icon service =
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
        , logInButtonText (SocialLoginService.serviceName service ++ "でログイン")
        ]


logInButtonText : String -> Html.Html msg
logInButtonText text =
    Html.div
        [ A.style "flex-grow" "1"
        , A.style "font-weight" "bold"
        ]
        [ Html.text text ]


project : Html.Html msg
project =
    Html.div
        [ A.style "color" "#ddd" ]
        [ Html.text "projectName" ]


documentIcon : Html.Html msg
documentIcon =
    Html.div
        []
        [ Html.text "document" ]


moduleTreeIcon : Html.Html msg
moduleTreeIcon =
    Html.div
        []
        [ Html.text "ModuleTree" ]


projectImport : Html.Html msg
projectImport =
    Html.div
        []
        [ Html.text "projectImport" ]


searchIcon : Html.Html msg
searchIcon =
    Html.div
        []
        [ Html.text "search" ]


versionIcon : Html.Html msg
versionIcon =
    Html.div
        []
        [ Html.text "version" ]


toDoListIcon : Html.Html msg
toDoListIcon =
    Html.div
        []
        [ Html.text "TODO List" ]


instanceIcon : Html.Html msg
instanceIcon =
    Html.div
        []
        [ Html.text "Instance" ]


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
