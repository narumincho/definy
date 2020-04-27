module Data exposing (AccessToken(..), AccessTokenAndSuggestionId, AddCommentParameter, AddPart, AddSuggestionParameter, BranchPartDefinition, Change(..), ClientMode(..), Condition(..), ConditionCapture, ConditionTag, CreateIdeaParameter, CreateProjectParameter, EvaluateExprError(..), EvaluatedExpr(..), Expr(..), FunctionCall, IdeaId(..), IdeaItem, IdeaListByProjectIdResponse, IdeaResponse, IdeaSnapshot, IdeaSnapshotAndId, ImageToken(..), ItemBody(..), KernelCall, KernelExpr(..), LambdaBranch, Language(..), LocalPartId(..), LocalPartReference, Location(..), OpenIdConnectProvider(..), PartId(..), PartSnapshot, ProjectId(..), ProjectResponse, ProjectSnapshot, ProjectSnapshotAndId, RequestLogInUrlRequestData, SuggestionBranchPartDefinition, SuggestionExpr(..), SuggestionFunctionCall, SuggestionId(..), SuggestionLambdaBranch, SuggestionResponse, SuggestionSnapshot, SuggestionSnapshotAndId, SuggestionState(..), SuggestionTagReference, SuggestionType(..), SuggestionTypeInputAndOutput, SuggestionTypePartWithSuggestionTypeParameter, TagId(..), TagReference, Time, Type(..), TypeError, TypeInputAndOutput, TypePartBody(..), TypePartBodyKernel(..), TypePartBodyProductMember, TypePartBodySumPattern, TypePartId(..), TypePartIdWithParameter, TypePartSnapshot, TypePartWithSuggestionTypeParameter, UpdateSuggestionParameter, UrlData, UserId(..), UserResponse, UserSnapshot, UserSnapshotAndId, accessTokenAndSuggestionIdJsonDecoder, accessTokenAndSuggestionIdToJsonValue, accessTokenJsonDecoder, accessTokenToJsonValue, addCommentParameterJsonDecoder, addCommentParameterToJsonValue, addPartJsonDecoder, addPartToJsonValue, addSuggestionParameterJsonDecoder, addSuggestionParameterToJsonValue, branchPartDefinitionJsonDecoder, branchPartDefinitionToJsonValue, changeJsonDecoder, changeToJsonValue, clientModeJsonDecoder, clientModeToJsonValue, conditionCaptureJsonDecoder, conditionCaptureToJsonValue, conditionJsonDecoder, conditionTagJsonDecoder, conditionTagToJsonValue, conditionToJsonValue, createIdeaParameterJsonDecoder, createIdeaParameterToJsonValue, createProjectParameterJsonDecoder, createProjectParameterToJsonValue, evaluateExprErrorJsonDecoder, evaluateExprErrorToJsonValue, evaluatedExprJsonDecoder, evaluatedExprToJsonValue, exprJsonDecoder, exprToJsonValue, functionCallJsonDecoder, functionCallToJsonValue, ideaIdJsonDecoder, ideaIdToJsonValue, ideaItemJsonDecoder, ideaItemToJsonValue, ideaListByProjectIdResponseJsonDecoder, ideaListByProjectIdResponseToJsonValue, ideaResponseJsonDecoder, ideaResponseToJsonValue, ideaSnapshotAndIdJsonDecoder, ideaSnapshotAndIdToJsonValue, ideaSnapshotJsonDecoder, ideaSnapshotToJsonValue, imageTokenJsonDecoder, imageTokenToJsonValue, itemBodyJsonDecoder, itemBodyToJsonValue, kernelCallJsonDecoder, kernelCallToJsonValue, kernelExprJsonDecoder, kernelExprToJsonValue, lambdaBranchJsonDecoder, lambdaBranchToJsonValue, languageJsonDecoder, languageToJsonValue, localPartIdJsonDecoder, localPartIdToJsonValue, localPartReferenceJsonDecoder, localPartReferenceToJsonValue, locationJsonDecoder, locationToJsonValue, maybeJsonDecoder, maybeToJsonValue, openIdConnectProviderJsonDecoder, openIdConnectProviderToJsonValue, partIdJsonDecoder, partIdToJsonValue, partSnapshotJsonDecoder, partSnapshotToJsonValue, projectIdJsonDecoder, projectIdToJsonValue, projectResponseJsonDecoder, projectResponseToJsonValue, projectSnapshotAndIdJsonDecoder, projectSnapshotAndIdToJsonValue, projectSnapshotJsonDecoder, projectSnapshotToJsonValue, requestLogInUrlRequestDataJsonDecoder, requestLogInUrlRequestDataToJsonValue, resultJsonDecoder, resultToJsonValue, suggestionBranchPartDefinitionJsonDecoder, suggestionBranchPartDefinitionToJsonValue, suggestionExprJsonDecoder, suggestionExprToJsonValue, suggestionFunctionCallJsonDecoder, suggestionFunctionCallToJsonValue, suggestionIdJsonDecoder, suggestionIdToJsonValue, suggestionLambdaBranchJsonDecoder, suggestionLambdaBranchToJsonValue, suggestionResponseJsonDecoder, suggestionResponseToJsonValue, suggestionSnapshotAndIdJsonDecoder, suggestionSnapshotAndIdToJsonValue, suggestionSnapshotJsonDecoder, suggestionSnapshotToJsonValue, suggestionStateJsonDecoder, suggestionStateToJsonValue, suggestionTagReferenceJsonDecoder, suggestionTagReferenceToJsonValue, suggestionTypeInputAndOutputJsonDecoder, suggestionTypeInputAndOutputToJsonValue, suggestionTypeJsonDecoder, suggestionTypePartWithSuggestionTypeParameterJsonDecoder, suggestionTypePartWithSuggestionTypeParameterToJsonValue, suggestionTypeToJsonValue, tagIdJsonDecoder, tagIdToJsonValue, tagReferenceJsonDecoder, tagReferenceToJsonValue, timeJsonDecoder, timeToJsonValue, typeErrorJsonDecoder, typeErrorToJsonValue, typeInputAndOutputJsonDecoder, typeInputAndOutputToJsonValue, typeJsonDecoder, typePartBodyJsonDecoder, typePartBodyKernelJsonDecoder, typePartBodyKernelToJsonValue, typePartBodyProductMemberJsonDecoder, typePartBodyProductMemberToJsonValue, typePartBodySumPatternJsonDecoder, typePartBodySumPatternToJsonValue, typePartBodyToJsonValue, typePartIdJsonDecoder, typePartIdToJsonValue, typePartIdWithParameterJsonDecoder, typePartIdWithParameterToJsonValue, typePartSnapshotJsonDecoder, typePartSnapshotToJsonValue, typePartWithSuggestionTypeParameterJsonDecoder, typePartWithSuggestionTypeParameterToJsonValue, typeToJsonValue, updateSuggestionParameterJsonDecoder, updateSuggestionParameterToJsonValue, urlDataJsonDecoder, urlDataToJsonValue, userIdJsonDecoder, userIdToJsonValue, userResponseJsonDecoder, userResponseToJsonValue, userSnapshotAndIdJsonDecoder, userSnapshotAndIdToJsonValue, userSnapshotJsonDecoder, userSnapshotToJsonValue)

import Json.Decode as Jd
import Json.Decode.Pipeline as Jdp
import Json.Encode as Je


{-| 日時. 0001-01-01T00:00:00.000Z to 9999-12-31T23:59:59.999Z 最小単位はミリ秒. ミリ秒の求め方は day_1000_60_60_24 + millisecond
-}
type alias Time =
    { day : Int, millisecond : Int }


{-| ログインのURLを発行するために必要なデータ
-}
type alias RequestLogInUrlRequestData =
    { openIdConnectProvider : OpenIdConnectProvider, urlData : UrlData }


{-| ソーシャルログインを提供するプロバイダー (例: Google, GitHub)
-}
type OpenIdConnectProvider
    = OpenIdConnectProviderGoogle
    | OpenIdConnectProviderGitHub


