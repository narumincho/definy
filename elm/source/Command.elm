module Command exposing (Command(..))

import Data


type Command
    = None
    | GetBlobUrl Data.FileHash
    | CreateProject String
    | CreateIdea { projectId : Data.ProjectId, ideaName : String }
    | ConsoleLog String
    | PushUrl Data.UrlData
    | ToValidProjectName String
    | ToValidIdeaName String
    | GetAllProjectId
    | GetProject Data.ProjectId
    | GetUser Data.UserId
    | Batch (List Command)
