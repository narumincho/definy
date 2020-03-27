module Command exposing
    ( Command
    , CommandItem(..)
    , batch
    , consoleLog
    , createProject
    , getBlobUrl
    , getListCommandItem
    , none
    )

import Data


type Command
    = Command (List CommandItem)


type CommandItem
    = GetBlobUrl Data.FileHash
    | CreateProject Data.CreateProjectParameter
    | ConsoleLog String


getBlobUrl : Data.FileHash -> Command
getBlobUrl fileHash =
    Command [ GetBlobUrl fileHash ]


createProject : Data.CreateProjectParameter -> Command
createProject createProjectParameter =
    Command [ CreateProject createProjectParameter ]


consoleLog : String -> Command
consoleLog text =
    Command [ ConsoleLog text ]


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