{-| デバッグモードかどうか,言語とページの場所. URLとして表現されるデータ. Googleなどの検索エンジンの都合( <https://support.google.com/webmasters/answer/182192?hl=ja> )で,URLにページの言語を入れて,言語ごとに別のURLである必要がある. デバッグ時のホスト名は <http://localhost> になる
-}
type alias UrlData =
    { clientMode : ClientMode, location : Location, language : Language }


{-| デバッグモードか, リリースモード
-}
type ClientMode
    = ClientModeDebugMode
    | ClientModeRelease


{-| DefinyWebアプリ内での場所を示すもの. URLから求められる. URLに変換できる
-}
type Location
    = LocationHome
    | LocationCreateProject
    | LocationCreateIdea ProjectId
    | LocationUser UserId
    | LocationProject ProjectId
    | LocationIdea IdeaId
    | LocationSuggestion SuggestionId


{-| 英語,日本語,エスペラント語などの言語
-}
type Language
    = LanguageJapanese
    | LanguageEnglish
    | LanguageEsperanto


{-| ユーザーのデータのスナップショット
-}
type alias UserSnapshot =
    { name : String, imageHash : ImageToken, introduction : String, createTime : Time, likeProjectIdList : List ProjectId, developProjectIdList : List ProjectId, commentIdeaIdList : List IdeaId, getTime : Time }


{-| 最初に自分の情報を得るときに返ってくるデータ
-}
type alias UserSnapshotAndId =
    { id : UserId, snapshot : UserSnapshot }


{-| Maybe プロジェクトのスナップショット と userId. TypeScript→Elmに渡す用
-}
type alias UserResponse =
    { id : UserId, snapshotMaybe : Maybe UserSnapshot }


{-| プロジェクト
-}
type alias ProjectSnapshot =
    { name : String, iconHash : ImageToken, imageHash : ImageToken, createTime : Time, createUser : UserId, updateTime : Time, getTime : Time, partIdList : List PartId, typePartIdList : List TypePartId }


{-| プロジェクトを作成したときに返ってくるデータ
-}
type alias ProjectSnapshotAndId =
    { id : ProjectId, snapshot : ProjectSnapshot }


{-| Maybe プロジェクトのスナップショット と projectId. TypeScript→Elmに渡す用
-}
type alias ProjectResponse =
    { id : ProjectId, snapshotMaybe : Maybe ProjectSnapshot }


{-| アイデア
-}
type alias IdeaSnapshot =
    { name : String, createUser : UserId, createTime : Time, projectId : ProjectId, itemList : List IdeaItem, updateTime : Time, getTime : Time }


{-| アイデアとそのID. アイデア作成時に返ってくる
-}
type alias IdeaSnapshotAndId =
    { id : IdeaId, snapshot : IdeaSnapshot }


{-| Maybe アイデア と ideaId. TypeScript→Elmに渡す用
-}
type alias IdeaResponse =
    { id : IdeaId, snapshotMaybe : Maybe IdeaSnapshot }


{-| プロジェクトからアイデアの一覧を取得したときにElmに渡すもの
-}
type alias IdeaListByProjectIdResponse =
    { projectId : ProjectId, ideaSnapshotAndIdList : List IdeaSnapshotAndId }


{-| アイデアのコメント
-}
type alias IdeaItem =
    { createUserId : UserId, createTime : Time, body : ItemBody }


{-| アイデアのアイテム
-}
type ItemBody
    = ItemBodyComment String
    | ItemBodySuggestionCreate SuggestionId
    | ItemBodySuggestionToApprovalPending SuggestionId
    | ItemBodySuggestionCancelToApprovalPending SuggestionId
    | ItemBodySuggestionApprove SuggestionId
    | ItemBodySuggestionReject SuggestionId
    | ItemBodySuggestionCancelRejection SuggestionId


{-| 提案
-}
type alias SuggestionSnapshot =
    { name : String, createUserId : UserId, reason : String, state : SuggestionState, changeList : List Change, projectId : ProjectId, ideaId : IdeaId, updateTime : Time, getTime : Time }


{-| Id付きのSuggestion
-}
type alias SuggestionSnapshotAndId =
    { id : SuggestionId, snapshot : SuggestionSnapshot }


{-| Maybe SuggestionSnapshotとSuggestionId TypeScript→Elmに渡す用
-}
type alias SuggestionResponse =
    { id : SuggestionId, snapshotMaybe : Maybe SuggestionSnapshot }


{-| 提案の状況
-}
type SuggestionState
    = SuggestionStateCreating
    | SuggestionStateApprovalPending
    | SuggestionStateApproved
    | SuggestionStateRejected


{-| 変更点
-}
type Change
    = ChangeProjectName String
    | ChangeAddPart AddPart


{-| パーツを追加するのに必要なもの
-}
type alias AddPart =
    { name : String, description : String, type_ : SuggestionType, expr : SuggestionExpr }


{-| ChangeのAddPartなどで使われる提案で作成した型を使えるType
-}
type SuggestionType
    = SuggestionTypeFunction SuggestionTypeInputAndOutput
    | SuggestionTypeTypePartWithParameter TypePartWithSuggestionTypeParameter
    | SuggestionTypeSuggestionTypePartWithParameter SuggestionTypePartWithSuggestionTypeParameter


type alias SuggestionTypeInputAndOutput =
    { inputType : SuggestionType, outputType : SuggestionType }


type alias TypePartWithSuggestionTypeParameter =
    { typePartId : TypePartId, parameter : List SuggestionType }


type alias SuggestionTypePartWithSuggestionTypeParameter =
    { suggestionTypePartIndex : Int, parameter : List SuggestionType }


{-| 提案時に含まれるパーツを参照できる式
-}
type SuggestionExpr
    = SuggestionExprKernel KernelExpr
    | SuggestionExprInt32Literal Int
    | SuggestionExprPartReference PartId
    | SuggestionExprSuggestionPartReference Int
    | SuggestionExprLocalPartReference LocalPartReference
    | SuggestionExprTagReference TagReference
    | SuggestionExprSuggestionTagReference SuggestionTagReference
    | SuggestionExprFunctionCall SuggestionFunctionCall
    | SuggestionExprLambda SuggestionLambdaBranch


{-| 提案内で定義された型のタグ
-}
type alias SuggestionTagReference =
    { suggestionTypePartIndex : Int, tagIndex : Int }


{-| 関数呼び出し (中に含まれる型はSuggestionExpr)
-}
type alias SuggestionFunctionCall =
    { function : SuggestionExpr, parameter : SuggestionExpr }


{-| suggestionExprの入ったLambdaBranch
-}
type alias SuggestionLambdaBranch =
    { condition : Condition, description : String, localPartList : List SuggestionBranchPartDefinition, expr : Maybe SuggestionExpr }


{-| ラムダのブランチで使えるパーツを定義する部分 (SuggestionExpr バージョン)
-}
type alias SuggestionBranchPartDefinition =
    { localPartId : LocalPartId, name : String, description : String, type_ : SuggestionType, expr : SuggestionExpr }


{-| 型パーツ
-}
type alias TypePartSnapshot =
    { name : String, parentList : List PartId, description : String, projectId : ProjectId, createSuggestionId : SuggestionId, getTime : Time, body : TypePartBody }


{-| パーツの定義
-}
type alias PartSnapshot =
    { name : String, parentList : List PartId, description : String, type_ : Type, expr : Maybe Expr, projectId : ProjectId, createSuggestionId : SuggestionId, getTime : Time }


{-| 型の定義本体
-}
type TypePartBody
    = TypePartBodyProduct (List TypePartBodyProductMember)
    | TypePartBodySum (List TypePartBodySumPattern)
    | TypePartBodyKernel TypePartBodyKernel


{-| 直積型のメンバー
-}
type alias TypePartBodyProductMember =
    { name : String, description : String, memberType : Type }


{-| 直積型のパターン
-}
type alias TypePartBodySumPattern =
    { name : String, description : String, parameter : Type }


{-| Definyだけでは表現できないデータ型
-}
type TypePartBodyKernel
    = TypePartBodyKernelInt32
    | TypePartBodyKernelList


{-| 型
-}
type Type
    = TypeFunction TypeInputAndOutput
    | TypeTypePartWithParameter TypePartIdWithParameter


type alias TypeInputAndOutput =
    { inputType : Type, outputType : Type }


type alias TypePartIdWithParameter =
    { typePartId : TypePartId, parameter : List Type }


{-| 式
-}
type Expr
    = ExprKernel KernelExpr
    | ExprInt32Literal Int
    | ExprPartReference PartId
    | ExprLocalPartReference LocalPartReference
    | ExprTagReference TagReference
    | ExprFunctionCall FunctionCall
    | ExprLambda (List LambdaBranch)


{-| 評価しきった式
-}
type EvaluatedExpr
    = EvaluatedExprKernel KernelExpr
    | EvaluatedExprInt32 Int
    | EvaluatedExprLocalPartReference LocalPartReference
    | EvaluatedExprTagReference TagReference
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
type alias TagReference =
    { typePartId : TypePartId, tagId : TagId }


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


{-| アイデアを作成時に必要なパラメーター
-}
type alias CreateIdeaParameter =
    { accessToken : AccessToken, ideaName : String, projectId : ProjectId }


{-| アイデアにコメントを追加するときに必要なパラメーター
-}
type alias AddCommentParameter =
    { accessToken : AccessToken, ideaId : IdeaId, comment : String }


{-| 提案を作成するときに必要なパラメーター
-}
type alias AddSuggestionParameter =
    { accessToken : AccessToken, ideaId : IdeaId }


{-| 提案を更新するときに必要なパラメーター
-}
type alias UpdateSuggestionParameter =
    { accessToken : AccessToken, suggestionId : SuggestionId, name : String, reason : String, changeList : List Change }


{-| 提案を承認待ちにしたり許可したりするときなどに使う
-}
type alias AccessTokenAndSuggestionId =
    { accessToken : AccessToken, suggestionId : SuggestionId }


type ProjectId
    = ProjectId String


type UserId
    = UserId String


type IdeaId
    = IdeaId String


type SuggestionId
    = SuggestionId String


type ImageToken
    = ImageToken String


type PartId
    = PartId String


type TypePartId
    = TypePartId String


type LocalPartId
    = LocalPartId String


type TagId
    = TagId String


type AccessToken
    = AccessToken String


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


projectIdToJsonValue : ProjectId -> Je.Value
projectIdToJsonValue (ProjectId string) =
    Je.string string


userIdToJsonValue : UserId -> Je.Value
userIdToJsonValue (UserId string) =
    Je.string string


ideaIdToJsonValue : IdeaId -> Je.Value
ideaIdToJsonValue (IdeaId string) =
    Je.string string


suggestionIdToJsonValue : SuggestionId -> Je.Value
suggestionIdToJsonValue (SuggestionId string) =
    Je.string string


imageTokenToJsonValue : ImageToken -> Je.Value
imageTokenToJsonValue (ImageToken string) =
    Je.string string


partIdToJsonValue : PartId -> Je.Value
partIdToJsonValue (PartId string) =
    Je.string string


typePartIdToJsonValue : TypePartId -> Je.Value
typePartIdToJsonValue (TypePartId string) =
    Je.string string


localPartIdToJsonValue : LocalPartId -> Je.Value
localPartIdToJsonValue (LocalPartId string) =
    Je.string string


tagIdToJsonValue : TagId -> Je.Value
tagIdToJsonValue (TagId string) =
    Je.string string


accessTokenToJsonValue : AccessToken -> Je.Value
accessTokenToJsonValue (AccessToken string) =
    Je.string string


{-| TimeのJSONへのエンコーダ
-}
timeToJsonValue : Time -> Je.Value
timeToJsonValue time =
    Je.object
        [ ( "day", Je.int time.day )
        , ( "millisecond", Je.int time.millisecond )
        ]


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
        ]


