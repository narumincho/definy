module ImageStore exposing (ImageStore, add, empty, getImageBlobUrl)

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


getImageBlobUrl : Data.FileHash -> ImageStore -> Maybe String
getImageBlobUrl (Data.FileHash hash) (ImageStore imageFileBlobDict) =
    Dict.get hash imageFileBlobDict
