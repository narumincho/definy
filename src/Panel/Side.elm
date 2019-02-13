module Panel.Side exposing (Model, Tab, view)

{-| サイトパネル
-}

import Html


type Model
    = Model { selectTab : Tab }


initModel : Model
initModel =
    Model
        { selectTab = Tree }


type Tab
    = Tree
    | Search
    | Version
    | ToDoList
    | Instance


view : Model -> Html.Html msg
view (Model { selectTab }) =
    Html.div
        []
        [ case selectTab of
            Tree ->
                treeIcon

            Search ->
                searchIcon

            Version ->
                versionIcon

            ToDoList ->
                toDoListIcon

            Instance ->
                instanceIcon
        ]


treeIcon : Html.Html msg
treeIcon =
    Html.div
        []
        [ Html.text "Tree" ]


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
