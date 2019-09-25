module Api exposing (getLogInUrl, getUserPrivate)

import Data.IdHash
import Data.Label
import Data.Project
import Data.SocialLoginService
import Data.User
import Http
import Json.Decode as Jd
import Json.Decode.Pipeline as Jdp
import Json.Encode as Je
import Time
import Url


getLogInUrl : Data.SocialLoginService.SocialLoginService -> (Result String Url.Url -> msg) -> Cmd msg
getLogInUrl service =
    graphQlApiRequest
        (Mutation
            [ Field
                { name = "getLogInUrl"
                , args =
                    [ ( "service"
                      , GraphQLEnum
                            (case service of
                                Data.SocialLoginService.Google ->
                                    "google"

                                Data.SocialLoginService.GitHub ->
                                    "gitHub"

                                Data.SocialLoginService.Line ->
                                    "line"
                            )
                      )
                    ]
                , return = []
                }
            ]
        )
        logInOrSignUpUrlResponseToResult


logInOrSignUpUrlResponseToResult : Jd.Decoder Url.Url
logInOrSignUpUrlResponseToResult =
    Jd.field "getLogInUrl" Jd.string
        |> Jd.andThen
            (\urlString ->
                case Url.fromString urlString of
                    Just url ->
                        Jd.succeed url

                    Nothing ->
                        Jd.fail "url format error"
            )


getUserPrivate : Data.User.AccessToken -> (Result String Data.User.User -> msg) -> Cmd msg
getUserPrivate accessToken =
    graphQlApiRequest
        (Query
            [ Field
                { name = "userPrivate"
                , args =
                    [ ( "accessToken", GraphQLString (Data.User.accessTokenToString accessToken) ) ]
                , return =
                    [ Field
                        { name = "id"
                        , args = []
                        , return = []
                        }
                    , Field
                        { name = "name"
                        , args = []
                        , return = []
                        }
                    , Field
                        { name = "image"
                        , args = []
                        , return = []
                        }
                    , Field
                        { name = "introduction"
                        , args = []
                        , return = []
                        }
                    , Field
                        { name = "createdAt"
                        , args = []
                        , return = []
                        }
                    , Field
                        { name = "branches"
                        , args = []
                        , return =
                            [ Field
                                { name = "id"
                                , args = []
                                , return = []
                                }
                            ]
                        }
                    ]
                }
            ]
        )
        (Jd.field
            "userPrivate"
            userDecoder
        )


getAllProjectIndex : (Result String (List Data.Project.SimpleProject) -> msg) -> Cmd msg
getAllProjectIndex =
    graphQlApiRequest
        (Query
            [ Field
                { name = "allProject"
                , args = []
                , return =
                    [ Field
                        { name = "id"
                        , args = []
                        , return = []
                        }
                    ]
                }
            ]
        )
        (Jd.field
            "allProject"
            (Jd.list projectSimpleDecoder)
        )


projectSimpleDecoder : Jd.Decoder Data.Project.SimpleProject
projectSimpleDecoder =
    Jd.succeed
        (\id name leader ->
            Data.Project.simpleFrom
                { id = Data.IdHash.ProjectId id
                , name = name
                , leader = Data.IdHash.UserId leader
                }
        )
        |> Jdp.required "id" Jd.string
        |> Jdp.requiredAt [ "masterBranch", "name" ] labelDecoder
        |> Jdp.requiredAt [ "masterBranch", "user", "id" ] Jd.string


labelDecoder : Jd.Decoder Data.Label.Label
labelDecoder =
    Jd.string
        |> Jd.andThen
            (\string ->
                case Data.Label.fromString string of
                    Just label ->
                        Jd.succeed label

                    Nothing ->
                        Jd.fail "ラベルに使えない文字が含まれていた"
            )


userDecoder : Jd.Decoder Data.User.User
userDecoder =
    Jd.succeed
        (\id name image introduction createdAt branches ->
            Data.User.from
                { id = Data.IdHash.UserId id
                , name = name
                , imageFileHash = Data.IdHash.ImageFileHash image
                , introduction = introduction
                , createdAt = Time.millisToPosix createdAt
                , branches = branches |> List.map Data.IdHash.BranchId
                }
        )
        |> Jdp.required "id" Jd.string
        |> Jdp.required "name" Jd.string
        |> Jdp.required "image" Jd.string
        |> Jdp.required "introduction" Jd.string
        |> Jdp.required "createdAt" Jd.int
        |> Jdp.required "branches" (Jd.list Jd.string)



