module User exposing (User, getDisplayName, getImageUrl, make)


type User
    = User
        { googleAccountName : String
        , googleAccountImageUrl : String
        }


make : { googleAccountName : String, googleAccountImageUrl : String } -> User
make =
    User


getDisplayName : User -> String
getDisplayName (User { googleAccountName }) =
    googleAccountName


getImageUrl : User -> String
getImageUrl (User { googleAccountImageUrl }) =
    googleAccountImageUrl
