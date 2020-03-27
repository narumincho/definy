module Command exposing
    ( Command
    , CommandItem(..)
    , batch
    , consoleLog
    , createProject
    , getBlobUrl
    , getListCommandItem
    , none
    , pushUrl
    )

import Data


type Command
    = Command (List CommandItem)


type CommandItem
    = GetBlobUrl Data.FileHash
    | CreateProject Data.CreateProjectParameter
    | ConsoleLog String
    | PushUrl Data.UrlData


getBlobUrl : Data.FileHash -> Command
getBlobUrl fileHash =
    Command [ GetBlobUrl fileHash ]


createProject : Data.CreateProjectParameter -> Command
createProject createProjectParameter =
    Command [ CreateProject createProjectParameter ]


consoleLog : String -> Command
consoleLog text =
    Command [ ConsoleLog text ]


pushUrl : Data.UrlData -> Command
pushUrl urlData =
    Command [ PushUrl urlData ]


none : Command
none =
    Command []


batch : List Command -> Command
batch listCommand =
    listCommand
        |> List.map getListCommandItem
        |> List.concat
        |> Command


getListCommandItem : Command -> List CommandItem
getListCommandItem (Command commandItem) =
    commandItem
