module Data exposing (AccessToken(..), AccessTokenError(..), BranchPartDefinition, Change(..), ClientMode(..), Comment, Condition(..), ConditionCapture, ConditionTag, CreateProjectParameter, EvaluateExprError(..), EvaluatedExpr(..), Expr(..), FileHash(..), FunctionCall, Idea, IdeaId(..), IdeaItem(..), KernelCall, KernelExpr(..), LambdaBranch, Language(..), LocalPartId(..), LocalPartReference, Location(..), Module, ModuleId(..), OpenIdConnectProvider(..), PartDefinition, PartId(..), Project, ProjectAndProjectId, ProjectCache, ProjectCacheWithId, ProjectId(..), RequestLogInUrlRequestData, Suggestion, TagId(..), TagReferenceIndex, Time, Type, TypeBody(..), TypeBodyKernel(..), TypeBodyProductMember, TypeBodySumPattern, TypeDefinition, TypeError, TypeId(..), UrlData, User, UserAndUserId, UserCache, UserCacheWithId, UserId(..), accessTokenErrorJsonDecoder, accessTokenErrorToJsonValue, accessTokenJsonDecoder, accessTokenToJsonValue, branchPartDefinitionJsonDecoder, branchPartDefinitionToJsonValue, changeJsonDecoder, changeToJsonValue, clientModeJsonDecoder, clientModeToJsonValue, commentJsonDecoder, commentToJsonValue, conditionCaptureJsonDecoder, conditionCaptureToJsonValue, conditionJsonDecoder, conditionTagJsonDecoder, conditionTagToJsonValue, conditionToJsonValue, createProjectParameterJsonDecoder, createProjectParameterToJsonValue, evaluateExprErrorJsonDecoder, evaluateExprErrorToJsonValue, evaluatedExprJsonDecoder, evaluatedExprToJsonValue, exprJsonDecoder, exprToJsonValue, fileHashJsonDecoder, fileHashToJsonValue, functionCallJsonDecoder, functionCallToJsonValue, ideaIdJsonDecoder, ideaIdToJsonValue, ideaItemJsonDecoder, ideaItemToJsonValue, ideaJsonDecoder, ideaToJsonValue, kernelCallJsonDecoder, kernelCallToJsonValue, kernelExprJsonDecoder, kernelExprToJsonValue, lambdaBranchJsonDecoder, lambdaBranchToJsonValue, languageJsonDecoder, languageToJsonValue, localPartIdJsonDecoder, localPartIdToJsonValue, localPartReferenceJsonDecoder, localPartReferenceToJsonValue, locationJsonDecoder, locationToJsonValue, maybeJsonDecoder, maybeToJsonValue, moduleIdJsonDecoder, moduleIdToJsonValue, moduleJsonDecoder, moduleToJsonValue, openIdConnectProviderJsonDecoder, openIdConnectProviderToJsonValue, partDefinitionJsonDecoder, partDefinitionToJsonValue, partIdJsonDecoder, partIdToJsonValue, projectAndProjectIdJsonDecoder, projectAndProjectIdToJsonValue, projectCacheJsonDecoder, projectCacheToJsonValue, projectCacheWithIdJsonDecoder, projectCacheWithIdToJsonValue, projectIdJsonDecoder, projectIdToJsonValue, projectJsonDecoder, projectToJsonValue, requestLogInUrlRequestDataJsonDecoder, requestLogInUrlRequestDataToJsonValue, resultJsonDecoder, resultToJsonValue, suggestionJsonDecoder, suggestionToJsonValue, tagIdJsonDecoder, tagIdToJsonValue, tagReferenceIndexJsonDecoder, tagReferenceIndexToJsonValue, timeJsonDecoder, timeToJsonValue, typeBodyJsonDecoder, typeBodyKernelJsonDecoder, typeBodyKernelToJsonValue, typeBodyProductMemberJsonDecoder, typeBodyProductMemberToJsonValue, typeBodySumPatternJsonDecoder, typeBodySumPatternToJsonValue, typeBodyToJsonValue, typeDefinitionJsonDecoder, typeDefinitionToJsonValue, typeErrorJsonDecoder, typeErrorToJsonValue, typeIdJsonDecoder, typeIdToJsonValue, typeJsonDecoder, typeToJsonValue, urlDataJsonDecoder, urlDataToJsonValue, userAndUserIdJsonDecoder, userAndUserIdToJsonValue, userCacheJsonDecoder, userCacheToJsonValue, userCacheWithIdJsonDecoder, userCacheWithIdToJsonValue, userIdJsonDecoder, userIdToJsonValue, userJsonDecoder, userToJsonValue)

import Json.Decode as Jd
import Json.Decode.Pipeline as Jdp
import Json.Encode as Je


{-| 日時. 0001-01-01T00:00:00.000Z to 9999-12-31T23:59:59.999Z 最小単位はミリ秒. ミリ秒の求め方は day\_1000\_60\_60\_24 + millisecond
-}
type alias Time =
    { day : Int, millisecond : Int }


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
    | LocationCreateProject
    | LocationUser UserId
    | LocationProject ProjectId


{-| ユーザーが公開している情報
-}
type alias User =
    { name : String, imageHash : FileHash, introduction : String, createdAt : Time, likedProjectIdList : List ProjectId, developedProjectIdList : List ProjectId, commentedIdeaIdList : List IdeaId }


{-| 最初に自分の情報を得るときに返ってくるデータ
-}
type alias UserAndUserId =
    { userId : UserId, user : User }


{-| プロジェクト
-}
type alias Project =
    { name : String, icon : FileHash, image : FileHash, createdAt : Time, createdBy : UserId }


{-| プロジェクトを作成したときに返ってくるデータ
-}
type alias ProjectAndProjectId =
    { projectId : ProjectId, project : Project }


{-| アイデア
-}
type alias Idea =
    { name : String, createdBy : UserId, description : String, createdAt : Time, itemList : List IdeaItem }


{-| アイデアのコメント
-}
type IdeaItem
    = IdeaItemComment Comment
    | IdeaItemSuggestion Suggestion


