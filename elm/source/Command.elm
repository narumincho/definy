module Command exposing (Command(..))

import Data


type Command
    = None
    | GetBlobUrl Data.FileHash
    | CreateProject String
    | ConsoleLog String
    | PushUrl Data.UrlData
    | ToValidProjectName String
    | Batch (List Command)
