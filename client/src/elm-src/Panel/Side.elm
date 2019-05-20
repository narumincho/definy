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

import Html
import Html.Attributes as A
import Html.Events
import SocialLoginService
import User


type Model
    = Model { selectTab : Tab, waitLogInUrl : Maybe SocialLoginService.SocialLoginService }


type Msg
    = SignOutRequest
    | SelectUp
    | SelectDown
    | SelectParentOrTreeClose
    | SelectFirstChildOrTreeOpen
    | ToFocusEditorPanel
    | LogInRequest SocialLoginService.SocialLoginService


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
        { selectTab = ModuleTree, waitLogInUrl = Nothing }


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

        _ ->
            ( Model rec
            , []
            )


view : Maybe User.User -> Model -> List (Html.Html Msg)
view user (Model { selectTab, waitLogInUrl }) =
    [ definyLogo
    , userView user waitLogInUrl
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


userView : Maybe User.User -> Maybe SocialLoginService.SocialLoginService -> Html.Html Msg
userView userMaybe logInServiceMaybe =
    Html.div
        [ A.style "color" "#ddd"
        , A.style "display" "grid"
        , A.style "gap" "10px"
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
                [ Html.button
                    [ Html.Events.onClick (LogInRequest SocialLoginService.Google)
                    , A.style "background-color" "#fff"
                    , A.style "color" "#111"
                    , A.style "text-decoration" "none"
                    , A.style "text-align" "center"
                    ]
                    [ Html.text "Googleでログイン" ]
                , Html.button
                    [ Html.Events.onClick (LogInRequest SocialLoginService.GitHub)
                    , A.style "background-color" "#fff"
                    , A.style "color" "#111"
                    , A.style "text-decoration" "none"
                    , A.style "text-align" "center"
                    ]
                    [ Html.text "GitHubでログイン" ]
                , Html.button
                    [ Html.Events.onClick (LogInRequest SocialLoginService.Twitter)
                    , A.style "background-color" "#fff"
                    , A.style "color" "#111"
                    , A.style "text-decoration" "none"
                    , A.style "text-align" "center"
                    ]
                    [ Html.text "Twitterでログイン" ]
                , Html.button
                    [ Html.Events.onClick (LogInRequest SocialLoginService.Line)
                    , A.style "background-color" "#fff"
                    , A.style "color" "#111"
                    , A.style "text-decoration" "none"
                    , A.style "text-align" "center"
                    ]
                    [ Html.text "LINEでログイン" ]
                ]
        )


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
