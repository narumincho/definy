module Data exposing (AccessToken(..), Change(..), ClientMode(..), Comment, DateTime, FileHash(..), Idea, IdeaId(..), IdeaItem(..), Language(..), Location(..), ModuleSnapshot, OpenIdConnectProvider(..), PartId(..), PartSnapshot, Project, ProjectId(..), RequestLogInUrlRequestData, Suggestion, TypeSnapshot, UrlData, UserId(..), UserPublic, UserPublicAndUserId, accessTokenJsonDecoder, accessTokenToJsonValue, changeJsonDecoder, changeToJsonValue, clientModeJsonDecoder, clientModeToJsonValue, commentJsonDecoder, commentToJsonValue, dateTimeJsonDecoder, dateTimeToJsonValue, fileHashJsonDecoder, fileHashToJsonValue, ideaIdJsonDecoder, ideaIdToJsonValue, ideaItemJsonDecoder, ideaItemToJsonValue, ideaJsonDecoder, ideaToJsonValue, languageJsonDecoder, languageToJsonValue, locationJsonDecoder, locationToJsonValue, maybeJsonDecoder, maybeToJsonValue, moduleSnapshotJsonDecoder, moduleSnapshotToJsonValue, openIdConnectProviderJsonDecoder, openIdConnectProviderToJsonValue, partIdJsonDecoder, partIdToJsonValue, partSnapshotJsonDecoder, partSnapshotToJsonValue, projectIdJsonDecoder, projectIdToJsonValue, projectJsonDecoder, projectToJsonValue, requestLogInUrlRequestDataJsonDecoder, requestLogInUrlRequestDataToJsonValue, resultJsonDecoder, resultToJsonValue, suggestionJsonDecoder, suggestionToJsonValue, typeSnapshotJsonDecoder, typeSnapshotToJsonValue, urlDataJsonDecoder, urlDataToJsonValue, userIdJsonDecoder, userIdToJsonValue, userPublicAndUserIdJsonDecoder, userPublicAndUserIdToJsonValue, userPublicJsonDecoder, userPublicToJsonValue)

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
    = ClientModeDebugMode Int
    | ClientModeRelease


{-| ログインのURLを発行するために必要なデータ
-}
type alias RequestLogInUrlRequestData =
    { openIdConnectProvider : OpenIdConnectProvider, urlData : UrlData }


{-| プロバイダー (例: LINE, Google, GitHub)
-}
type OpenIdConnectProvider
    = OpenIdConnectProviderGoogle
    | OpenIdConnectProviderGitHub