{-| 文章でのコメント
-}
type alias Comment =
    { body : String, createdBy : UserId, createdAt : Time }


{-| 編集提案
-}
type alias Suggestion =
    { createdAt : Time, description : String, change : Change }


{-| 変更点
-}
type Change
    = ChangeProjectName String


{-| モジュール
-}
type alias Module =
    { name : List String, description : String, export : Bool }


{-| 型の定義
-}
type alias TypeDefinition =
    { name : String, parentList : List PartId, description : String }


{-| 型の定義本体
-}
type TypeBody
    = TypeBodyProduct (List TypeBodyProductMember)
    | TypeBodySum (List TypeBodySumPattern)
    | TypeBodyKernel TypeBodyKernel


{-| 直積型のメンバー
-}
type alias TypeBodyProductMember =
    { name : String, description : String, memberType : TypeId }


{-| 直積型のパターン
-}
type alias TypeBodySumPattern =
    { name : String, description : String, parameter : Maybe TypeId }


{-| Definyだけでは表現できないデータ型
-}
type TypeBodyKernel
    = TypeBodyKernelFunction
    | TypeBodyKernelInt32
    | TypeBodyKernelList


{-| パーツの定義
-}
type alias PartDefinition =
    { name : String, parentList : List PartId, description : String, type_ : Type, expr : Maybe Expr, moduleId : ModuleId }


{-| 型
-}
type Type
    = Type { reference : TypeId, parameter : List Type }


{-| 式
-}
type Expr
    = ExprKernel KernelExpr
    | ExprInt32Literal Int
    | ExprPartReference PartId
    | ExprLocalPartReference LocalPartReference
    | ExprTagReference TagReferenceIndex
    | ExprFunctionCall FunctionCall
    | ExprLambda (List LambdaBranch)


{-| 評価しきった式
-}
type EvaluatedExpr
    = EvaluatedExprKernel KernelExpr
    | EvaluatedExprInt32 Int
    | EvaluatedExprTagReference TagReferenceIndex
    | EvaluatedExprLambda (List LambdaBranch)
    | EvaluatedExprKernelCall KernelCall


{-| 複数の引数が必要な内部関数の部分呼び出し
-}
type alias KernelCall =
    { kernel : KernelExpr, expr : EvaluatedExpr }


{-| Definyだけでは表現できない式
-}
type KernelExpr
    = KernelExprInt32Add
    | KernelExprInt32Sub
    | KernelExprInt32Mul


{-| ローカルパスの参照を表す
-}
type alias LocalPartReference =
    { partId : PartId, localPartId : LocalPartId }


{-| タグの参照を表す
-}
type alias TagReferenceIndex =
    { typeId : TypeId, tagIndex : Int }


{-| 関数呼び出し
-}
type alias FunctionCall =
    { function : Expr, parameter : Expr }


{-| ラムダのブランチ. Just x -> data x のようなところ
-}
type alias LambdaBranch =
    { condition : Condition, description : String, localPartList : List BranchPartDefinition, expr : Maybe Expr }


{-| ブランチの式を使う条件
-}
type Condition
    = ConditionByTag ConditionTag
    | ConditionByCapture ConditionCapture
    | ConditionAny
    | ConditionInt32 Int


{-| タグによる条件
-}
type alias ConditionTag =
    { tag : TagId, parameter : Maybe Condition }


{-| キャプチャパーツへのキャプチャ
-}
type alias ConditionCapture =
    { name : String, localPartId : LocalPartId }


{-| ラムダのブランチで使えるパーツを定義する部分
-}
type alias BranchPartDefinition =
    { localPartId : LocalPartId, name : String, description : String, type_ : Type, expr : Expr }


type EvaluateExprError
    = EvaluateExprErrorNeedPartDefinition PartId
    | EvaluateExprErrorPartExprIsNothing PartId
    | EvaluateExprErrorCannotFindLocalPartDefinition LocalPartReference
    | EvaluateExprErrorTypeError TypeError
    | EvaluateExprErrorNotSupported


{-| 型エラー
-}
type alias TypeError =
    { message : String }


{-| プロジェクト作成時に必要なパラメーター
-}
type alias CreateProjectParameter =
    { accessToken : AccessToken, projectName : String }


{-| アクセストークンに関するエラー
-}
type AccessTokenError
    = AccessTokenErrorAccessTokenExpiredOrInvalid
    | AccessTokenErrorProjectNameIsInvalid


{-| indexDBに格納したりする取得日時も含めたProject
-}
type alias ProjectCache =
    { project : Project, respondTime : Time }


{-| indexDBに格納したりする取得日も含めたUser
-}
type alias UserCache =
    { user : User, respondTime : Time }


{-| プロジェクトのキャッシュデータとID. indexedDBからElmに渡す用
-}
type alias ProjectCacheWithId =
    { projectCache : Maybe ProjectCache, projectId : ProjectId }


{-| ユーザーのキャッシュデータとID. indexedDBからElmに渡す用
-}
type alias UserCacheWithId =
    { userCache : Maybe UserCache, userId : UserId }


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


type TypeId
    = TypeId String


type ModuleId
    = ModuleId String


type LocalPartId
    = LocalPartId String


type TagId
    = TagId String


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


typeIdToJsonValue : TypeId -> Je.Value
typeIdToJsonValue (TypeId string) =
    Je.string string


moduleIdToJsonValue : ModuleId -> Je.Value
moduleIdToJsonValue (ModuleId string) =
    Je.string string


localPartIdToJsonValue : LocalPartId -> Je.Value
localPartIdToJsonValue (LocalPartId string) =
    Je.string string


tagIdToJsonValue : TagId -> Je.Value
tagIdToJsonValue (TagId string) =
    Je.string string