{-| ClientModeのJSONへのエンコーダ
-}
clientModeToJsonValue : ClientMode -> Je.Value
clientModeToJsonValue clientMode =
    case clientMode of
        ClientModeDebugMode ->
            Je.string "DebugMode"

        ClientModeRelease ->
            Je.string "Release"


{-| LocationのJSONへのエンコーダ
-}
locationToJsonValue : Location -> Je.Value
locationToJsonValue location =
    case location of
        LocationHome ->
            Je.object [ ( "_", Je.string "Home" ) ]

        LocationCreateProject ->
            Je.object [ ( "_", Je.string "CreateProject" ) ]

        LocationCreateIdea parameter ->
            Je.object [ ( "_", Je.string "CreateIdea" ), ( "projectId", projectIdToJsonValue parameter ) ]

        LocationUser parameter ->
            Je.object [ ( "_", Je.string "User" ), ( "userId", userIdToJsonValue parameter ) ]

        LocationProject parameter ->
            Je.object [ ( "_", Je.string "Project" ), ( "projectId", projectIdToJsonValue parameter ) ]

        LocationIdea parameter ->
            Je.object [ ( "_", Je.string "Idea" ), ( "ideaId", ideaIdToJsonValue parameter ) ]

        LocationSuggestion parameter ->
            Je.object [ ( "_", Je.string "Suggestion" ), ( "suggestionId", suggestionIdToJsonValue parameter ) ]


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


{-| UserSnapshotのJSONへのエンコーダ
-}
userSnapshotToJsonValue : UserSnapshot -> Je.Value
userSnapshotToJsonValue userSnapshot =
    Je.object
        [ ( "name", Je.string userSnapshot.name )
        , ( "imageHash", imageTokenToJsonValue userSnapshot.imageHash )
        , ( "introduction", Je.string userSnapshot.introduction )
        , ( "createTime", timeToJsonValue userSnapshot.createTime )
        , ( "likeProjectIdList", Je.list projectIdToJsonValue userSnapshot.likeProjectIdList )
        , ( "developProjectIdList", Je.list projectIdToJsonValue userSnapshot.developProjectIdList )
        , ( "commentIdeaIdList", Je.list ideaIdToJsonValue userSnapshot.commentIdeaIdList )
        , ( "getTime", timeToJsonValue userSnapshot.getTime )
        ]


{-| UserSnapshotAndIdのJSONへのエンコーダ
-}
userSnapshotAndIdToJsonValue : UserSnapshotAndId -> Je.Value
userSnapshotAndIdToJsonValue userSnapshotAndId =
    Je.object
        [ ( "id", userIdToJsonValue userSnapshotAndId.id )
        , ( "snapshot", userSnapshotToJsonValue userSnapshotAndId.snapshot )
        ]


{-| UserResponseのJSONへのエンコーダ
-}
userResponseToJsonValue : UserResponse -> Je.Value
userResponseToJsonValue userResponse =
    Je.object
        [ ( "id", userIdToJsonValue userResponse.id )
        , ( "snapshotMaybe", maybeToJsonValue userSnapshotToJsonValue userResponse.snapshotMaybe )
        ]


{-| ProjectSnapshotのJSONへのエンコーダ
-}
projectSnapshotToJsonValue : ProjectSnapshot -> Je.Value
projectSnapshotToJsonValue projectSnapshot =
    Je.object
        [ ( "name", Je.string projectSnapshot.name )
        , ( "iconHash", imageTokenToJsonValue projectSnapshot.iconHash )
        , ( "imageHash", imageTokenToJsonValue projectSnapshot.imageHash )
        , ( "createTime", timeToJsonValue projectSnapshot.createTime )
        , ( "createUser", userIdToJsonValue projectSnapshot.createUser )
        , ( "updateTime", timeToJsonValue projectSnapshot.updateTime )
        , ( "getTime", timeToJsonValue projectSnapshot.getTime )
        , ( "partIdList", Je.list partIdToJsonValue projectSnapshot.partIdList )
        , ( "typePartIdList", Je.list typePartIdToJsonValue projectSnapshot.typePartIdList )
        ]


{-| ProjectSnapshotAndIdのJSONへのエンコーダ
-}
projectSnapshotAndIdToJsonValue : ProjectSnapshotAndId -> Je.Value
projectSnapshotAndIdToJsonValue projectSnapshotAndId =
    Je.object
        [ ( "id", projectIdToJsonValue projectSnapshotAndId.id )
        , ( "snapshot", projectSnapshotToJsonValue projectSnapshotAndId.snapshot )
        ]


{-| ProjectResponseのJSONへのエンコーダ
-}
projectResponseToJsonValue : ProjectResponse -> Je.Value
projectResponseToJsonValue projectResponse =
    Je.object
        [ ( "id", projectIdToJsonValue projectResponse.id )
        , ( "snapshotMaybe", maybeToJsonValue projectSnapshotToJsonValue projectResponse.snapshotMaybe )
        ]


{-| IdeaSnapshotのJSONへのエンコーダ
-}
ideaSnapshotToJsonValue : IdeaSnapshot -> Je.Value
ideaSnapshotToJsonValue ideaSnapshot =
    Je.object
        [ ( "name", Je.string ideaSnapshot.name )
        , ( "createUser", userIdToJsonValue ideaSnapshot.createUser )
        , ( "createTime", timeToJsonValue ideaSnapshot.createTime )
        , ( "projectId", projectIdToJsonValue ideaSnapshot.projectId )
        , ( "itemList", Je.list ideaItemToJsonValue ideaSnapshot.itemList )
        , ( "updateTime", timeToJsonValue ideaSnapshot.updateTime )
        , ( "getTime", timeToJsonValue ideaSnapshot.getTime )
        ]


{-| IdeaSnapshotAndIdのJSONへのエンコーダ
-}
ideaSnapshotAndIdToJsonValue : IdeaSnapshotAndId -> Je.Value
ideaSnapshotAndIdToJsonValue ideaSnapshotAndId =
    Je.object
        [ ( "id", ideaIdToJsonValue ideaSnapshotAndId.id )
        , ( "snapshot", ideaSnapshotToJsonValue ideaSnapshotAndId.snapshot )
        ]


{-| IdeaResponseのJSONへのエンコーダ
-}
ideaResponseToJsonValue : IdeaResponse -> Je.Value
ideaResponseToJsonValue ideaResponse =
    Je.object
        [ ( "id", ideaIdToJsonValue ideaResponse.id )
        , ( "snapshotMaybe", maybeToJsonValue ideaSnapshotToJsonValue ideaResponse.snapshotMaybe )
        ]


{-| IdeaListByProjectIdResponseのJSONへのエンコーダ
-}
ideaListByProjectIdResponseToJsonValue : IdeaListByProjectIdResponse -> Je.Value
ideaListByProjectIdResponseToJsonValue ideaListByProjectIdResponse =
    Je.object
        [ ( "projectId", projectIdToJsonValue ideaListByProjectIdResponse.projectId )
        , ( "ideaSnapshotAndIdList", Je.list ideaSnapshotAndIdToJsonValue ideaListByProjectIdResponse.ideaSnapshotAndIdList )
        ]


{-| IdeaItemのJSONへのエンコーダ
-}
ideaItemToJsonValue : IdeaItem -> Je.Value
ideaItemToJsonValue ideaItem =
    Je.object
        [ ( "createUserId", userIdToJsonValue ideaItem.createUserId )
        , ( "createTime", timeToJsonValue ideaItem.createTime )
        , ( "body", itemBodyToJsonValue ideaItem.body )
        ]


{-| ItemBodyのJSONへのエンコーダ
-}
itemBodyToJsonValue : ItemBody -> Je.Value
itemBodyToJsonValue itemBody =
    case itemBody of
        ItemBodyComment parameter ->
            Je.object [ ( "_", Je.string "Comment" ), ( "string_", Je.string parameter ) ]

        ItemBodySuggestionCreate parameter ->
            Je.object [ ( "_", Je.string "SuggestionCreate" ), ( "suggestionId", suggestionIdToJsonValue parameter ) ]

        ItemBodySuggestionToApprovalPending parameter ->
            Je.object [ ( "_", Je.string "SuggestionToApprovalPending" ), ( "suggestionId", suggestionIdToJsonValue parameter ) ]

        ItemBodySuggestionCancelToApprovalPending parameter ->
            Je.object [ ( "_", Je.string "SuggestionCancelToApprovalPending" ), ( "suggestionId", suggestionIdToJsonValue parameter ) ]

        ItemBodySuggestionApprove parameter ->
            Je.object [ ( "_", Je.string "SuggestionApprove" ), ( "suggestionId", suggestionIdToJsonValue parameter ) ]

        ItemBodySuggestionReject parameter ->
            Je.object [ ( "_", Je.string "SuggestionReject" ), ( "suggestionId", suggestionIdToJsonValue parameter ) ]

        ItemBodySuggestionCancelRejection parameter ->
            Je.object [ ( "_", Je.string "SuggestionCancelRejection" ), ( "suggestionId", suggestionIdToJsonValue parameter ) ]