{-| デバッグモードかどうか,言語とページの場所. URLとして表現されるデータ. Googleなどの検索エンジンの都合( <https://support.google.com/webmasters/answer/182192?hl=ja> )で,URLにページの言語のを入れて,言語ごとに別のURLである必要がある. デバッグ時のホスト名は <http://[::1]> になる
-}
type alias UrlData =
    { clientMode : ClientMode, location : Location, language : Language, accessToken : Maybe AccessToken }


{-| 英語,日本語,エスペラント語などの言語
-}
type Language
    = LanguageJapanese
    | LanguageEnglish
    | LanguageEsperanto


{-| DefinyWebアプリ内での場所を示すもの. URLから求められる. URLに変換できる
-}
type Location
    = LocationHome
    | LocationUser UserId
    | LocationProject ProjectId


{-| ユーザーが公開している情報
-}
type alias UserPublic =
    { name : String, imageHash : FileHash, introduction : String, createdAt : DateTime, likedProjectIdList : List ProjectId, developedProjectIdList : List ProjectId, commentedIdeaIdList : List IdeaId }


{-| 最初に自分の情報を得るときに返ってくるデータ
-}
type alias UserPublicAndUserId =
    { userId : UserId, userPublic : UserPublic }


{-| プロジェクト
-}
type alias Project =
    { name : String, icon : FileHash, image : FileHash, createdAt : DateTime }


{-| アイデア
-}
type alias Idea =
    { name : String, createdBy : UserId, description : String, createdAt : DateTime, itemList : List IdeaItem }


{-| アイデアのコメント
-}
type IdeaItem
    = IdeaItemComment Comment
    | IdeaItemSuggestion Suggestion


{-| 文章でのコメント
-}
type alias Comment =
    { body : String, createdBy : UserId, createdAt : DateTime }


{-| 編集提案
-}
type alias Suggestion =
    { createdAt : DateTime, description : String, change : Change }


{-| 変更点
-}
type Change
    = ChangeProjectName String


{-| モジュールのスナップショット
-}
type alias ModuleSnapshot =
    { name : List String, description : String, export : Bool }


{-| 型のスナップショット
-}
type alias TypeSnapshot =
    { name : String, parentList : List PartId, description : String }


{-| パーツのスナップショット
-}
type alias PartSnapshot =
    { name : String, parentList : List PartId, description : String }


type AccessToken
    = AccessToken String


type UserId
    = UserId String


type ProjectId
    = ProjectId String


type FileHash
    = FileHash String


type IdeaId
    = IdeaId String


type PartId
    = PartId String


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


fileHashToJsonValue : FileHash -> Je.Value
fileHashToJsonValue (FileHash string) =
    Je.string string


ideaIdToJsonValue : IdeaId -> Je.Value
ideaIdToJsonValue (IdeaId string) =
    Je.string string


partIdToJsonValue : PartId -> Je.Value
partIdToJsonValue (PartId string) =
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
        ClientModeDebugMode parameter ->
            Je.object [ ( "_", Je.string "DebugMode" ), ( "int32", Je.int parameter ) ]

        ClientModeRelease ->
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
        OpenIdConnectProviderGoogle ->
            Je.string "Google"

        OpenIdConnectProviderGitHub ->
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
        LanguageJapanese ->
            Je.string "Japanese"

        LanguageEnglish ->
            Je.string "English"

        LanguageEsperanto ->
            Je.string "Esperanto"


{-| LocationのJSONへのエンコーダ
-}
locationToJsonValue : Location -> Je.Value
locationToJsonValue location =
    case location of
        LocationHome ->
            Je.object [ ( "_", Je.string "Home" ) ]

        LocationUser parameter ->
            Je.object [ ( "_", Je.string "User" ), ( "userId", userIdToJsonValue parameter ) ]

        LocationProject parameter ->
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


{-| UserPublicAndUserIdのJSONへのエンコーダ
-}
userPublicAndUserIdToJsonValue : UserPublicAndUserId -> Je.Value
userPublicAndUserIdToJsonValue userPublicAndUserId =
    Je.object
        [ ( "userId", userIdToJsonValue userPublicAndUserId.userId )
        , ( "userPublic", userPublicToJsonValue userPublicAndUserId.userPublic )
        ]


{-| ProjectのJSONへのエンコーダ
-}
projectToJsonValue : Project -> Je.Value
projectToJsonValue project =
    Je.object
        [ ( "name", Je.string project.name )
        , ( "icon", fileHashToJsonValue project.icon )
        , ( "image", fileHashToJsonValue project.image )
        , ( "createdAt", dateTimeToJsonValue project.createdAt )
        ]


{-| IdeaのJSONへのエンコーダ
-}
ideaToJsonValue : Idea -> Je.Value
ideaToJsonValue idea =
    Je.object
        [ ( "name", Je.string idea.name )
        , ( "createdBy", userIdToJsonValue idea.createdBy )
        , ( "description", Je.string idea.description )
        , ( "createdAt", dateTimeToJsonValue idea.createdAt )
        , ( "itemList", Je.list ideaItemToJsonValue idea.itemList )
        ]


{-| IdeaItemのJSONへのエンコーダ
-}
ideaItemToJsonValue : IdeaItem -> Je.Value
ideaItemToJsonValue ideaItem =
    case ideaItem of
        IdeaItemComment parameter ->
            Je.object [ ( "_", Je.string "Comment" ), ( "comment", commentToJsonValue parameter ) ]

        IdeaItemSuggestion parameter ->
            Je.object [ ( "_", Je.string "Suggestion" ), ( "suggestion", suggestionToJsonValue parameter ) ]


{-| CommentのJSONへのエンコーダ
-}
commentToJsonValue : Comment -> Je.Value
commentToJsonValue comment =
    Je.object
        [ ( "body", Je.string comment.body )
        , ( "createdBy", userIdToJsonValue comment.createdBy )
        , ( "createdAt", dateTimeToJsonValue comment.createdAt )
        ]


{-| SuggestionのJSONへのエンコーダ
-}
suggestionToJsonValue : Suggestion -> Je.Value
suggestionToJsonValue suggestion =
    Je.object
        [ ( "createdAt", dateTimeToJsonValue suggestion.createdAt )
        , ( "description", Je.string suggestion.description )
        , ( "change", changeToJsonValue suggestion.change )
        ]


{-| ChangeのJSONへのエンコーダ
-}
changeToJsonValue : Change -> Je.Value
changeToJsonValue change =
    case change of
        ChangeProjectName parameter ->
            Je.object [ ( "_", Je.string "ProjectName" ), ( "string_", Je.string parameter ) ]


{-| ModuleSnapshotのJSONへのエンコーダ
-}
moduleSnapshotToJsonValue : ModuleSnapshot -> Je.Value
moduleSnapshotToJsonValue moduleSnapshot =
    Je.object
        [ ( "name", Je.list Je.string moduleSnapshot.name )
        , ( "description", Je.string moduleSnapshot.description )
        , ( "export", Je.bool moduleSnapshot.export )
        ]


{-| TypeSnapshotのJSONへのエンコーダ
-}
typeSnapshotToJsonValue : TypeSnapshot -> Je.Value
typeSnapshotToJsonValue typeSnapshot =
    Je.object
        [ ( "name", Je.string typeSnapshot.name )
        , ( "parentList", Je.list partIdToJsonValue typeSnapshot.parentList )
        , ( "description", Je.string typeSnapshot.description )
        ]


{-| PartSnapshotのJSONへのエンコーダ
-}
partSnapshotToJsonValue : PartSnapshot -> Je.Value
partSnapshotToJsonValue partSnapshot =
    Je.object
        [ ( "name", Je.string partSnapshot.name )
        , ( "parentList", Je.list partIdToJsonValue partSnapshot.parentList )
        , ( "description", Je.string partSnapshot.description )
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


fileHashJsonDecoder : Jd.Decoder FileHash
fileHashJsonDecoder =
    Jd.map FileHash Jd.string


ideaIdJsonDecoder : Jd.Decoder IdeaId
ideaIdJsonDecoder =
    Jd.map IdeaId Jd.string


partIdJsonDecoder : Jd.Decoder PartId
partIdJsonDecoder =
    Jd.map PartId Jd.string


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
                        Jd.field "int32" Jd.int |> Jd.map ClientModeDebugMode

                    "Release" ->
                        Jd.succeed ClientModeRelease

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
                        Jd.succeed OpenIdConnectProviderGoogle

                    "GitHub" ->
                        Jd.succeed OpenIdConnectProviderGitHub

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
                        Jd.succeed LanguageJapanese

                    "English" ->
                        Jd.succeed LanguageEnglish

                    "Esperanto" ->
                        Jd.succeed LanguageEsperanto

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
                        Jd.succeed LocationHome

                    "User" ->
                        Jd.field "userId" userIdJsonDecoder |> Jd.map LocationUser

                    "Project" ->
                        Jd.field "projectId" projectIdJsonDecoder |> Jd.map LocationProject

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


{-| UserPublicAndUserIdのJSON Decoder
-}
userPublicAndUserIdJsonDecoder : Jd.Decoder UserPublicAndUserId
userPublicAndUserIdJsonDecoder =
    Jd.succeed
        (\userId userPublic ->
            { userId = userId
            , userPublic = userPublic
            }
        )
        |> Jdp.required "userId" userIdJsonDecoder
        |> Jdp.required "userPublic" userPublicJsonDecoder


{-| ProjectのJSON Decoder
-}
projectJsonDecoder : Jd.Decoder Project
projectJsonDecoder =
    Jd.succeed
        (\name icon image createdAt ->
            { name = name
            , icon = icon
            , image = image
            , createdAt = createdAt
            }
        )
        |> Jdp.required "name" Jd.string
        |> Jdp.required "icon" fileHashJsonDecoder
        |> Jdp.required "image" fileHashJsonDecoder
        |> Jdp.required "createdAt" dateTimeJsonDecoder


{-| IdeaのJSON Decoder
-}
ideaJsonDecoder : Jd.Decoder Idea
ideaJsonDecoder =
    Jd.succeed
        (\name createdBy description createdAt itemList ->
            { name = name
            , createdBy = createdBy
            , description = description
            , createdAt = createdAt
            , itemList = itemList
            }
        )
        |> Jdp.required "name" Jd.string
        |> Jdp.required "createdBy" userIdJsonDecoder
        |> Jdp.required "description" Jd.string
        |> Jdp.required "createdAt" dateTimeJsonDecoder
        |> Jdp.required "itemList" (Jd.list ideaItemJsonDecoder)


{-| IdeaItemのJSON Decoder
-}
ideaItemJsonDecoder : Jd.Decoder IdeaItem
ideaItemJsonDecoder =
    Jd.field "_" Jd.string
        |> Jd.andThen
            (\tag ->
                case tag of
                    "Comment" ->
                        Jd.field "comment" commentJsonDecoder |> Jd.map IdeaItemComment

                    "Suggestion" ->
                        Jd.field "suggestion" suggestionJsonDecoder |> Jd.map IdeaItemSuggestion

                    _ ->
                        Jd.fail ("IdeaItemで不明なタグを受けたとった tag=" ++ tag)
            )


{-| CommentのJSON Decoder
-}
commentJsonDecoder : Jd.Decoder Comment
commentJsonDecoder =
    Jd.succeed
        (\body createdBy createdAt ->
            { body = body
            , createdBy = createdBy
            , createdAt = createdAt
            }
        )
        |> Jdp.required "body" Jd.string
        |> Jdp.required "createdBy" userIdJsonDecoder
        |> Jdp.required "createdAt" dateTimeJsonDecoder


{-| SuggestionのJSON Decoder
-}
suggestionJsonDecoder : Jd.Decoder Suggestion
suggestionJsonDecoder =
    Jd.succeed
        (\createdAt description change ->
            { createdAt = createdAt
            , description = description
            , change = change
            }
        )
        |> Jdp.required "createdAt" dateTimeJsonDecoder
        |> Jdp.required "description" Jd.string
        |> Jdp.required "change" changeJsonDecoder


{-| ChangeのJSON Decoder
-}
changeJsonDecoder : Jd.Decoder Change
changeJsonDecoder =
    Jd.field "_" Jd.string
        |> Jd.andThen
            (\tag ->
                case tag of
                    "ProjectName" ->
                        Jd.field "string_" Jd.string |> Jd.map ChangeProjectName

                    _ ->
                        Jd.fail ("Changeで不明なタグを受けたとった tag=" ++ tag)
            )


{-| ModuleSnapshotのJSON Decoder
-}
moduleSnapshotJsonDecoder : Jd.Decoder ModuleSnapshot
moduleSnapshotJsonDecoder =
    Jd.succeed
        (\name description export ->
            { name = name
            , description = description
            , export = export
            }
        )
        |> Jdp.required "name" (Jd.list Jd.string)
        |> Jdp.required "description" Jd.string
        |> Jdp.required "export" Jd.bool


{-| TypeSnapshotのJSON Decoder
-}
typeSnapshotJsonDecoder : Jd.Decoder TypeSnapshot
typeSnapshotJsonDecoder =
    Jd.succeed
        (\name parentList description ->
            { name = name
            , parentList = parentList
            , description = description
            }
        )
        |> Jdp.required "name" Jd.string
        |> Jdp.required "parentList" (Jd.list partIdJsonDecoder)
        |> Jdp.required "description" Jd.string


{-| PartSnapshotのJSON Decoder
-}
partSnapshotJsonDecoder : Jd.Decoder PartSnapshot
partSnapshotJsonDecoder =
    Jd.succeed
        (\name parentList description ->
            { name = name
            , parentList = parentList
            , description = description
            }
        )
        |> Jdp.required "name" Jd.string
        |> Jdp.required "parentList" (Jd.list partIdJsonDecoder)
        |> Jdp.required "description" Jd.string
