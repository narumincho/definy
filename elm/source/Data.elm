module Data exposing (AccessToken(..), ClientMode(..), DateTime, FileHash(..), IdeaId(..), Language(..), Location(..), OpenIdConnectProvider(..), ProjectId(..), RequestLogInUrlRequestData, UrlData, UserId(..), UserPublic, accessTokenJsonDecoder, accessTokenToJsonValue, clientModeJsonDecoder, clientModeToJsonValue, dateTimeJsonDecoder, dateTimeToJsonValue, fileHashJsonDecoder, fileHashToJsonValue, ideaIdJsonDecoder, ideaIdToJsonValue, languageJsonDecoder, languageToJsonValue, locationJsonDecoder, locationToJsonValue, maybeJsonDecoder, maybeToJsonValue, openIdConnectProviderJsonDecoder, openIdConnectProviderToJsonValue, projectIdJsonDecoder, projectIdToJsonValue, requestLogInUrlRequestDataJsonDecoder, requestLogInUrlRequestDataToJsonValue, resultJsonDecoder, resultToJsonValue, urlDataJsonDecoder, urlDataToJsonValue, userIdJsonDecoder, userIdToJsonValue, userPublicJsonDecoder, userPublicToJsonValue)

import Json.Decode as Jd
import Json.Decode.Pipeline as Jdp
import Json.Encode as Je


{-| 日時 最小単位は秒
-}
type alias DateTime =
    { year : Int, month : Int, day : Int, hour : Int, minute : Int, second : Int }


{-| デバッグの状態と, デバッグ時ならアクセスしているポート番号
-}
type ClientMode
    = DebugMode Int
    | Release


{-| ログインのURLを発行するために必要なデータ
-}
type alias RequestLogInUrlRequestData =
    { openIdConnectProvider : OpenIdConnectProvider, urlData : UrlData }


{-| プロバイダー (例: LINE, Google, GitHub)
-}
type OpenIdConnectProvider
    = Google
    | GitHub