{-| SuggestionSnapshotのJSONへのエンコーダ
-}
suggestionSnapshotToJsonValue : SuggestionSnapshot -> Je.Value
suggestionSnapshotToJsonValue suggestionSnapshot =
    Je.object
        [ ( "name", Je.string suggestionSnapshot.name )
        , ( "createUserId", userIdToJsonValue suggestionSnapshot.createUserId )
        , ( "reason", Je.string suggestionSnapshot.reason )
        , ( "state", suggestionStateToJsonValue suggestionSnapshot.state )
        , ( "changeList", Je.list changeToJsonValue suggestionSnapshot.changeList )
        , ( "projectId", projectIdToJsonValue suggestionSnapshot.projectId )
        , ( "ideaId", ideaIdToJsonValue suggestionSnapshot.ideaId )
        , ( "updateTime", timeToJsonValue suggestionSnapshot.updateTime )
        , ( "getTime", timeToJsonValue suggestionSnapshot.getTime )
        ]


{-| SuggestionSnapshotAndIdのJSONへのエンコーダ
-}
suggestionSnapshotAndIdToJsonValue : SuggestionSnapshotAndId -> Je.Value
suggestionSnapshotAndIdToJsonValue suggestionSnapshotAndId =
    Je.object
        [ ( "id", suggestionIdToJsonValue suggestionSnapshotAndId.id )
        , ( "snapshot", suggestionSnapshotToJsonValue suggestionSnapshotAndId.snapshot )
        ]


{-| SuggestionResponseのJSONへのエンコーダ
-}
suggestionResponseToJsonValue : SuggestionResponse -> Je.Value
suggestionResponseToJsonValue suggestionResponse =
    Je.object
        [ ( "id", suggestionIdToJsonValue suggestionResponse.id )
        , ( "snapshotMaybe", maybeToJsonValue suggestionSnapshotToJsonValue suggestionResponse.snapshotMaybe )
        ]


{-| SuggestionStateのJSONへのエンコーダ
-}
suggestionStateToJsonValue : SuggestionState -> Je.Value
suggestionStateToJsonValue suggestionState =
    case suggestionState of
        SuggestionStateCreating ->
            Je.string "Creating"

        SuggestionStateApprovalPending ->
            Je.string "ApprovalPending"

        SuggestionStateApproved ->
            Je.string "Approved"

        SuggestionStateRejected ->
            Je.string "Rejected"


{-| ChangeのJSONへのエンコーダ
-}
changeToJsonValue : Change -> Je.Value
changeToJsonValue change =
    case change of
        ChangeProjectName parameter ->
            Je.object [ ( "_", Je.string "ProjectName" ), ( "string_", Je.string parameter ) ]

        ChangeAddPart parameter ->
            Je.object [ ( "_", Je.string "AddPart" ), ( "addPart", addPartToJsonValue parameter ) ]


{-| AddPartのJSONへのエンコーダ
-}
addPartToJsonValue : AddPart -> Je.Value
addPartToJsonValue addPart =
    Je.object
        [ ( "name", Je.string addPart.name )
        , ( "description", Je.string addPart.description )
        , ( "type", suggestionTypeToJsonValue addPart.type_ )
        , ( "expr", suggestionExprToJsonValue addPart.expr )
        ]


{-| SuggestionTypeのJSONへのエンコーダ
-}
suggestionTypeToJsonValue : SuggestionType -> Je.Value
suggestionTypeToJsonValue suggestionType =
    case suggestionType of
        SuggestionTypeFunction parameter ->
            Je.object [ ( "_", Je.string "Function" ), ( "suggestionTypeInputAndOutput", suggestionTypeInputAndOutputToJsonValue parameter ) ]

        SuggestionTypeTypePartWithParameter parameter ->
            Je.object [ ( "_", Je.string "TypePartWithParameter" ), ( "typePartWithSuggestionTypeParameter", typePartWithSuggestionTypeParameterToJsonValue parameter ) ]

        SuggestionTypeSuggestionTypePartWithParameter parameter ->
            Je.object [ ( "_", Je.string "SuggestionTypePartWithParameter" ), ( "suggestionTypePartWithSuggestionTypeParameter", suggestionTypePartWithSuggestionTypeParameterToJsonValue parameter ) ]


{-| SuggestionTypeInputAndOutputのJSONへのエンコーダ
-}
suggestionTypeInputAndOutputToJsonValue : SuggestionTypeInputAndOutput -> Je.Value
suggestionTypeInputAndOutputToJsonValue suggestionTypeInputAndOutput =
    Je.object
        [ ( "inputType", suggestionTypeToJsonValue suggestionTypeInputAndOutput.inputType )
        , ( "outputType", suggestionTypeToJsonValue suggestionTypeInputAndOutput.outputType )
        ]


{-| TypePartWithSuggestionTypeParameterのJSONへのエンコーダ
-}
typePartWithSuggestionTypeParameterToJsonValue : TypePartWithSuggestionTypeParameter -> Je.Value
typePartWithSuggestionTypeParameterToJsonValue typePartWithSuggestionTypeParameter =
    Je.object
        [ ( "typePartId", typePartIdToJsonValue typePartWithSuggestionTypeParameter.typePartId )
        , ( "parameter", Je.list suggestionTypeToJsonValue typePartWithSuggestionTypeParameter.parameter )
        ]


{-| SuggestionTypePartWithSuggestionTypeParameterのJSONへのエンコーダ
-}
suggestionTypePartWithSuggestionTypeParameterToJsonValue : SuggestionTypePartWithSuggestionTypeParameter -> Je.Value
suggestionTypePartWithSuggestionTypeParameterToJsonValue suggestionTypePartWithSuggestionTypeParameter =
    Je.object
        [ ( "suggestionTypePartIndex", Je.int suggestionTypePartWithSuggestionTypeParameter.suggestionTypePartIndex )
        , ( "parameter", Je.list suggestionTypeToJsonValue suggestionTypePartWithSuggestionTypeParameter.parameter )
        ]


{-| SuggestionExprのJSONへのエンコーダ
-}
suggestionExprToJsonValue : SuggestionExpr -> Je.Value
suggestionExprToJsonValue suggestionExpr =
    case suggestionExpr of
        SuggestionExprKernel parameter ->
            Je.object [ ( "_", Je.string "Kernel" ), ( "kernelExpr", kernelExprToJsonValue parameter ) ]

        SuggestionExprInt32Literal parameter ->
            Je.object [ ( "_", Je.string "Int32Literal" ), ( "int32", Je.int parameter ) ]

        SuggestionExprPartReference parameter ->
            Je.object [ ( "_", Je.string "PartReference" ), ( "partId", partIdToJsonValue parameter ) ]

        SuggestionExprSuggestionPartReference parameter ->
            Je.object [ ( "_", Je.string "SuggestionPartReference" ), ( "int32", Je.int parameter ) ]

        SuggestionExprLocalPartReference parameter ->
            Je.object [ ( "_", Je.string "LocalPartReference" ), ( "localPartReference", localPartReferenceToJsonValue parameter ) ]

        SuggestionExprTagReference parameter ->
            Je.object [ ( "_", Je.string "TagReference" ), ( "tagReference", tagReferenceToJsonValue parameter ) ]

        SuggestionExprSuggestionTagReference parameter ->
            Je.object [ ( "_", Je.string "SuggestionTagReference" ), ( "suggestionTagReference", suggestionTagReferenceToJsonValue parameter ) ]

        SuggestionExprFunctionCall parameter ->
            Je.object [ ( "_", Je.string "FunctionCall" ), ( "suggestionFunctionCall", suggestionFunctionCallToJsonValue parameter ) ]

        SuggestionExprLambda parameter ->
            Je.object [ ( "_", Je.string "Lambda" ), ( "suggestionLambdaBranch", suggestionLambdaBranchToJsonValue parameter ) ]


{-| SuggestionTagReferenceのJSONへのエンコーダ
-}
suggestionTagReferenceToJsonValue : SuggestionTagReference -> Je.Value
suggestionTagReferenceToJsonValue suggestionTagReference =
    Je.object
        [ ( "suggestionTypePartIndex", Je.int suggestionTagReference.suggestionTypePartIndex )
        , ( "tagIndex", Je.int suggestionTagReference.tagIndex )
        ]


{-| SuggestionFunctionCallのJSONへのエンコーダ
-}
suggestionFunctionCallToJsonValue : SuggestionFunctionCall -> Je.Value
suggestionFunctionCallToJsonValue suggestionFunctionCall =
    Je.object
        [ ( "function", suggestionExprToJsonValue suggestionFunctionCall.function )
        , ( "parameter", suggestionExprToJsonValue suggestionFunctionCall.parameter )
        ]


{-| SuggestionLambdaBranchのJSONへのエンコーダ
-}
suggestionLambdaBranchToJsonValue : SuggestionLambdaBranch -> Je.Value
suggestionLambdaBranchToJsonValue suggestionLambdaBranch =
    Je.object
        [ ( "condition", conditionToJsonValue suggestionLambdaBranch.condition )
        , ( "description", Je.string suggestionLambdaBranch.description )
        , ( "localPartList", Je.list suggestionBranchPartDefinitionToJsonValue suggestionLambdaBranch.localPartList )
        , ( "expr", maybeToJsonValue suggestionExprToJsonValue suggestionLambdaBranch.expr )
        ]


{-| SuggestionBranchPartDefinitionのJSONへのエンコーダ
-}
suggestionBranchPartDefinitionToJsonValue : SuggestionBranchPartDefinition -> Je.Value
suggestionBranchPartDefinitionToJsonValue suggestionBranchPartDefinition =
    Je.object
        [ ( "localPartId", localPartIdToJsonValue suggestionBranchPartDefinition.localPartId )
        , ( "name", Je.string suggestionBranchPartDefinition.name )
        , ( "description", Je.string suggestionBranchPartDefinition.description )
        , ( "type", suggestionTypeToJsonValue suggestionBranchPartDefinition.type_ )
        , ( "expr", suggestionExprToJsonValue suggestionBranchPartDefinition.expr )
        ]