{-| TimeのJSONへのエンコーダ
-}
timeToJsonValue : Time -> Je.Value
timeToJsonValue time =
    Je.object
        [ ( "day", Je.int time.day )
        , ( "millisecond", Je.int time.millisecond )
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

        LocationCreateProject ->
            Je.object [ ( "_", Je.string "CreateProject" ) ]

        LocationUser parameter ->
            Je.object [ ( "_", Je.string "User" ), ( "userId", userIdToJsonValue parameter ) ]

        LocationProject parameter ->
            Je.object [ ( "_", Je.string "Project" ), ( "projectId", projectIdToJsonValue parameter ) ]


{-| UserのJSONへのエンコーダ
-}
userToJsonValue : User -> Je.Value
userToJsonValue user =
    Je.object
        [ ( "name", Je.string user.name )
        , ( "imageHash", fileHashToJsonValue user.imageHash )
        , ( "introduction", Je.string user.introduction )
        , ( "createdAt", timeToJsonValue user.createdAt )
        , ( "likedProjectIdList", Je.list projectIdToJsonValue user.likedProjectIdList )
        , ( "developedProjectIdList", Je.list projectIdToJsonValue user.developedProjectIdList )
        , ( "commentedIdeaIdList", Je.list ideaIdToJsonValue user.commentedIdeaIdList )
        ]


{-| UserAndUserIdのJSONへのエンコーダ
-}
userAndUserIdToJsonValue : UserAndUserId -> Je.Value
userAndUserIdToJsonValue userAndUserId =
    Je.object
        [ ( "userId", userIdToJsonValue userAndUserId.userId )
        , ( "user", userToJsonValue userAndUserId.user )
        ]


{-| ProjectのJSONへのエンコーダ
-}
projectToJsonValue : Project -> Je.Value
projectToJsonValue project =
    Je.object
        [ ( "name", Je.string project.name )
        , ( "icon", fileHashToJsonValue project.icon )
        , ( "image", fileHashToJsonValue project.image )
        , ( "createdAt", timeToJsonValue project.createdAt )
        , ( "createdBy", userIdToJsonValue project.createdBy )
        ]


{-| ProjectAndProjectIdのJSONへのエンコーダ
-}
projectAndProjectIdToJsonValue : ProjectAndProjectId -> Je.Value
projectAndProjectIdToJsonValue projectAndProjectId =
    Je.object
        [ ( "projectId", projectIdToJsonValue projectAndProjectId.projectId )
        , ( "project", projectToJsonValue projectAndProjectId.project )
        ]


{-| IdeaのJSONへのエンコーダ
-}
ideaToJsonValue : Idea -> Je.Value
ideaToJsonValue idea =
    Je.object
        [ ( "name", Je.string idea.name )
        , ( "createdBy", userIdToJsonValue idea.createdBy )
        , ( "description", Je.string idea.description )
        , ( "createdAt", timeToJsonValue idea.createdAt )
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
        , ( "createdAt", timeToJsonValue comment.createdAt )
        ]


{-| SuggestionのJSONへのエンコーダ
-}
suggestionToJsonValue : Suggestion -> Je.Value
suggestionToJsonValue suggestion =
    Je.object
        [ ( "createdAt", timeToJsonValue suggestion.createdAt )
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


{-| ModuleのJSONへのエンコーダ
-}
moduleToJsonValue : Module -> Je.Value
moduleToJsonValue module_ =
    Je.object
        [ ( "name", Je.list Je.string module_.name )
        , ( "description", Je.string module_.description )
        , ( "export", Je.bool module_.export )
        ]


{-| TypeDefinitionのJSONへのエンコーダ
-}
typeDefinitionToJsonValue : TypeDefinition -> Je.Value
typeDefinitionToJsonValue typeDefinition =
    Je.object
        [ ( "name", Je.string typeDefinition.name )
        , ( "parentList", Je.list partIdToJsonValue typeDefinition.parentList )
        , ( "description", Je.string typeDefinition.description )
        ]


{-| TypeBodyのJSONへのエンコーダ
-}
typeBodyToJsonValue : TypeBody -> Je.Value
typeBodyToJsonValue typeBody =
    case typeBody of
        TypeBodyProduct parameter ->
            Je.object [ ( "_", Je.string "Product" ), ( "typeBodyProductMemberList", Je.list typeBodyProductMemberToJsonValue parameter ) ]

        TypeBodySum parameter ->
            Je.object [ ( "_", Je.string "Sum" ), ( "typeBodySumPatternList", Je.list typeBodySumPatternToJsonValue parameter ) ]

        TypeBodyKernel parameter ->
            Je.object [ ( "_", Je.string "Kernel" ), ( "typeBodyKernel", typeBodyKernelToJsonValue parameter ) ]


{-| TypeBodyProductMemberのJSONへのエンコーダ
-}
typeBodyProductMemberToJsonValue : TypeBodyProductMember -> Je.Value
typeBodyProductMemberToJsonValue typeBodyProductMember =
    Je.object
        [ ( "name", Je.string typeBodyProductMember.name )
        , ( "description", Je.string typeBodyProductMember.description )
        , ( "memberType", typeIdToJsonValue typeBodyProductMember.memberType )
        ]


{-| TypeBodySumPatternのJSONへのエンコーダ
-}
typeBodySumPatternToJsonValue : TypeBodySumPattern -> Je.Value
typeBodySumPatternToJsonValue typeBodySumPattern =
    Je.object
        [ ( "name", Je.string typeBodySumPattern.name )
        , ( "description", Je.string typeBodySumPattern.description )
        , ( "parameter", maybeToJsonValue typeIdToJsonValue typeBodySumPattern.parameter )
        ]


{-| TypeBodyKernelのJSONへのエンコーダ
-}
typeBodyKernelToJsonValue : TypeBodyKernel -> Je.Value
typeBodyKernelToJsonValue typeBodyKernel =
    case typeBodyKernel of
        TypeBodyKernelFunction ->
            Je.string "Function"

        TypeBodyKernelInt32 ->
            Je.string "Int32"

        TypeBodyKernelList ->
            Je.string "List"


{-| PartDefinitionのJSONへのエンコーダ
-}
partDefinitionToJsonValue : PartDefinition -> Je.Value
partDefinitionToJsonValue partDefinition =
    Je.object
        [ ( "name", Je.string partDefinition.name )
        , ( "parentList", Je.list partIdToJsonValue partDefinition.parentList )
        , ( "description", Je.string partDefinition.description )
        , ( "type", typeToJsonValue partDefinition.type_ )
        , ( "expr", maybeToJsonValue exprToJsonValue partDefinition.expr )
        , ( "moduleId", moduleIdToJsonValue partDefinition.moduleId )
        ]


{-| TypeのJSONへのエンコーダ
-}
typeToJsonValue : Type -> Je.Value
typeToJsonValue (Type record) =
    Je.object
        [ ( "reference", typeIdToJsonValue record.reference )
        , ( "parameter", Je.list typeToJsonValue record.parameter )
        ]


{-| ExprのJSONへのエンコーダ
-}
exprToJsonValue : Expr -> Je.Value
exprToJsonValue expr =
    case expr of
        ExprKernel parameter ->
            Je.object [ ( "_", Je.string "Kernel" ), ( "kernelExpr", kernelExprToJsonValue parameter ) ]

        ExprInt32Literal parameter ->
            Je.object [ ( "_", Je.string "Int32Literal" ), ( "int32", Je.int parameter ) ]

        ExprPartReference parameter ->
            Je.object [ ( "_", Je.string "PartReference" ), ( "partId", partIdToJsonValue parameter ) ]

        ExprLocalPartReference parameter ->
            Je.object [ ( "_", Je.string "LocalPartReference" ), ( "localPartReference", localPartReferenceToJsonValue parameter ) ]

        ExprTagReference parameter ->
            Je.object [ ( "_", Je.string "TagReference" ), ( "tagReferenceIndex", tagReferenceIndexToJsonValue parameter ) ]

        ExprFunctionCall parameter ->
            Je.object [ ( "_", Je.string "FunctionCall" ), ( "functionCall", functionCallToJsonValue parameter ) ]

        ExprLambda parameter ->
            Je.object [ ( "_", Je.string "Lambda" ), ( "lambdaBranchList", Je.list lambdaBranchToJsonValue parameter ) ]


{-| EvaluatedExprのJSONへのエンコーダ
-}
evaluatedExprToJsonValue : EvaluatedExpr -> Je.Value
evaluatedExprToJsonValue evaluatedExpr =
    case evaluatedExpr of
        EvaluatedExprKernel parameter ->
            Je.object [ ( "_", Je.string "Kernel" ), ( "kernelExpr", kernelExprToJsonValue parameter ) ]

        EvaluatedExprInt32 parameter ->
            Je.object [ ( "_", Je.string "Int32" ), ( "int32", Je.int parameter ) ]

        EvaluatedExprTagReference parameter ->
            Je.object [ ( "_", Je.string "TagReference" ), ( "tagReferenceIndex", tagReferenceIndexToJsonValue parameter ) ]

        EvaluatedExprLambda parameter ->
            Je.object [ ( "_", Je.string "Lambda" ), ( "lambdaBranchList", Je.list lambdaBranchToJsonValue parameter ) ]

        EvaluatedExprKernelCall parameter ->
            Je.object [ ( "_", Je.string "KernelCall" ), ( "kernelCall", kernelCallToJsonValue parameter ) ]


{-| KernelCallのJSONへのエンコーダ
-}
kernelCallToJsonValue : KernelCall -> Je.Value
kernelCallToJsonValue kernelCall =
    Je.object
        [ ( "kernel", kernelExprToJsonValue kernelCall.kernel )
        , ( "expr", evaluatedExprToJsonValue kernelCall.expr )
        ]


{-| KernelExprのJSONへのエンコーダ
-}
kernelExprToJsonValue : KernelExpr -> Je.Value
kernelExprToJsonValue kernelExpr =
    case kernelExpr of
        KernelExprInt32Add ->
            Je.string "Int32Add"

        KernelExprInt32Sub ->
            Je.string "Int32Sub"

        KernelExprInt32Mul ->
            Je.string "Int32Mul"


{-| LocalPartReferenceのJSONへのエンコーダ
-}
localPartReferenceToJsonValue : LocalPartReference -> Je.Value
localPartReferenceToJsonValue localPartReference =
    Je.object
        [ ( "partId", partIdToJsonValue localPartReference.partId )
        , ( "localPartId", localPartIdToJsonValue localPartReference.localPartId )
        ]


{-| TagReferenceIndexのJSONへのエンコーダ
-}
tagReferenceIndexToJsonValue : TagReferenceIndex -> Je.Value
tagReferenceIndexToJsonValue tagReferenceIndex =
    Je.object
        [ ( "typeId", typeIdToJsonValue tagReferenceIndex.typeId )
        , ( "tagIndex", Je.int tagReferenceIndex.tagIndex )
        ]


{-| FunctionCallのJSONへのエンコーダ
-}
functionCallToJsonValue : FunctionCall -> Je.Value
functionCallToJsonValue functionCall =
    Je.object
        [ ( "function", exprToJsonValue functionCall.function )
        , ( "parameter", exprToJsonValue functionCall.parameter )
        ]


{-| LambdaBranchのJSONへのエンコーダ
-}
lambdaBranchToJsonValue : LambdaBranch -> Je.Value
lambdaBranchToJsonValue lambdaBranch =
    Je.object
        [ ( "condition", conditionToJsonValue lambdaBranch.condition )
        , ( "description", Je.string lambdaBranch.description )
        , ( "localPartList", Je.list branchPartDefinitionToJsonValue lambdaBranch.localPartList )
        , ( "expr", maybeToJsonValue exprToJsonValue lambdaBranch.expr )
        ]


{-| ConditionのJSONへのエンコーダ
-}
conditionToJsonValue : Condition -> Je.Value
conditionToJsonValue condition =
    case condition of
        ConditionByTag parameter ->
            Je.object [ ( "_", Je.string "ByTag" ), ( "conditionTag", conditionTagToJsonValue parameter ) ]

        ConditionByCapture parameter ->
            Je.object [ ( "_", Je.string "ByCapture" ), ( "conditionCapture", conditionCaptureToJsonValue parameter ) ]

        ConditionAny ->
            Je.object [ ( "_", Je.string "Any" ) ]

        ConditionInt32 parameter ->
            Je.object [ ( "_", Je.string "Int32" ), ( "int32", Je.int parameter ) ]


{-| ConditionTagのJSONへのエンコーダ
-}
conditionTagToJsonValue : ConditionTag -> Je.Value
conditionTagToJsonValue conditionTag =
    Je.object
        [ ( "tag", tagIdToJsonValue conditionTag.tag )
        , ( "parameter", maybeToJsonValue conditionToJsonValue conditionTag.parameter )
        ]


{-| ConditionCaptureのJSONへのエンコーダ
-}
conditionCaptureToJsonValue : ConditionCapture -> Je.Value
conditionCaptureToJsonValue conditionCapture =
    Je.object
        [ ( "name", Je.string conditionCapture.name )
        , ( "localPartId", localPartIdToJsonValue conditionCapture.localPartId )
        ]


{-| BranchPartDefinitionのJSONへのエンコーダ
-}
branchPartDefinitionToJsonValue : BranchPartDefinition -> Je.Value
branchPartDefinitionToJsonValue branchPartDefinition =
    Je.object
        [ ( "localPartId", localPartIdToJsonValue branchPartDefinition.localPartId )
        , ( "name", Je.string branchPartDefinition.name )
        , ( "description", Je.string branchPartDefinition.description )
        , ( "type", typeToJsonValue branchPartDefinition.type_ )
        , ( "expr", exprToJsonValue branchPartDefinition.expr )
        ]


{-| EvaluateExprErrorのJSONへのエンコーダ
-}
evaluateExprErrorToJsonValue : EvaluateExprError -> Je.Value
evaluateExprErrorToJsonValue evaluateExprError =
    case evaluateExprError of
        EvaluateExprErrorNeedPartDefinition parameter ->
            Je.object [ ( "_", Je.string "NeedPartDefinition" ), ( "partId", partIdToJsonValue parameter ) ]

        EvaluateExprErrorPartExprIsNothing parameter ->
            Je.object [ ( "_", Je.string "PartExprIsNothing" ), ( "partId", partIdToJsonValue parameter ) ]

        EvaluateExprErrorCannotFindLocalPartDefinition parameter ->
            Je.object [ ( "_", Je.string "CannotFindLocalPartDefinition" ), ( "localPartReference", localPartReferenceToJsonValue parameter ) ]

        EvaluateExprErrorTypeError parameter ->
            Je.object [ ( "_", Je.string "TypeError" ), ( "typeError", typeErrorToJsonValue parameter ) ]

        EvaluateExprErrorNotSupported ->
            Je.object [ ( "_", Je.string "NotSupported" ) ]


{-| TypeErrorのJSONへのエンコーダ
-}
typeErrorToJsonValue : TypeError -> Je.Value
typeErrorToJsonValue typeError =
    Je.object
        [ ( "message", Je.string typeError.message )
        ]


{-| CreateProjectParameterのJSONへのエンコーダ
-}
createProjectParameterToJsonValue : CreateProjectParameter -> Je.Value
createProjectParameterToJsonValue createProjectParameter =
    Je.object
        [ ( "accessToken", accessTokenToJsonValue createProjectParameter.accessToken )
        , ( "projectName", Je.string createProjectParameter.projectName )
        ]


{-| AccessTokenErrorのJSONへのエンコーダ
-}
accessTokenErrorToJsonValue : AccessTokenError -> Je.Value
accessTokenErrorToJsonValue accessTokenError =
    case accessTokenError of
        AccessTokenErrorAccessTokenExpiredOrInvalid ->
            Je.string "AccessTokenExpiredOrInvalid"

        AccessTokenErrorProjectNameIsInvalid ->
            Je.string "ProjectNameIsInvalid"


{-| ProjectCacheのJSONへのエンコーダ
-}
projectCacheToJsonValue : ProjectCache -> Je.Value
projectCacheToJsonValue projectCache =
    Je.object
        [ ( "project", projectToJsonValue projectCache.project )
        , ( "respondTime", timeToJsonValue projectCache.respondTime )
        ]


{-| UserCacheのJSONへのエンコーダ
-}
userCacheToJsonValue : UserCache -> Je.Value
userCacheToJsonValue userCache =
    Je.object
        [ ( "user", userToJsonValue userCache.user )
        , ( "respondTime", timeToJsonValue userCache.respondTime )
        ]


{-| ProjectCacheWithIdのJSONへのエンコーダ
-}
projectCacheWithIdToJsonValue : ProjectCacheWithId -> Je.Value
projectCacheWithIdToJsonValue projectCacheWithId =
    Je.object
        [ ( "projectCache", maybeToJsonValue projectCacheToJsonValue projectCacheWithId.projectCache )
        , ( "projectId", projectIdToJsonValue projectCacheWithId.projectId )
        ]


{-| UserCacheWithIdのJSONへのエンコーダ
-}
userCacheWithIdToJsonValue : UserCacheWithId -> Je.Value
userCacheWithIdToJsonValue userCacheWithId =
    Je.object
        [ ( "userCache", maybeToJsonValue userCacheToJsonValue userCacheWithId.userCache )
        , ( "userId", userIdToJsonValue userCacheWithId.userId )
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


typeIdJsonDecoder : Jd.Decoder TypeId
typeIdJsonDecoder =
    Jd.map TypeId Jd.string


moduleIdJsonDecoder : Jd.Decoder ModuleId
moduleIdJsonDecoder =
    Jd.map ModuleId Jd.string


localPartIdJsonDecoder : Jd.Decoder LocalPartId
localPartIdJsonDecoder =
    Jd.map LocalPartId Jd.string


tagIdJsonDecoder : Jd.Decoder TagId
tagIdJsonDecoder =
    Jd.map TagId Jd.string


{-| TimeのJSON Decoder
-}
timeJsonDecoder : Jd.Decoder Time
timeJsonDecoder =
    Jd.succeed
        (\day millisecond ->
            { day = day
            , millisecond = millisecond
            }
        )
        |> Jdp.required "day" Jd.int
        |> Jdp.required "millisecond" Jd.int


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

                    "CreateProject" ->
                        Jd.succeed LocationCreateProject

                    "User" ->
                        Jd.field "userId" userIdJsonDecoder |> Jd.map LocationUser

                    "Project" ->
                        Jd.field "projectId" projectIdJsonDecoder |> Jd.map LocationProject

                    _ ->
                        Jd.fail ("Locationで不明なタグを受けたとった tag=" ++ tag)
            )


{-| UserのJSON Decoder
-}
userJsonDecoder : Jd.Decoder User
userJsonDecoder =
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
        |> Jdp.required "createdAt" timeJsonDecoder
        |> Jdp.required "likedProjectIdList" (Jd.list projectIdJsonDecoder)
        |> Jdp.required "developedProjectIdList" (Jd.list projectIdJsonDecoder)
        |> Jdp.required "commentedIdeaIdList" (Jd.list ideaIdJsonDecoder)


{-| UserAndUserIdのJSON Decoder
-}
userAndUserIdJsonDecoder : Jd.Decoder UserAndUserId
userAndUserIdJsonDecoder =
    Jd.succeed
        (\userId user ->
            { userId = userId
            , user = user
            }
        )
        |> Jdp.required "userId" userIdJsonDecoder
        |> Jdp.required "user" userJsonDecoder


{-| ProjectのJSON Decoder
-}
projectJsonDecoder : Jd.Decoder Project
projectJsonDecoder =
    Jd.succeed
        (\name icon image createdAt createdBy ->
            { name = name
            , icon = icon
            , image = image
            , createdAt = createdAt
            , createdBy = createdBy
            }
        )
        |> Jdp.required "name" Jd.string
        |> Jdp.required "icon" fileHashJsonDecoder
        |> Jdp.required "image" fileHashJsonDecoder
        |> Jdp.required "createdAt" timeJsonDecoder
        |> Jdp.required "createdBy" userIdJsonDecoder


{-| ProjectAndProjectIdのJSON Decoder
-}
projectAndProjectIdJsonDecoder : Jd.Decoder ProjectAndProjectId
projectAndProjectIdJsonDecoder =
    Jd.succeed
        (\projectId project ->
            { projectId = projectId
            , project = project
            }
        )
        |> Jdp.required "projectId" projectIdJsonDecoder
        |> Jdp.required "project" projectJsonDecoder


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
        |> Jdp.required "createdAt" timeJsonDecoder
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
        |> Jdp.required "createdAt" timeJsonDecoder


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
        |> Jdp.required "createdAt" timeJsonDecoder
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


{-| ModuleのJSON Decoder
-}
moduleJsonDecoder : Jd.Decoder Module
moduleJsonDecoder =
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


{-| TypeDefinitionのJSON Decoder
-}
typeDefinitionJsonDecoder : Jd.Decoder TypeDefinition
typeDefinitionJsonDecoder =
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


{-| TypeBodyのJSON Decoder
-}
typeBodyJsonDecoder : Jd.Decoder TypeBody
typeBodyJsonDecoder =
    Jd.field "_" Jd.string
        |> Jd.andThen
            (\tag ->
                case tag of
                    "Product" ->
                        Jd.field "typeBodyProductMemberList" (Jd.list typeBodyProductMemberJsonDecoder) |> Jd.map TypeBodyProduct

                    "Sum" ->
                        Jd.field "typeBodySumPatternList" (Jd.list typeBodySumPatternJsonDecoder) |> Jd.map TypeBodySum

                    "Kernel" ->
                        Jd.field "typeBodyKernel" typeBodyKernelJsonDecoder |> Jd.map TypeBodyKernel

                    _ ->
                        Jd.fail ("TypeBodyで不明なタグを受けたとった tag=" ++ tag)
            )


{-| TypeBodyProductMemberのJSON Decoder
-}
typeBodyProductMemberJsonDecoder : Jd.Decoder TypeBodyProductMember
typeBodyProductMemberJsonDecoder =
    Jd.succeed
        (\name description memberType ->
            { name = name
            , description = description
            , memberType = memberType
            }
        )
        |> Jdp.required "name" Jd.string
        |> Jdp.required "description" Jd.string
        |> Jdp.required "memberType" typeIdJsonDecoder


{-| TypeBodySumPatternのJSON Decoder
-}
typeBodySumPatternJsonDecoder : Jd.Decoder TypeBodySumPattern
typeBodySumPatternJsonDecoder =
    Jd.succeed
        (\name description parameter ->
            { name = name
            , description = description
            , parameter = parameter
            }
        )
        |> Jdp.required "name" Jd.string
        |> Jdp.required "description" Jd.string
        |> Jdp.required "parameter" (maybeJsonDecoder typeIdJsonDecoder)


{-| TypeBodyKernelのJSON Decoder
-}
typeBodyKernelJsonDecoder : Jd.Decoder TypeBodyKernel
typeBodyKernelJsonDecoder =
    Jd.string
        |> Jd.andThen
            (\tag ->
                case tag of
                    "Function" ->
                        Jd.succeed TypeBodyKernelFunction

                    "Int32" ->
                        Jd.succeed TypeBodyKernelInt32

                    "List" ->
                        Jd.succeed TypeBodyKernelList

                    _ ->
                        Jd.fail ("TypeBodyKernelで不明なタグを受けたとった tag=" ++ tag)
            )


{-| PartDefinitionのJSON Decoder
-}
partDefinitionJsonDecoder : Jd.Decoder PartDefinition
partDefinitionJsonDecoder =
    Jd.succeed
        (\name parentList description type_ expr moduleId ->
            { name = name
            , parentList = parentList
            , description = description
            , type_ = type_
            , expr = expr
            , moduleId = moduleId
            }
        )
        |> Jdp.required "name" Jd.string
        |> Jdp.required "parentList" (Jd.list partIdJsonDecoder)
        |> Jdp.required "description" Jd.string
        |> Jdp.required "type" typeJsonDecoder
        |> Jdp.required "expr" (maybeJsonDecoder exprJsonDecoder)
        |> Jdp.required "moduleId" moduleIdJsonDecoder


{-| TypeのJSON Decoder
-}
typeJsonDecoder : Jd.Decoder Type
typeJsonDecoder =
    Jd.succeed
        (\reference parameter ->
            Type
                { reference = reference
                , parameter = parameter
                }
        )
        |> Jdp.required "reference" typeIdJsonDecoder
        |> Jdp.required "parameter" (Jd.list (Jd.lazy (\() -> typeJsonDecoder)))


{-| ExprのJSON Decoder
-}
exprJsonDecoder : Jd.Decoder Expr
exprJsonDecoder =
    Jd.field "_" Jd.string
        |> Jd.andThen
            (\tag ->
                case tag of
                    "Kernel" ->
                        Jd.field "kernelExpr" kernelExprJsonDecoder |> Jd.map ExprKernel

                    "Int32Literal" ->
                        Jd.field "int32" Jd.int |> Jd.map ExprInt32Literal

                    "PartReference" ->
                        Jd.field "partId" partIdJsonDecoder |> Jd.map ExprPartReference

                    "LocalPartReference" ->
                        Jd.field "localPartReference" localPartReferenceJsonDecoder |> Jd.map ExprLocalPartReference

                    "TagReference" ->
                        Jd.field "tagReferenceIndex" tagReferenceIndexJsonDecoder |> Jd.map ExprTagReference

                    "FunctionCall" ->
                        Jd.field "functionCall" functionCallJsonDecoder |> Jd.map ExprFunctionCall

                    "Lambda" ->
                        Jd.field "lambdaBranchList" (Jd.list lambdaBranchJsonDecoder) |> Jd.map ExprLambda

                    _ ->
                        Jd.fail ("Exprで不明なタグを受けたとった tag=" ++ tag)
            )


{-| EvaluatedExprのJSON Decoder
-}
evaluatedExprJsonDecoder : Jd.Decoder EvaluatedExpr
evaluatedExprJsonDecoder =
    Jd.field "_" Jd.string
        |> Jd.andThen
            (\tag ->
                case tag of
                    "Kernel" ->
                        Jd.field "kernelExpr" kernelExprJsonDecoder |> Jd.map EvaluatedExprKernel

                    "Int32" ->
                        Jd.field "int32" Jd.int |> Jd.map EvaluatedExprInt32

                    "TagReference" ->
                        Jd.field "tagReferenceIndex" tagReferenceIndexJsonDecoder |> Jd.map EvaluatedExprTagReference

                    "Lambda" ->
                        Jd.field "lambdaBranchList" (Jd.list lambdaBranchJsonDecoder) |> Jd.map EvaluatedExprLambda

                    "KernelCall" ->
                        Jd.field "kernelCall" kernelCallJsonDecoder |> Jd.map EvaluatedExprKernelCall

                    _ ->
                        Jd.fail ("EvaluatedExprで不明なタグを受けたとった tag=" ++ tag)
            )


{-| KernelCallのJSON Decoder
-}
kernelCallJsonDecoder : Jd.Decoder KernelCall
kernelCallJsonDecoder =
    Jd.succeed
        (\kernel expr ->
            { kernel = kernel
            , expr = expr
            }
        )
        |> Jdp.required "kernel" kernelExprJsonDecoder
        |> Jdp.required "expr" evaluatedExprJsonDecoder


{-| KernelExprのJSON Decoder
-}
kernelExprJsonDecoder : Jd.Decoder KernelExpr
kernelExprJsonDecoder =
    Jd.string
        |> Jd.andThen
            (\tag ->
                case tag of
                    "Int32Add" ->
                        Jd.succeed KernelExprInt32Add

                    "Int32Sub" ->
                        Jd.succeed KernelExprInt32Sub

                    "Int32Mul" ->
                        Jd.succeed KernelExprInt32Mul

                    _ ->
                        Jd.fail ("KernelExprで不明なタグを受けたとった tag=" ++ tag)
            )


{-| LocalPartReferenceのJSON Decoder
-}
localPartReferenceJsonDecoder : Jd.Decoder LocalPartReference
localPartReferenceJsonDecoder =
    Jd.succeed
        (\partId localPartId ->
            { partId = partId
            , localPartId = localPartId
            }
        )
        |> Jdp.required "partId" partIdJsonDecoder
        |> Jdp.required "localPartId" localPartIdJsonDecoder


{-| TagReferenceIndexのJSON Decoder
-}
tagReferenceIndexJsonDecoder : Jd.Decoder TagReferenceIndex
tagReferenceIndexJsonDecoder =
    Jd.succeed
        (\typeId tagIndex ->
            { typeId = typeId
            , tagIndex = tagIndex
            }
        )
        |> Jdp.required "typeId" typeIdJsonDecoder
        |> Jdp.required "tagIndex" Jd.int


{-| FunctionCallのJSON Decoder
-}
functionCallJsonDecoder : Jd.Decoder FunctionCall
functionCallJsonDecoder =
    Jd.succeed
        (\function parameter ->
            { function = function
            , parameter = parameter
            }
        )
        |> Jdp.required "function" exprJsonDecoder
        |> Jdp.required "parameter" exprJsonDecoder


{-| LambdaBranchのJSON Decoder
-}
lambdaBranchJsonDecoder : Jd.Decoder LambdaBranch
lambdaBranchJsonDecoder =
    Jd.succeed
        (\condition description localPartList expr ->
            { condition = condition
            , description = description
            , localPartList = localPartList
            , expr = expr
            }
        )
        |> Jdp.required "condition" conditionJsonDecoder
        |> Jdp.required "description" Jd.string
        |> Jdp.required "localPartList" (Jd.list branchPartDefinitionJsonDecoder)
        |> Jdp.required "expr" (maybeJsonDecoder exprJsonDecoder)


{-| ConditionのJSON Decoder
-}
conditionJsonDecoder : Jd.Decoder Condition
conditionJsonDecoder =
    Jd.field "_" Jd.string
        |> Jd.andThen
            (\tag ->
                case tag of
                    "ByTag" ->
                        Jd.field "conditionTag" conditionTagJsonDecoder |> Jd.map ConditionByTag

                    "ByCapture" ->
                        Jd.field "conditionCapture" conditionCaptureJsonDecoder |> Jd.map ConditionByCapture

                    "Any" ->
                        Jd.succeed ConditionAny

                    "Int32" ->
                        Jd.field "int32" Jd.int |> Jd.map ConditionInt32

                    _ ->
                        Jd.fail ("Conditionで不明なタグを受けたとった tag=" ++ tag)
            )


{-| ConditionTagのJSON Decoder
-}
conditionTagJsonDecoder : Jd.Decoder ConditionTag
conditionTagJsonDecoder =
    Jd.succeed
        (\tag parameter ->
            { tag = tag
            , parameter = parameter
            }
        )
        |> Jdp.required "tag" tagIdJsonDecoder
        |> Jdp.required "parameter" (maybeJsonDecoder conditionJsonDecoder)


{-| ConditionCaptureのJSON Decoder
-}
conditionCaptureJsonDecoder : Jd.Decoder ConditionCapture
conditionCaptureJsonDecoder =
    Jd.succeed
        (\name localPartId ->
            { name = name
            , localPartId = localPartId
            }
        )
        |> Jdp.required "name" Jd.string
        |> Jdp.required "localPartId" localPartIdJsonDecoder


{-| BranchPartDefinitionのJSON Decoder
-}
branchPartDefinitionJsonDecoder : Jd.Decoder BranchPartDefinition
branchPartDefinitionJsonDecoder =
    Jd.succeed
        (\localPartId name description type_ expr ->
            { localPartId = localPartId
            , name = name
            , description = description
            , type_ = type_
            , expr = expr
            }
        )
        |> Jdp.required "localPartId" localPartIdJsonDecoder
        |> Jdp.required "name" Jd.string
        |> Jdp.required "description" Jd.string
        |> Jdp.required "type" typeJsonDecoder
        |> Jdp.required "expr" exprJsonDecoder


{-| EvaluateExprErrorのJSON Decoder
-}
evaluateExprErrorJsonDecoder : Jd.Decoder EvaluateExprError
evaluateExprErrorJsonDecoder =
    Jd.field "_" Jd.string
        |> Jd.andThen
            (\tag ->
                case tag of
                    "NeedPartDefinition" ->
                        Jd.field "partId" partIdJsonDecoder |> Jd.map EvaluateExprErrorNeedPartDefinition

                    "PartExprIsNothing" ->
                        Jd.field "partId" partIdJsonDecoder |> Jd.map EvaluateExprErrorPartExprIsNothing

                    "CannotFindLocalPartDefinition" ->
                        Jd.field "localPartReference" localPartReferenceJsonDecoder |> Jd.map EvaluateExprErrorCannotFindLocalPartDefinition

                    "TypeError" ->
                        Jd.field "typeError" typeErrorJsonDecoder |> Jd.map EvaluateExprErrorTypeError

                    "NotSupported" ->
                        Jd.succeed EvaluateExprErrorNotSupported

                    _ ->
                        Jd.fail ("EvaluateExprErrorで不明なタグを受けたとった tag=" ++ tag)
            )


{-| TypeErrorのJSON Decoder
-}
typeErrorJsonDecoder : Jd.Decoder TypeError
typeErrorJsonDecoder =
    Jd.succeed
        (\message ->
            { message = message
            }
        )
        |> Jdp.required "message" Jd.string


{-| CreateProjectParameterのJSON Decoder
-}
createProjectParameterJsonDecoder : Jd.Decoder CreateProjectParameter
createProjectParameterJsonDecoder =
    Jd.succeed
        (\accessToken projectName ->
            { accessToken = accessToken
            , projectName = projectName
            }
        )
        |> Jdp.required "accessToken" accessTokenJsonDecoder
        |> Jdp.required "projectName" Jd.string


{-| AccessTokenErrorのJSON Decoder
-}
accessTokenErrorJsonDecoder : Jd.Decoder AccessTokenError
accessTokenErrorJsonDecoder =
    Jd.string
        |> Jd.andThen
            (\tag ->
                case tag of
                    "AccessTokenExpiredOrInvalid" ->
                        Jd.succeed AccessTokenErrorAccessTokenExpiredOrInvalid

                    "ProjectNameIsInvalid" ->
                        Jd.succeed AccessTokenErrorProjectNameIsInvalid

                    _ ->
                        Jd.fail ("AccessTokenErrorで不明なタグを受けたとった tag=" ++ tag)
            )


{-| ProjectCacheのJSON Decoder
-}
projectCacheJsonDecoder : Jd.Decoder ProjectCache
projectCacheJsonDecoder =
    Jd.succeed
        (\project respondTime ->
            { project = project
            , respondTime = respondTime
            }
        )
        |> Jdp.required "project" projectJsonDecoder
        |> Jdp.required "respondTime" timeJsonDecoder


{-| UserCacheのJSON Decoder
-}
userCacheJsonDecoder : Jd.Decoder UserCache
userCacheJsonDecoder =
    Jd.succeed
        (\user respondTime ->
            { user = user
            , respondTime = respondTime
            }
        )
        |> Jdp.required "user" userJsonDecoder
        |> Jdp.required "respondTime" timeJsonDecoder


{-| ProjectCacheWithIdのJSON Decoder
-}
projectCacheWithIdJsonDecoder : Jd.Decoder ProjectCacheWithId
projectCacheWithIdJsonDecoder =
    Jd.succeed
        (\projectCache projectId ->
            { projectCache = projectCache
            , projectId = projectId
            }
        )
        |> Jdp.required "projectCache" (maybeJsonDecoder projectCacheJsonDecoder)
        |> Jdp.required "projectId" projectIdJsonDecoder


{-| UserCacheWithIdのJSON Decoder
-}
userCacheWithIdJsonDecoder : Jd.Decoder UserCacheWithId
userCacheWithIdJsonDecoder =
    Jd.succeed
        (\userCache userId ->
            { userCache = userCache
            , userId = userId
            }
        )
        |> Jdp.required "userCache" (maybeJsonDecoder userCacheJsonDecoder)
        |> Jdp.required "userId" userIdJsonDecoder
