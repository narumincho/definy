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
import Url.Builder
import User


type Model
    = Model { selectTab : Tab }


type Msg
    = SignOutRequest
    | SingInRequest
    | SelectUp
    | SelectDown
    | SelectParentOrTreeClose
    | SelectFirstChildOrTreeOpen
    | ToFocusEditorPanel


type Emit
    = EmitSingOutRequest
    | EmitSingInRequest


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
        { selectTab = ModuleTree }


update : Msg -> Model -> ( Model, List Emit )
update msg model =
    case msg of
        SignOutRequest ->
            ( model
            , [ EmitSingOutRequest ]
            )

        SingInRequest ->
            ( model
            , [ EmitSingInRequest ]
            )

        _ ->
            ( model
            , []
            )


view : Maybe User.User -> Model -> List (Html.Html Msg)
view user (Model { selectTab }) =
    [ definyLogo
    , userView user
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


userView : Maybe User.User -> Html.Html Msg
userView userMaybe =
    Html.div
        [ A.style "color" "#ddd"
        , A.style "display" "flex"
        , A.style "flex-direction" "column"
        ]
        (case userMaybe of
            Just user ->
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

            Nothing ->
                [ Html.button
                    [ Html.Events.onClick SingInRequest ]
                    [ Html.text "Googleでサインイン" ]
                , Html.a
                    [ A.href
                        (Url.Builder.absolute
                            [ "social_login", "line" ]
                            []
                        )
                    , A.style "background-color" "#fff"
                    , A.style "color" "#111"
                    , A.style "text-decoration" "none"
                    ]
                    [ Html.text "LINEでサインイン" ]
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