{-| TypePartSnapshotのJSONへのエンコーダ
-}
typePartSnapshotToJsonValue : TypePartSnapshot -> Je.Value
typePartSnapshotToJsonValue typePartSnapshot =
    Je.object
        [ ( "name", Je.string typePartSnapshot.name )
        , ( "parentList", Je.list partIdToJsonValue typePartSnapshot.parentList )
        , ( "description", Je.string typePartSnapshot.description )
        , ( "projectId", projectIdToJsonValue typePartSnapshot.projectId )
        , ( "createSuggestionId", suggestionIdToJsonValue typePartSnapshot.createSuggestionId )
        , ( "getTime", timeToJsonValue typePartSnapshot.getTime )
        , ( "body", typePartBodyToJsonValue typePartSnapshot.body )
        ]


{-| PartSnapshotのJSONへのエンコーダ
-}
partSnapshotToJsonValue : PartSnapshot -> Je.Value
partSnapshotToJsonValue partSnapshot =
    Je.object
        [ ( "name", Je.string partSnapshot.name )
        , ( "parentList", Je.list partIdToJsonValue partSnapshot.parentList )
        , ( "description", Je.string partSnapshot.description )
        , ( "type", typeToJsonValue partSnapshot.type_ )
        , ( "expr", maybeToJsonValue exprToJsonValue partSnapshot.expr )
        , ( "projectId", projectIdToJsonValue partSnapshot.projectId )
        , ( "createSuggestionId", suggestionIdToJsonValue partSnapshot.createSuggestionId )
        , ( "getTime", timeToJsonValue partSnapshot.getTime )
        ]


{-| TypePartBodyのJSONへのエンコーダ
-}
typePartBodyToJsonValue : TypePartBody -> Je.Value
typePartBodyToJsonValue typePartBody =
    case typePartBody of
        TypePartBodyProduct parameter ->
            Je.object [ ( "_", Je.string "Product" ), ( "typePartBodyProductMemberList", Je.list typePartBodyProductMemberToJsonValue parameter ) ]

        TypePartBodySum parameter ->
            Je.object [ ( "_", Je.string "Sum" ), ( "typePartBodySumPatternList", Je.list typePartBodySumPatternToJsonValue parameter ) ]

        TypePartBodyKernel parameter ->
            Je.object [ ( "_", Je.string "Kernel" ), ( "typePartBodyKernel", typePartBodyKernelToJsonValue parameter ) ]


{-| TypePartBodyProductMemberのJSONへのエンコーダ
-}
typePartBodyProductMemberToJsonValue : TypePartBodyProductMember -> Je.Value
typePartBodyProductMemberToJsonValue typePartBodyProductMember =
    Je.object
        [ ( "name", Je.string typePartBodyProductMember.name )
        , ( "description", Je.string typePartBodyProductMember.description )
        , ( "memberType", typeToJsonValue typePartBodyProductMember.memberType )
        ]


{-| TypePartBodySumPatternのJSONへのエンコーダ
-}
typePartBodySumPatternToJsonValue : TypePartBodySumPattern -> Je.Value
typePartBodySumPatternToJsonValue typePartBodySumPattern =
    Je.object
        [ ( "name", Je.string typePartBodySumPattern.name )
        , ( "description", Je.string typePartBodySumPattern.description )
        , ( "parameter", typeToJsonValue typePartBodySumPattern.parameter )
        ]


{-| TypePartBodyKernelのJSONへのエンコーダ
-}
typePartBodyKernelToJsonValue : TypePartBodyKernel -> Je.Value
typePartBodyKernelToJsonValue typePartBodyKernel =
    case typePartBodyKernel of
        TypePartBodyKernelInt32 ->
            Je.string "Int32"

        TypePartBodyKernelList ->
            Je.string "List"


{-| TypeのJSONへのエンコーダ
-}
typeToJsonValue : Type -> Je.Value
typeToJsonValue type_ =
    case type_ of
        TypeFunction parameter ->
            Je.object [ ( "_", Je.string "Function" ), ( "typeInputAndOutput", typeInputAndOutputToJsonValue parameter ) ]

        TypeTypePartWithParameter parameter ->
            Je.object [ ( "_", Je.string "TypePartWithParameter" ), ( "typePartIdWithParameter", typePartIdWithParameterToJsonValue parameter ) ]


{-| TypeInputAndOutputのJSONへのエンコーダ
-}
typeInputAndOutputToJsonValue : TypeInputAndOutput -> Je.Value
typeInputAndOutputToJsonValue typeInputAndOutput =
    Je.object
        [ ( "inputType", typeToJsonValue typeInputAndOutput.inputType )
        , ( "outputType", typeToJsonValue typeInputAndOutput.outputType )
        ]


