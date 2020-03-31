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
    , toValidProjectName
    )

import Data


type Command
    = Command (List CommandItem)


type CommandItem
    = GetBlobUrl Data.FileHash
    | CreateProject String
    | ConsoleLog String
    | PushUrl Data.UrlData
    | ToValidProjectName String


getBlobUrl : Data.FileHash -> Command
getBlobUrl fileHash =
    Command [ GetBlobUrl fileHash ]


createProject : String -> Command
createProject name =
    Command [ CreateProject name ]


consoleLog : String -> Command
consoleLog text =
    Command [ ConsoleLog text ]


pushUrl : Data.UrlData -> Command
pushUrl urlData =
    Command [ PushUrl urlData ]


toValidProjectName : String -> Command
toValidProjectName string =
    Command [ ToValidProjectName string ]


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
