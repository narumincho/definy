module Command exposing
    ( Command
    , CommandItem(..)
    , batch
    , getBlobUrl
    , getListCommandItem
    , none
    )

import Data


type Command
    = Command (List CommandItem)


type CommandItem
    = GetBlobUrl Data.FileHash


getBlobUrl : Data.FileHash -> Command
getBlobUrl fileHash =
    Command [ GetBlobUrl fileHash ]


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
