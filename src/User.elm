module User exposing (User, getGoogleAccountName, getgoogleAccountImageUrl, make)


type User
    = User
        { googleAccountName : String
        , googleAccountImageUrl : String
        }


make : { googleAccountName : String, googleAccountImageUrl : String } -> User
make =
    User


getGoogleAccountName : User -> String
getGoogleAccountName (User { googleAccountName }) =
    googleAccountName


getgoogleAccountImageUrl : User -> String
getgoogleAccountImageUrl (User { googleAccountImageUrl }) =
    googleAccountImageUrl