{-| デバッグモードかどうか,言語とページの場所. URLとして表現されるデータ. Googleなどの検索エンジンの都合( <https://support.google.com/webmasters/answer/182192?hl=ja> )で,URLにページの言語のを入れて,言語ごとに別のURLである必要がある. デバッグ時のホスト名は <http://[::1]> になる
-}
type alias UrlData =
    { clientMode : ClientMode, location : Location, language : Language, accessToken : Maybe AccessToken }


{-| 英語,日本語,エスペラント語などの言語
-}
type Language
    = Japanese
    | English
    | Esperanto


{-| DefinyWebアプリ内での場所を示すもの. URLから求められる. URLに変換できる
-}
type Location
    = Home
    | User UserId
    | Project ProjectId


{-| ユーザーが公開している情報
-}
type alias UserPublic =
    { name : String, imageHash : FileHash, introduction : String, createdAt : DateTime, likedProjectIdList : List ProjectId, developedProjectIdList : List ProjectId, commentedIdeaIdList : List IdeaId }


type AccessToken
    = AccessToken String


type UserId
    = UserId String


type ProjectId
    = ProjectId String


type IdeaId
    = IdeaId String


type FileHash
    = FileHash String


maybeToJsonValue : (a -> Je.Value) -> Maybe a -> Je.Value
maybeToJsonValue toJsonValueFunction maybe =
    case maybe of
        Just value ->
            Je.object [ ( "_", Je.string "Just" ), ( "value", toJsonValueFunction value ) ]

        Nothing ->
            Je.object [ ( "_", Je.string "Nothing" ) ]


resultToJsonValue : (ok -> Je.Value) -> (error -> Je.Value) -> Result error ok -> Je.Value
resultToJsonValue okToJsonValueFunction errorToJsonValueFunction result =
    case result of
        Ok value ->
            Je.object [ ( "_", Je.string "Ok" ), ( "ok", okToJsonValueFunction value ) ]

        Err value ->
            Je.object [ ( "_", Je.string "Error" ), ( "error", errorToJsonValueFunction value ) ]


accessTokenToJsonValue : AccessToken -> Je.Value
accessTokenToJsonValue (AccessToken string) =
    Je.string string


userIdToJsonValue : UserId -> Je.Value
userIdToJsonValue (UserId string) =
    Je.string string


projectIdToJsonValue : ProjectId -> Je.Value
projectIdToJsonValue (ProjectId string) =
    Je.string string


ideaIdToJsonValue : IdeaId -> Je.Value
ideaIdToJsonValue (IdeaId string) =
    Je.string string


fileHashToJsonValue : FileHash -> Je.Value
fileHashToJsonValue (FileHash string) =
    Je.string string


{-| DateTimeのJSONへのエンコーダ
-}
dateTimeToJsonValue : DateTime -> Je.Value
dateTimeToJsonValue dateTime =
    Je.object
        [ ( "year", Je.int dateTime.year )
        , ( "month", Je.int dateTime.month )
        , ( "day", Je.int dateTime.day )
        , ( "hour", Je.int dateTime.hour )
        , ( "minute", Je.int dateTime.minute )
        , ( "second", Je.int dateTime.second )
        ]


{-| ClientModeのJSONへのエンコーダ
-}
clientModeToJsonValue : ClientMode -> Je.Value
clientModeToJsonValue clientMode =
    case clientMode of
        DebugMode parameter ->
            Je.object [ ( "_", Je.string "DebugMode" ), ( "int32", Je.int parameter ) ]

        Release ->
            Je.object [ ( "_", Je.string "Release" ) ]


{-| RequestLogInUrlRequestDataのJSONへのエンコーダ
-}
requestLogInUrlRequestDataToJsonValue : RequestLogInUrlRequestData -> Je.Value
requestLogInUrlRequestDataToJsonValue requestLogInUrlRequestData =
    Je.object
        [ ( "openIdConnectProvider", openIdConnectProviderToJsonValue requestLogInUrlRequestData.openIdConnectProvider )
        , ( "urlData", urlDataToJsonValue requestLogInUrlRequestData.urlData )
        ]


{-| OpenIdConnectProviderのJSONへのエンコーダ
-}
openIdConnectProviderToJsonValue : OpenIdConnectProvider -> Je.Value
openIdConnectProviderToJsonValue openIdConnectProvider =
    case openIdConnectProvider of
        Google ->
            Je.string "Google"

        GitHub ->
            Je.string "GitHub"


{-| UrlDataのJSONへのエンコーダ
-}
urlDataToJsonValue : UrlData -> Je.Value
urlDataToJsonValue urlData =
    Je.object
        [ ( "clientMode", clientModeToJsonValue urlData.clientMode )
        , ( "location", locationToJsonValue urlData.location )
        , ( "language", languageToJsonValue urlData.language )
        , ( "accessToken", maybeToJsonValue accessTokenToJsonValue urlData.accessToken )
        ]


{-| LanguageのJSONへのエンコーダ
-}
languageToJsonValue : Language -> Je.Value
languageToJsonValue language =
    case language of
        Japanese ->
            Je.string "Japanese"

        English ->
            Je.string "English"

        Esperanto ->
            Je.string "Esperanto"


{-| LocationのJSONへのエンコーダ
-}
locationToJsonValue : Location -> Je.Value
locationToJsonValue location =
    case location of
        Home ->
            Je.object [ ( "_", Je.string "Home" ) ]

        User parameter ->
            Je.object [ ( "_", Je.string "User" ), ( "userId", userIdToJsonValue parameter ) ]

        Project parameter ->
            Je.object [ ( "_", Je.string "Project" ), ( "projectId", projectIdToJsonValue parameter ) ]


{-| UserPublicのJSONへのエンコーダ
-}
userPublicToJsonValue : UserPublic -> Je.Value
userPublicToJsonValue userPublic =
    Je.object
        [ ( "name", Je.string userPublic.name )
        , ( "imageHash", fileHashToJsonValue userPublic.imageHash )
        , ( "introduction", Je.string userPublic.introduction )
        , ( "createdAt", dateTimeToJsonValue userPublic.createdAt )
        , ( "likedProjectIdList", Je.list projectIdToJsonValue userPublic.likedProjectIdList )
        , ( "developedProjectIdList", Je.list projectIdToJsonValue userPublic.developedProjectIdList )
        , ( "commentedIdeaIdList", Je.list ideaIdToJsonValue userPublic.commentedIdeaIdList )
        ]


maybeJsonDecoder : Jd.Decoder a -> Jd.Decoder (Maybe a)
maybeJsonDecoder decoder =
    Jd.field "_" Jd.string
        |> Jd.andThen
            (\tag ->
                case tag of
                    "Just" ->
                        Jd.field "value" decoder |> Jd.map Just

                    "Nothing" ->
                        Jd.succeed Nothing

                    _ ->
                        Jd.fail "maybeのtagの指定が間違っていた"
            )


resultJsonDecoder : Jd.Decoder ok -> Jd.Decoder error -> Jd.Decoder (Result error ok)
resultJsonDecoder okDecoder errorDecoder =
    Jd.field "_" Jd.string
        |> Jd.andThen
            (\tag ->
                case tag of
                    "Ok" ->
                        Jd.field "ok" okDecoder |> Jd.map Ok

                    "Error" ->
                        Jd.field "error" errorDecoder |> Jd.map Err

                    _ ->
                        Jd.fail "resultのtagの指定が間違っていた"
            )


accessTokenJsonDecoder : Jd.Decoder AccessToken
accessTokenJsonDecoder =
    Jd.map AccessToken Jd.string


userIdJsonDecoder : Jd.Decoder UserId
userIdJsonDecoder =
    Jd.map UserId Jd.string


projectIdJsonDecoder : Jd.Decoder ProjectId
projectIdJsonDecoder =
    Jd.map ProjectId Jd.string


ideaIdJsonDecoder : Jd.Decoder IdeaId
ideaIdJsonDecoder =
    Jd.map IdeaId Jd.string


fileHashJsonDecoder : Jd.Decoder FileHash
fileHashJsonDecoder =
    Jd.map FileHash Jd.string


{-| DateTimeのJSON Decoder
-}
dateTimeJsonDecoder : Jd.Decoder DateTime
dateTimeJsonDecoder =
    Jd.succeed
        (\year month day hour minute second ->
            { year = year
            , month = month
            , day = day
            , hour = hour
            , minute = minute
            , second = second
            }
        )
        |> Jdp.required "year" Jd.int
        |> Jdp.required "month" Jd.int
        |> Jdp.required "day" Jd.int
        |> Jdp.required "hour" Jd.int
        |> Jdp.required "minute" Jd.int
        |> Jdp.required "second" Jd.int


{-| ClientModeのJSON Decoder
-}
clientModeJsonDecoder : Jd.Decoder ClientMode
clientModeJsonDecoder =
    Jd.field "_" Jd.string
        |> Jd.andThen
            (\tag ->
                case tag of
                    "DebugMode" ->
                        Jd.field "int32" Jd.int |> Jd.map DebugMode

                    "Release" ->
                        Jd.succeed Release

                    _ ->
                        Jd.fail ("ClientModeで不明なタグを受けたとった tag=" ++ tag)
            )


{-| RequestLogInUrlRequestDataのJSON Decoder
-}
requestLogInUrlRequestDataJsonDecoder : Jd.Decoder RequestLogInUrlRequestData
requestLogInUrlRequestDataJsonDecoder =
    Jd.succeed
        (\openIdConnectProvider urlData ->
            { openIdConnectProvider = openIdConnectProvider
            , urlData = urlData
            }
        )
        |> Jdp.required "openIdConnectProvider" openIdConnectProviderJsonDecoder
        |> Jdp.required "urlData" urlDataJsonDecoder


{-| OpenIdConnectProviderのJSON Decoder
-}
openIdConnectProviderJsonDecoder : Jd.Decoder OpenIdConnectProvider
openIdConnectProviderJsonDecoder =
    Jd.string
        |> Jd.andThen
            (\tag ->
                case tag of
                    "Google" ->
                        Jd.succeed Google

                    "GitHub" ->
                        Jd.succeed GitHub

                    _ ->
                        Jd.fail ("OpenIdConnectProviderで不明なタグを受けたとった tag=" ++ tag)
            )


{-| UrlDataのJSON Decoder
-}
urlDataJsonDecoder : Jd.Decoder UrlData
urlDataJsonDecoder =
    Jd.succeed
        (\clientMode location language accessToken ->
            { clientMode = clientMode
            , location = location
            , language = language
            , accessToken = accessToken
            }
        )
        |> Jdp.required "clientMode" clientModeJsonDecoder
        |> Jdp.required "location" locationJsonDecoder
        |> Jdp.required "language" languageJsonDecoder
        |> Jdp.required "accessToken" (maybeJsonDecoder accessTokenJsonDecoder)


{-| LanguageのJSON Decoder
-}
languageJsonDecoder : Jd.Decoder Language
languageJsonDecoder =
    Jd.string
        |> Jd.andThen
            (\tag ->
                case tag of
                    "Japanese" ->
                        Jd.succeed Japanese

                    "English" ->
                        Jd.succeed English

                    "Esperanto" ->
                        Jd.succeed Esperanto

                    _ ->
                        Jd.fail ("Languageで不明なタグを受けたとった tag=" ++ tag)
            )


{-| LocationのJSON Decoder
-}
locationJsonDecoder : Jd.Decoder Location
locationJsonDecoder =
    Jd.field "_" Jd.string
        |> Jd.andThen
            (\tag ->
                case tag of
                    "Home" ->
                        Jd.succeed Home

                    "User" ->
                        Jd.field "userId" userIdJsonDecoder |> Jd.map User

                    "Project" ->
                        Jd.field "projectId" projectIdJsonDecoder |> Jd.map Project

                    _ ->
                        Jd.fail ("Locationで不明なタグを受けたとった tag=" ++ tag)
            )


{-| UserPublicのJSON Decoder
-}
userPublicJsonDecoder : Jd.Decoder UserPublic
userPublicJsonDecoder =
    Jd.succeed
        (\name imageHash introduction createdAt likedProjectIdList developedProjectIdList commentedIdeaIdList ->
            { name = name
            , imageHash = imageHash
            , introduction = introduction
            , createdAt = createdAt
            , likedProjectIdList = likedProjectIdList
            , developedProjectIdList = developedProjectIdList
            , commentedIdeaIdList = commentedIdeaIdList
            }
        )
        |> Jdp.required "name" Jd.string
        |> Jdp.required "imageHash" fileHashJsonDecoder
        |> Jdp.required "introduction" Jd.string
        |> Jdp.required "createdAt" dateTimeJsonDecoder
        |> Jdp.required "likedProjectIdList" (Jd.list projectIdJsonDecoder)
        |> Jdp.required "developedProjectIdList" (Jd.list projectIdJsonDecoder)
        |> Jdp.required "commentedIdeaIdList" (Jd.list ideaIdJsonDecoder)
