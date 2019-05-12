module Panel.Side exposing
    ( Emit(..)
    , Model
    , Msg(..)
    , Tab
    , initModel
    , view
    )

{-| サイトパネル
-}

import Html
import Html.Attributes as A


type Model
    = Model { selectTab : Tab }


type Msg
    = Msg


type Emit
    = Emit


initModel : Model
initModel =
    Model
        { selectTab = ModuleTree }


type Tab
    = Document
    | ModuleTree
    | ProjectImport
    | Search
    | Version
    | ToDoList


view : Model -> List (Html.Html msg)
view (Model { selectTab }) =
    [ definyLogo
    , user
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


user : Html.Html msg
user =
    Html.div
        [ A.style "color" "#ddd" ]
        [ Html.text "userName" ]


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