{-| TypePartIdWithParameterのJSONへのエンコーダ
-}
typePartIdWithParameterToJsonValue : TypePartIdWithParameter -> Je.Value
typePartIdWithParameterToJsonValue typePartIdWithParameter =
    Je.object
        [ ( "typePartId", typePartIdToJsonValue typePartIdWithParameter.typePartId )
        , ( "parameter", Je.list typeToJsonValue typePartIdWithParameter.parameter )
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
            Je.object [ ( "_", Je.string "TagReference" ), ( "tagReference", tagReferenceToJsonValue parameter ) ]

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

        EvaluatedExprLocalPartReference parameter ->
            Je.object [ ( "_", Je.string "LocalPartReference" ), ( "localPartReference", localPartReferenceToJsonValue parameter ) ]

        EvaluatedExprTagReference parameter ->
            Je.object [ ( "_", Je.string "TagReference" ), ( "tagReference", tagReferenceToJsonValue parameter ) ]

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


{-| TagReferenceのJSONへのエンコーダ
-}
tagReferenceToJsonValue : TagReference -> Je.Value
tagReferenceToJsonValue tagReference =
    Je.object
        [ ( "typePartId", typePartIdToJsonValue tagReference.typePartId )
        , ( "tagId", tagIdToJsonValue tagReference.tagId )
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


{-| CreateIdeaParameterのJSONへのエンコーダ
-}
createIdeaParameterToJsonValue : CreateIdeaParameter -> Je.Value
createIdeaParameterToJsonValue createIdeaParameter =
    Je.object
        [ ( "accessToken", accessTokenToJsonValue createIdeaParameter.accessToken )
        , ( "ideaName", Je.string createIdeaParameter.ideaName )
        , ( "projectId", projectIdToJsonValue createIdeaParameter.projectId )
        ]


{-| AddCommentParameterのJSONへのエンコーダ
-}
addCommentParameterToJsonValue : AddCommentParameter -> Je.Value
addCommentParameterToJsonValue addCommentParameter =
    Je.object
        [ ( "accessToken", accessTokenToJsonValue addCommentParameter.accessToken )
        , ( "ideaId", ideaIdToJsonValue addCommentParameter.ideaId )
        , ( "comment", Je.string addCommentParameter.comment )
        ]


{-| AddSuggestionParameterのJSONへのエンコーダ
-}
addSuggestionParameterToJsonValue : AddSuggestionParameter -> Je.Value
addSuggestionParameterToJsonValue addSuggestionParameter =
    Je.object
        [ ( "accessToken", accessTokenToJsonValue addSuggestionParameter.accessToken )
        , ( "ideaId", ideaIdToJsonValue addSuggestionParameter.ideaId )
        ]


{-| UpdateSuggestionParameterのJSONへのエンコーダ
-}
updateSuggestionParameterToJsonValue : UpdateSuggestionParameter -> Je.Value
updateSuggestionParameterToJsonValue updateSuggestionParameter =
    Je.object
        [ ( "accessToken", accessTokenToJsonValue updateSuggestionParameter.accessToken )
        , ( "suggestionId", suggestionIdToJsonValue updateSuggestionParameter.suggestionId )
        , ( "name", Je.string updateSuggestionParameter.name )
        , ( "reason", Je.string updateSuggestionParameter.reason )
        , ( "changeList", Je.list changeToJsonValue updateSuggestionParameter.changeList )
        ]


{-| AccessTokenAndSuggestionIdのJSONへのエンコーダ
-}
accessTokenAndSuggestionIdToJsonValue : AccessTokenAndSuggestionId -> Je.Value
accessTokenAndSuggestionIdToJsonValue accessTokenAndSuggestionId =
    Je.object
        [ ( "accessToken", accessTokenToJsonValue accessTokenAndSuggestionId.accessToken )
        , ( "suggestionId", suggestionIdToJsonValue accessTokenAndSuggestionId.suggestionId )
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


projectIdJsonDecoder : Jd.Decoder ProjectId
projectIdJsonDecoder =
    Jd.map ProjectId Jd.string


userIdJsonDecoder : Jd.Decoder UserId
userIdJsonDecoder =
    Jd.map UserId Jd.string


ideaIdJsonDecoder : Jd.Decoder IdeaId
ideaIdJsonDecoder =
    Jd.map IdeaId Jd.string


suggestionIdJsonDecoder : Jd.Decoder SuggestionId
suggestionIdJsonDecoder =
    Jd.map SuggestionId Jd.string


imageTokenJsonDecoder : Jd.Decoder ImageToken
imageTokenJsonDecoder =
    Jd.map ImageToken Jd.string


partIdJsonDecoder : Jd.Decoder PartId
partIdJsonDecoder =
    Jd.map PartId Jd.string


typePartIdJsonDecoder : Jd.Decoder TypePartId
typePartIdJsonDecoder =
    Jd.map TypePartId Jd.string


localPartIdJsonDecoder : Jd.Decoder LocalPartId
localPartIdJsonDecoder =
    Jd.map LocalPartId Jd.string


tagIdJsonDecoder : Jd.Decoder TagId
tagIdJsonDecoder =
    Jd.map TagId Jd.string


accessTokenJsonDecoder : Jd.Decoder AccessToken
accessTokenJsonDecoder =
    Jd.map AccessToken Jd.string


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
        (\clientMode location language ->
            { clientMode = clientMode
            , location = location
            , language = language
            }
        )
        |> Jdp.required "clientMode" clientModeJsonDecoder
        |> Jdp.required "location" locationJsonDecoder
        |> Jdp.required "language" languageJsonDecoder


{-| ClientModeのJSON Decoder
-}
clientModeJsonDecoder : Jd.Decoder ClientMode
clientModeJsonDecoder =
    Jd.string
        |> Jd.andThen
            (\tag ->
                case tag of
                    "DebugMode" ->
                        Jd.succeed ClientModeDebugMode

                    "Release" ->
                        Jd.succeed ClientModeRelease

                    _ ->
                        Jd.fail ("ClientModeで不明なタグを受けたとった tag=" ++ tag)
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

                    "CreateIdea" ->
                        Jd.field "projectId" projectIdJsonDecoder |> Jd.map LocationCreateIdea

                    "User" ->
                        Jd.field "userId" userIdJsonDecoder |> Jd.map LocationUser

                    "Project" ->
                        Jd.field "projectId" projectIdJsonDecoder |> Jd.map LocationProject

                    "Idea" ->
                        Jd.field "ideaId" ideaIdJsonDecoder |> Jd.map LocationIdea

                    "Suggestion" ->
                        Jd.field "suggestionId" suggestionIdJsonDecoder |> Jd.map LocationSuggestion

                    _ ->
                        Jd.fail ("Locationで不明なタグを受けたとった tag=" ++ tag)
            )


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


{-| UserSnapshotのJSON Decoder
-}
userSnapshotJsonDecoder : Jd.Decoder UserSnapshot
userSnapshotJsonDecoder =
    Jd.succeed
        (\name imageHash introduction createTime likeProjectIdList developProjectIdList commentIdeaIdList getTime ->
            { name = name
            , imageHash = imageHash
            , introduction = introduction
            , createTime = createTime
            , likeProjectIdList = likeProjectIdList
            , developProjectIdList = developProjectIdList
            , commentIdeaIdList = commentIdeaIdList
            , getTime = getTime
            }
        )
        |> Jdp.required "name" Jd.string
        |> Jdp.required "imageHash" imageTokenJsonDecoder
        |> Jdp.required "introduction" Jd.string
        |> Jdp.required "createTime" timeJsonDecoder
        |> Jdp.required "likeProjectIdList" (Jd.list projectIdJsonDecoder)
        |> Jdp.required "developProjectIdList" (Jd.list projectIdJsonDecoder)
        |> Jdp.required "commentIdeaIdList" (Jd.list ideaIdJsonDecoder)
        |> Jdp.required "getTime" timeJsonDecoder


{-| UserSnapshotAndIdのJSON Decoder
-}
userSnapshotAndIdJsonDecoder : Jd.Decoder UserSnapshotAndId
userSnapshotAndIdJsonDecoder =
    Jd.succeed
        (\id snapshot ->
            { id = id
            , snapshot = snapshot
            }
        )
        |> Jdp.required "id" userIdJsonDecoder
        |> Jdp.required "snapshot" userSnapshotJsonDecoder


{-| UserResponseのJSON Decoder
-}
userResponseJsonDecoder : Jd.Decoder UserResponse
userResponseJsonDecoder =
    Jd.succeed
        (\id snapshotMaybe ->
            { id = id
            , snapshotMaybe = snapshotMaybe
            }
        )
        |> Jdp.required "id" userIdJsonDecoder
        |> Jdp.required "snapshotMaybe" (maybeJsonDecoder userSnapshotJsonDecoder)


{-| ProjectSnapshotのJSON Decoder
-}
projectSnapshotJsonDecoder : Jd.Decoder ProjectSnapshot
projectSnapshotJsonDecoder =
    Jd.succeed
        (\name iconHash imageHash createTime createUser updateTime getTime partIdList typePartIdList ->
            { name = name
            , iconHash = iconHash
            , imageHash = imageHash
            , createTime = createTime
            , createUser = createUser
            , updateTime = updateTime
            , getTime = getTime
            , partIdList = partIdList
            , typePartIdList = typePartIdList
            }
        )
        |> Jdp.required "name" Jd.string
        |> Jdp.required "iconHash" imageTokenJsonDecoder
        |> Jdp.required "imageHash" imageTokenJsonDecoder
        |> Jdp.required "createTime" timeJsonDecoder
        |> Jdp.required "createUser" userIdJsonDecoder
        |> Jdp.required "updateTime" timeJsonDecoder
        |> Jdp.required "getTime" timeJsonDecoder
        |> Jdp.required "partIdList" (Jd.list partIdJsonDecoder)
        |> Jdp.required "typePartIdList" (Jd.list typePartIdJsonDecoder)


{-| ProjectSnapshotAndIdのJSON Decoder
-}
projectSnapshotAndIdJsonDecoder : Jd.Decoder ProjectSnapshotAndId
projectSnapshotAndIdJsonDecoder =
    Jd.succeed
        (\id snapshot ->
            { id = id
            , snapshot = snapshot
            }
        )
        |> Jdp.required "id" projectIdJsonDecoder
        |> Jdp.required "snapshot" projectSnapshotJsonDecoder


{-| ProjectResponseのJSON Decoder
-}
projectResponseJsonDecoder : Jd.Decoder ProjectResponse
projectResponseJsonDecoder =
    Jd.succeed
        (\id snapshotMaybe ->
            { id = id
            , snapshotMaybe = snapshotMaybe
            }
        )
        |> Jdp.required "id" projectIdJsonDecoder
        |> Jdp.required "snapshotMaybe" (maybeJsonDecoder projectSnapshotJsonDecoder)


{-| IdeaSnapshotのJSON Decoder
-}
ideaSnapshotJsonDecoder : Jd.Decoder IdeaSnapshot
ideaSnapshotJsonDecoder =
    Jd.succeed
        (\name createUser createTime projectId itemList updateTime getTime ->
            { name = name
            , createUser = createUser
            , createTime = createTime
            , projectId = projectId
            , itemList = itemList
            , updateTime = updateTime
            , getTime = getTime
            }
        )
        |> Jdp.required "name" Jd.string
        |> Jdp.required "createUser" userIdJsonDecoder
        |> Jdp.required "createTime" timeJsonDecoder
        |> Jdp.required "projectId" projectIdJsonDecoder
        |> Jdp.required "itemList" (Jd.list ideaItemJsonDecoder)
        |> Jdp.required "updateTime" timeJsonDecoder
        |> Jdp.required "getTime" timeJsonDecoder


{-| IdeaSnapshotAndIdのJSON Decoder
-}
ideaSnapshotAndIdJsonDecoder : Jd.Decoder IdeaSnapshotAndId
ideaSnapshotAndIdJsonDecoder =
    Jd.succeed
        (\id snapshot ->
            { id = id
            , snapshot = snapshot
            }
        )
        |> Jdp.required "id" ideaIdJsonDecoder
        |> Jdp.required "snapshot" ideaSnapshotJsonDecoder


{-| IdeaResponseのJSON Decoder
-}
ideaResponseJsonDecoder : Jd.Decoder IdeaResponse
ideaResponseJsonDecoder =
    Jd.succeed
        (\id snapshotMaybe ->
            { id = id
            , snapshotMaybe = snapshotMaybe
            }
        )
        |> Jdp.required "id" ideaIdJsonDecoder
        |> Jdp.required "snapshotMaybe" (maybeJsonDecoder ideaSnapshotJsonDecoder)


{-| IdeaListByProjectIdResponseのJSON Decoder
-}
ideaListByProjectIdResponseJsonDecoder : Jd.Decoder IdeaListByProjectIdResponse
ideaListByProjectIdResponseJsonDecoder =
    Jd.succeed
        (\projectId ideaSnapshotAndIdList ->
            { projectId = projectId
            , ideaSnapshotAndIdList = ideaSnapshotAndIdList
            }
        )
        |> Jdp.required "projectId" projectIdJsonDecoder
        |> Jdp.required "ideaSnapshotAndIdList" (Jd.list ideaSnapshotAndIdJsonDecoder)


{-| IdeaItemのJSON Decoder
-}
ideaItemJsonDecoder : Jd.Decoder IdeaItem
ideaItemJsonDecoder =
    Jd.succeed
        (\createUserId createTime body ->
            { createUserId = createUserId
            , createTime = createTime
            , body = body
            }
        )
        |> Jdp.required "createUserId" userIdJsonDecoder
        |> Jdp.required "createTime" timeJsonDecoder
        |> Jdp.required "body" itemBodyJsonDecoder


{-| ItemBodyのJSON Decoder
-}
itemBodyJsonDecoder : Jd.Decoder ItemBody
itemBodyJsonDecoder =
    Jd.field "_" Jd.string
        |> Jd.andThen
            (\tag ->
                case tag of
                    "Comment" ->
                        Jd.field "string_" Jd.string |> Jd.map ItemBodyComment

                    "SuggestionCreate" ->
                        Jd.field "suggestionId" suggestionIdJsonDecoder |> Jd.map ItemBodySuggestionCreate

                    "SuggestionToApprovalPending" ->
                        Jd.field "suggestionId" suggestionIdJsonDecoder |> Jd.map ItemBodySuggestionToApprovalPending

                    "SuggestionCancelToApprovalPending" ->
                        Jd.field "suggestionId" suggestionIdJsonDecoder |> Jd.map ItemBodySuggestionCancelToApprovalPending

                    "SuggestionApprove" ->
                        Jd.field "suggestionId" suggestionIdJsonDecoder |> Jd.map ItemBodySuggestionApprove

                    "SuggestionReject" ->
                        Jd.field "suggestionId" suggestionIdJsonDecoder |> Jd.map ItemBodySuggestionReject

                    "SuggestionCancelRejection" ->
                        Jd.field "suggestionId" suggestionIdJsonDecoder |> Jd.map ItemBodySuggestionCancelRejection

                    _ ->
                        Jd.fail ("ItemBodyで不明なタグを受けたとった tag=" ++ tag)
            )


{-| SuggestionSnapshotのJSON Decoder
-}
suggestionSnapshotJsonDecoder : Jd.Decoder SuggestionSnapshot
suggestionSnapshotJsonDecoder =
    Jd.succeed
        (\name createUserId reason state changeList projectId ideaId updateTime getTime ->
            { name = name
            , createUserId = createUserId
            , reason = reason
            , state = state
            , changeList = changeList
            , projectId = projectId
            , ideaId = ideaId
            , updateTime = updateTime
            , getTime = getTime
            }
        )
        |> Jdp.required "name" Jd.string
        |> Jdp.required "createUserId" userIdJsonDecoder
        |> Jdp.required "reason" Jd.string
        |> Jdp.required "state" suggestionStateJsonDecoder
        |> Jdp.required "changeList" (Jd.list changeJsonDecoder)
        |> Jdp.required "projectId" projectIdJsonDecoder
        |> Jdp.required "ideaId" ideaIdJsonDecoder
        |> Jdp.required "updateTime" timeJsonDecoder
        |> Jdp.required "getTime" timeJsonDecoder


{-| SuggestionSnapshotAndIdのJSON Decoder
-}
suggestionSnapshotAndIdJsonDecoder : Jd.Decoder SuggestionSnapshotAndId
suggestionSnapshotAndIdJsonDecoder =
    Jd.succeed
        (\id snapshot ->
            { id = id
            , snapshot = snapshot
            }
        )
        |> Jdp.required "id" suggestionIdJsonDecoder
        |> Jdp.required "snapshot" suggestionSnapshotJsonDecoder


{-| SuggestionResponseのJSON Decoder
-}
suggestionResponseJsonDecoder : Jd.Decoder SuggestionResponse
suggestionResponseJsonDecoder =
    Jd.succeed
        (\id snapshotMaybe ->
            { id = id
            , snapshotMaybe = snapshotMaybe
            }
        )
        |> Jdp.required "id" suggestionIdJsonDecoder
        |> Jdp.required "snapshotMaybe" (maybeJsonDecoder suggestionSnapshotJsonDecoder)


{-| SuggestionStateのJSON Decoder
-}
suggestionStateJsonDecoder : Jd.Decoder SuggestionState
suggestionStateJsonDecoder =
    Jd.string
        |> Jd.andThen
            (\tag ->
                case tag of
                    "Creating" ->
                        Jd.succeed SuggestionStateCreating

                    "ApprovalPending" ->
                        Jd.succeed SuggestionStateApprovalPending

                    "Approved" ->
                        Jd.succeed SuggestionStateApproved

                    "Rejected" ->
                        Jd.succeed SuggestionStateRejected

                    _ ->
                        Jd.fail ("SuggestionStateで不明なタグを受けたとった tag=" ++ tag)
            )


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

                    "AddPart" ->
                        Jd.field "addPart" addPartJsonDecoder |> Jd.map ChangeAddPart

                    _ ->
                        Jd.fail ("Changeで不明なタグを受けたとった tag=" ++ tag)
            )


{-| AddPartのJSON Decoder
-}
addPartJsonDecoder : Jd.Decoder AddPart
addPartJsonDecoder =
    Jd.succeed
        (\name description type_ expr ->
            { name = name
            , description = description
            , type_ = type_
            , expr = expr
            }
        )
        |> Jdp.required "name" Jd.string
        |> Jdp.required "description" Jd.string
        |> Jdp.required "type" suggestionTypeJsonDecoder
        |> Jdp.required "expr" suggestionExprJsonDecoder


{-| SuggestionTypeのJSON Decoder
-}
suggestionTypeJsonDecoder : Jd.Decoder SuggestionType
suggestionTypeJsonDecoder =
    Jd.field "_" Jd.string
        |> Jd.andThen
            (\tag ->
                case tag of
                    "Function" ->
                        Jd.field "suggestionTypeInputAndOutput" suggestionTypeInputAndOutputJsonDecoder |> Jd.map SuggestionTypeFunction

                    "TypePartWithParameter" ->
                        Jd.field "typePartWithSuggestionTypeParameter" typePartWithSuggestionTypeParameterJsonDecoder |> Jd.map SuggestionTypeTypePartWithParameter

                    "SuggestionTypePartWithParameter" ->
                        Jd.field "suggestionTypePartWithSuggestionTypeParameter" suggestionTypePartWithSuggestionTypeParameterJsonDecoder |> Jd.map SuggestionTypeSuggestionTypePartWithParameter

                    _ ->
                        Jd.fail ("SuggestionTypeで不明なタグを受けたとった tag=" ++ tag)
            )


{-| SuggestionTypeInputAndOutputのJSON Decoder
-}
suggestionTypeInputAndOutputJsonDecoder : Jd.Decoder SuggestionTypeInputAndOutput
suggestionTypeInputAndOutputJsonDecoder =
    Jd.succeed
        (\inputType outputType ->
            { inputType = inputType
            , outputType = outputType
            }
        )
        |> Jdp.required "inputType" suggestionTypeJsonDecoder
        |> Jdp.required "outputType" suggestionTypeJsonDecoder


{-| TypePartWithSuggestionTypeParameterのJSON Decoder
-}
typePartWithSuggestionTypeParameterJsonDecoder : Jd.Decoder TypePartWithSuggestionTypeParameter
typePartWithSuggestionTypeParameterJsonDecoder =
    Jd.succeed
        (\typePartId parameter ->
            { typePartId = typePartId
            , parameter = parameter
            }
        )
        |> Jdp.required "typePartId" typePartIdJsonDecoder
        |> Jdp.required "parameter" (Jd.list suggestionTypeJsonDecoder)


{-| SuggestionTypePartWithSuggestionTypeParameterのJSON Decoder
-}
suggestionTypePartWithSuggestionTypeParameterJsonDecoder : Jd.Decoder SuggestionTypePartWithSuggestionTypeParameter
suggestionTypePartWithSuggestionTypeParameterJsonDecoder =
    Jd.succeed
        (\suggestionTypePartIndex parameter ->
            { suggestionTypePartIndex = suggestionTypePartIndex
            , parameter = parameter
            }
        )
        |> Jdp.required "suggestionTypePartIndex" Jd.int
        |> Jdp.required "parameter" (Jd.list suggestionTypeJsonDecoder)


{-| SuggestionExprのJSON Decoder
-}
suggestionExprJsonDecoder : Jd.Decoder SuggestionExpr
suggestionExprJsonDecoder =
    Jd.field "_" Jd.string
        |> Jd.andThen
            (\tag ->
                case tag of
                    "Kernel" ->
                        Jd.field "kernelExpr" kernelExprJsonDecoder |> Jd.map SuggestionExprKernel

                    "Int32Literal" ->
                        Jd.field "int32" Jd.int |> Jd.map SuggestionExprInt32Literal

                    "PartReference" ->
                        Jd.field "partId" partIdJsonDecoder |> Jd.map SuggestionExprPartReference

                    "SuggestionPartReference" ->
                        Jd.field "int32" Jd.int |> Jd.map SuggestionExprSuggestionPartReference

                    "LocalPartReference" ->
                        Jd.field "localPartReference" localPartReferenceJsonDecoder |> Jd.map SuggestionExprLocalPartReference

                    "TagReference" ->
                        Jd.field "tagReference" tagReferenceJsonDecoder |> Jd.map SuggestionExprTagReference

                    "SuggestionTagReference" ->
                        Jd.field "suggestionTagReference" suggestionTagReferenceJsonDecoder |> Jd.map SuggestionExprSuggestionTagReference

                    "FunctionCall" ->
                        Jd.field "suggestionFunctionCall" suggestionFunctionCallJsonDecoder |> Jd.map SuggestionExprFunctionCall

                    "Lambda" ->
                        Jd.field "suggestionLambdaBranch" suggestionLambdaBranchJsonDecoder |> Jd.map SuggestionExprLambda

                    _ ->
                        Jd.fail ("SuggestionExprで不明なタグを受けたとった tag=" ++ tag)
            )


{-| SuggestionTagReferenceのJSON Decoder
-}
suggestionTagReferenceJsonDecoder : Jd.Decoder SuggestionTagReference
suggestionTagReferenceJsonDecoder =
    Jd.succeed
        (\suggestionTypePartIndex tagIndex ->
            { suggestionTypePartIndex = suggestionTypePartIndex
            , tagIndex = tagIndex
            }
        )
        |> Jdp.required "suggestionTypePartIndex" Jd.int
        |> Jdp.required "tagIndex" Jd.int


{-| SuggestionFunctionCallのJSON Decoder
-}
suggestionFunctionCallJsonDecoder : Jd.Decoder SuggestionFunctionCall
suggestionFunctionCallJsonDecoder =
    Jd.succeed
        (\function parameter ->
            { function = function
            , parameter = parameter
            }
        )
        |> Jdp.required "function" suggestionExprJsonDecoder
        |> Jdp.required "parameter" suggestionExprJsonDecoder


{-| SuggestionLambdaBranchのJSON Decoder
-}
suggestionLambdaBranchJsonDecoder : Jd.Decoder SuggestionLambdaBranch
suggestionLambdaBranchJsonDecoder =
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
        |> Jdp.required "localPartList" (Jd.list suggestionBranchPartDefinitionJsonDecoder)
        |> Jdp.required "expr" (maybeJsonDecoder suggestionExprJsonDecoder)


{-| SuggestionBranchPartDefinitionのJSON Decoder
-}
suggestionBranchPartDefinitionJsonDecoder : Jd.Decoder SuggestionBranchPartDefinition
suggestionBranchPartDefinitionJsonDecoder =
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
        |> Jdp.required "type" suggestionTypeJsonDecoder
        |> Jdp.required "expr" suggestionExprJsonDecoder


{-| TypePartSnapshotのJSON Decoder
-}
typePartSnapshotJsonDecoder : Jd.Decoder TypePartSnapshot
typePartSnapshotJsonDecoder =
    Jd.succeed
        (\name parentList description projectId createSuggestionId getTime body ->
            { name = name
            , parentList = parentList
            , description = description
            , projectId = projectId
            , createSuggestionId = createSuggestionId
            , getTime = getTime
            , body = body
            }
        )
        |> Jdp.required "name" Jd.string
        |> Jdp.required "parentList" (Jd.list partIdJsonDecoder)
        |> Jdp.required "description" Jd.string
        |> Jdp.required "projectId" projectIdJsonDecoder
        |> Jdp.required "createSuggestionId" suggestionIdJsonDecoder
        |> Jdp.required "getTime" timeJsonDecoder
        |> Jdp.required "body" typePartBodyJsonDecoder


{-| PartSnapshotのJSON Decoder
-}
partSnapshotJsonDecoder : Jd.Decoder PartSnapshot
partSnapshotJsonDecoder =
    Jd.succeed
        (\name parentList description type_ expr projectId createSuggestionId getTime ->
            { name = name
            , parentList = parentList
            , description = description
            , type_ = type_
            , expr = expr
            , projectId = projectId
            , createSuggestionId = createSuggestionId
            , getTime = getTime
            }
        )
        |> Jdp.required "name" Jd.string
        |> Jdp.required "parentList" (Jd.list partIdJsonDecoder)
        |> Jdp.required "description" Jd.string
        |> Jdp.required "type" typeJsonDecoder
        |> Jdp.required "expr" (maybeJsonDecoder exprJsonDecoder)
        |> Jdp.required "projectId" projectIdJsonDecoder
        |> Jdp.required "createSuggestionId" suggestionIdJsonDecoder
        |> Jdp.required "getTime" timeJsonDecoder


{-| TypePartBodyのJSON Decoder
-}
typePartBodyJsonDecoder : Jd.Decoder TypePartBody
typePartBodyJsonDecoder =
    Jd.field "_" Jd.string
        |> Jd.andThen
            (\tag ->
                case tag of
                    "Product" ->
                        Jd.field "typePartBodyProductMemberList" (Jd.list typePartBodyProductMemberJsonDecoder) |> Jd.map TypePartBodyProduct

                    "Sum" ->
                        Jd.field "typePartBodySumPatternList" (Jd.list typePartBodySumPatternJsonDecoder) |> Jd.map TypePartBodySum

                    "Kernel" ->
                        Jd.field "typePartBodyKernel" typePartBodyKernelJsonDecoder |> Jd.map TypePartBodyKernel

                    _ ->
                        Jd.fail ("TypePartBodyで不明なタグを受けたとった tag=" ++ tag)
            )


{-| TypePartBodyProductMemberのJSON Decoder
-}
typePartBodyProductMemberJsonDecoder : Jd.Decoder TypePartBodyProductMember
typePartBodyProductMemberJsonDecoder =
    Jd.succeed
        (\name description memberType ->
            { name = name
            , description = description
            , memberType = memberType
            }
        )
        |> Jdp.required "name" Jd.string
        |> Jdp.required "description" Jd.string
        |> Jdp.required "memberType" typeJsonDecoder


{-| TypePartBodySumPatternのJSON Decoder
-}
typePartBodySumPatternJsonDecoder : Jd.Decoder TypePartBodySumPattern
typePartBodySumPatternJsonDecoder =
    Jd.succeed
        (\name description parameter ->
            { name = name
            , description = description
            , parameter = parameter
            }
        )
        |> Jdp.required "name" Jd.string
        |> Jdp.required "description" Jd.string
        |> Jdp.required "parameter" typeJsonDecoder


{-| TypePartBodyKernelのJSON Decoder
-}
typePartBodyKernelJsonDecoder : Jd.Decoder TypePartBodyKernel
typePartBodyKernelJsonDecoder =
    Jd.string
        |> Jd.andThen
            (\tag ->
                case tag of
                    "Int32" ->
                        Jd.succeed TypePartBodyKernelInt32

                    "List" ->
                        Jd.succeed TypePartBodyKernelList

                    _ ->
                        Jd.fail ("TypePartBodyKernelで不明なタグを受けたとった tag=" ++ tag)
            )


{-| TypeのJSON Decoder
-}
typeJsonDecoder : Jd.Decoder Type
typeJsonDecoder =
    Jd.field "_" Jd.string
        |> Jd.andThen
            (\tag ->
                case tag of
                    "Function" ->
                        Jd.field "typeInputAndOutput" typeInputAndOutputJsonDecoder |> Jd.map TypeFunction

                    "TypePartWithParameter" ->
                        Jd.field "typePartIdWithParameter" typePartIdWithParameterJsonDecoder |> Jd.map TypeTypePartWithParameter

                    _ ->
                        Jd.fail ("Typeで不明なタグを受けたとった tag=" ++ tag)
            )


{-| TypeInputAndOutputのJSON Decoder
-}
typeInputAndOutputJsonDecoder : Jd.Decoder TypeInputAndOutput
typeInputAndOutputJsonDecoder =
    Jd.succeed
        (\inputType outputType ->
            { inputType = inputType
            , outputType = outputType
            }
        )
        |> Jdp.required "inputType" typeJsonDecoder
        |> Jdp.required "outputType" typeJsonDecoder


{-| TypePartIdWithParameterのJSON Decoder
-}
typePartIdWithParameterJsonDecoder : Jd.Decoder TypePartIdWithParameter
typePartIdWithParameterJsonDecoder =
    Jd.succeed
        (\typePartId parameter ->
            { typePartId = typePartId
            , parameter = parameter
            }
        )
        |> Jdp.required "typePartId" typePartIdJsonDecoder
        |> Jdp.required "parameter" (Jd.list typeJsonDecoder)


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
                        Jd.field "tagReference" tagReferenceJsonDecoder |> Jd.map ExprTagReference

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

                    "LocalPartReference" ->
                        Jd.field "localPartReference" localPartReferenceJsonDecoder |> Jd.map EvaluatedExprLocalPartReference

                    "TagReference" ->
                        Jd.field "tagReference" tagReferenceJsonDecoder |> Jd.map EvaluatedExprTagReference

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


{-| TagReferenceのJSON Decoder
-}
tagReferenceJsonDecoder : Jd.Decoder TagReference
tagReferenceJsonDecoder =
    Jd.succeed
        (\typePartId tagId ->
            { typePartId = typePartId
            , tagId = tagId
            }
        )
        |> Jdp.required "typePartId" typePartIdJsonDecoder
        |> Jdp.required "tagId" tagIdJsonDecoder


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


{-| CreateIdeaParameterのJSON Decoder
-}
createIdeaParameterJsonDecoder : Jd.Decoder CreateIdeaParameter
createIdeaParameterJsonDecoder =
    Jd.succeed
        (\accessToken ideaName projectId ->
            { accessToken = accessToken
            , ideaName = ideaName
            , projectId = projectId
            }
        )
        |> Jdp.required "accessToken" accessTokenJsonDecoder
        |> Jdp.required "ideaName" Jd.string
        |> Jdp.required "projectId" projectIdJsonDecoder


{-| AddCommentParameterのJSON Decoder
-}
addCommentParameterJsonDecoder : Jd.Decoder AddCommentParameter
addCommentParameterJsonDecoder =
    Jd.succeed
        (\accessToken ideaId comment ->
            { accessToken = accessToken
            , ideaId = ideaId
            , comment = comment
            }
        )
        |> Jdp.required "accessToken" accessTokenJsonDecoder
        |> Jdp.required "ideaId" ideaIdJsonDecoder
        |> Jdp.required "comment" Jd.string


{-| AddSuggestionParameterのJSON Decoder
-}
addSuggestionParameterJsonDecoder : Jd.Decoder AddSuggestionParameter
addSuggestionParameterJsonDecoder =
    Jd.succeed
        (\accessToken ideaId ->
            { accessToken = accessToken
            , ideaId = ideaId
            }
        )
        |> Jdp.required "accessToken" accessTokenJsonDecoder
        |> Jdp.required "ideaId" ideaIdJsonDecoder


{-| UpdateSuggestionParameterのJSON Decoder
-}
updateSuggestionParameterJsonDecoder : Jd.Decoder UpdateSuggestionParameter
updateSuggestionParameterJsonDecoder =
    Jd.succeed
        (\accessToken suggestionId name reason changeList ->
            { accessToken = accessToken
            , suggestionId = suggestionId
            , name = name
            , reason = reason
            , changeList = changeList
            }
        )
        |> Jdp.required "accessToken" accessTokenJsonDecoder
        |> Jdp.required "suggestionId" suggestionIdJsonDecoder
        |> Jdp.required "name" Jd.string
        |> Jdp.required "reason" Jd.string
        |> Jdp.required "changeList" (Jd.list changeJsonDecoder)


{-| AccessTokenAndSuggestionIdのJSON Decoder
-}
accessTokenAndSuggestionIdJsonDecoder : Jd.Decoder AccessTokenAndSuggestionId
accessTokenAndSuggestionIdJsonDecoder =
    Jd.succeed
        (\accessToken suggestionId ->
            { accessToken = accessToken
            , suggestionId = suggestionId
            }
        )
        |> Jdp.required "accessToken" accessTokenJsonDecoder
        |> Jdp.required "suggestionId" suggestionIdJsonDecoder
