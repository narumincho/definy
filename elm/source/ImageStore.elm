module ImageStore exposing (ImageStore, add, empty, getProjectIcon, getUserImage)

import Data
import Dict


{-| key: ファイルのハッシュ値,
value: blobURL
の辞書が入っている
-}
type ImageStore
    = ImageStore (Dict.Dict String String)


empty : ImageStore
empty =
    ImageStore Dict.empty


add : Data.FileHash -> String -> ImageStore -> ImageStore
add (Data.FileHash hash) blobUrl (ImageStore dict) =
    ImageStore
        (Dict.insert hash blobUrl dict)


getUserImage : ImageStore -> Data.User -> Maybe String
getUserImage (ImageStore imageFileBlobDict) user =
    let
        (Data.FileHash hash) =
            user.imageHash
    in
    Dict.get hash imageFileBlobDict


getProjectIcon : ImageStore -> Data.Project -> Maybe String
getProjectIcon (ImageStore imageFileBlobDict) project =
    let
        (Data.FileHash hash) =
            project.icon
    in
    Dict.get hash imageFileBlobDict