{- ==============================================================================
                              Graph QL Api Request
   ==============================================================================
-}


type Query
    = Mutation (List Field)
    | Query (List Field)


type Field
    = Field
        { name : String
        , args : List ( String, GraphQLValue )
        , return : List Field
        }


type GraphQLValue
    = GraphQLString String
    | GraphQLEnum String
    | GraphQLInt Int
    | GraphQLFloat Float
    | GraphQLObject (List ( String, GraphQLValue ))
    | GraphQLList (List GraphQLValue)
    | GraphQLNull


graphQlApiRequest : Query -> Jd.Decoder a -> (Result String a -> msg) -> Cmd.Cmd msg
graphQlApiRequest query responseDecoder callBack =
    Http.post
        { url = "https://us-central1-definy-lang.cloudfunctions.net/api"
        , body = graphQlRequestBody (queryToString query)
        , expect = Http.expectStringResponse callBack (graphQlResponseDecoderWithoutToken responseDecoder)
        }



{- ===== ====== -}


queryToString : Query -> String
queryToString query =
    case query of
        Mutation fieldList ->
            "mutation {\n" ++ (fieldList |> List.map fieldToString |> String.join "\n") ++ "}"

        Query fieldList ->
            "{\n" ++ (fieldList |> List.map fieldToString |> String.join "\n") ++ "}"


fieldToString : Field -> String
fieldToString (Field { name, args, return }) =
    name
        ++ (if args == [] then
                ""

            else
                "("
                    ++ (args
                            |> List.map (\( argsName, argsValue ) -> argsName ++ ": " ++ graphQLValueToString argsValue)
                            |> String.join ", "
                       )
                    ++ ")"
           )
        ++ (if return == [] then
                ""

            else
                " {\n" ++ (return |> List.map fieldToString |> String.join "\n") ++ "\n}"
           )


graphQLValueToString : GraphQLValue -> String
graphQLValueToString graphQLValue =
    case graphQLValue of
        GraphQLString string ->
            string |> Je.string |> Je.encode 0

        GraphQLEnum string ->
            string

        GraphQLInt int ->
            String.fromInt int

        GraphQLFloat float ->
            String.fromFloat float

        GraphQLObject object ->
            "{"
                ++ (object
                        |> List.map (\( argsName, argsValue ) -> argsName ++ ": " ++ graphQLValueToString argsValue)
                        |> String.join ", "
                   )
                ++ "}"

        GraphQLList list ->
            "["
                ++ (list |> List.map graphQLValueToString |> String.join ", ")
                ++ "]"

        GraphQLNull ->
            "null"


nullableGraphQLValue : (a -> GraphQLValue) -> Maybe a -> GraphQLValue
nullableGraphQLValue func maybe =
    case maybe of
        Just a ->
            func a

        Nothing ->
            GraphQLNull


graphQlRequestBody : String -> Http.Body
graphQlRequestBody queryOrMutation =
    Http.jsonBody
        (Je.object
            [ ( "query"
              , Je.string queryOrMutation
              )
            ]
        )


graphQlResponseDecoderWithoutToken : Jd.Decoder a -> Http.Response String -> Result String a
graphQlResponseDecoderWithoutToken decoder response =
    case response of
        Http.BadUrl_ _ ->
            Err "BadURL"

        Http.Timeout_ ->
            Err "Timeout"

        Http.NetworkError_ ->
            Err "NetworkError"

        Http.BadStatus_ _ body ->
            case body |> Jd.decodeString graphQLErrorResponseDecoderWithoutToken of
                Ok message ->
                    Err message

                Err decodeError ->
                    Err (Jd.errorToString decodeError)

        Http.GoodStatus_ _ body ->
            body
                |> Jd.decodeString
                    (Jd.field "data"
                        decoder
                    )
                |> Result.mapError Jd.errorToString


graphQLErrorResponseDecoderWithoutToken : Jd.Decoder String
graphQLErrorResponseDecoderWithoutToken =
    Jd.field "errors"
        (Jd.list
            (Jd.field "message" Jd.string)
        )
        |> Jd.map (String.join ", ")


batchError : List (Result String ()) -> Result String ()
batchError list =
    case list of
        [] ->
            Err "空のエラー"

        (Ok ()) :: _ ->
            Ok ()

        (Err message) :: xs ->
            case batchError xs of
                Ok () ->
                    Ok ()

                Err messageJoined ->
                    Err (message ++ ",\n" ++ messageJoined)
