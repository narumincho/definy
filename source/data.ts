import * as a from "util";

/**
 * バイナリと相互変換するための関数
 */
export type Codec<T> = {
  readonly encode: (a: T) => ReadonlyArray<number>;
  readonly decode: (
    a: number,
    b: Uint8Array
  ) => { readonly result: T; readonly nextIndex: number };
};

/**
 * Maybe. nullableのようなもの. Elmに標準で定義されているものに変換をするためにデフォルトで用意した
 */
export type Maybe<value> =
  | { readonly _: "Just"; readonly value: value }
  | { readonly _: "Nothing" };

/**
 * 成功と失敗を表す型. Elmに標準で定義されているものに変換をするためにデフォルトで用意した
 */
export type Result<ok, error> =
  | { readonly _: "Ok"; readonly ok: ok }
  | { readonly _: "Error"; readonly error: error };

/**
 * 日時. 0001-01-01T00:00:00.000Z to 9999-12-31T23:59:59.999Z 最小単位はミリ秒. ミリ秒の求め方は day*1000*60*60*24 + millisecond
 */
export type Time = {
  /**
   * 1970-01-01からの経過日数. マイナスになることもある
   */
  readonly day: number;
  /**
   * 日にちの中のミリ秒. 0 to 86399999 (=1000*60*60*24-1)
   */
  readonly millisecond: number;
};

/**
 * ログインのURLを発行するために必要なデータ
 */
export type RequestLogInUrlRequestData = {
  /**
   * ログインに使用するプロバイダー
   */
  readonly openIdConnectProvider: OpenIdConnectProvider;
  /**
   * ログインした後に返ってくるURLに必要なデータ
   */
  readonly urlData: UrlData;
};

/**
 * ソーシャルログインを提供するプロバイダー (例: Google, GitHub)
 */
export type OpenIdConnectProvider = "Google" | "GitHub";

/**
 * デバッグモードかどうか,言語とページの場所. URLとして表現されるデータ. Googleなどの検索エンジンの都合( https://support.google.com/webmasters/answer/182192?hl=ja )で,URLにページの言語を入れて,言語ごとに別のURLである必要がある. デバッグ時のホスト名は http://localhost になる
 */
export type UrlData = {
  /**
   * クライアントモード
   */
  readonly clientMode: ClientMode;
  /**
   * 場所
   */
  readonly location: Location;
  /**
   * 言語
   */
  readonly language: Language;
};

/**
 * デバッグモードか, リリースモード
 */
export type ClientMode = "DebugMode" | "Release";

/**
 * DefinyWebアプリ内での場所を示すもの. URLから求められる. URLに変換できる
 */
export type Location =
  | { readonly _: "Home" }
  | { readonly _: "CreateProject" }
  | { readonly _: "Project"; readonly projectId: ProjectId }
  | { readonly _: "User"; readonly userId: UserId }
  | { readonly _: "Idea"; readonly ideaId: IdeaId }
  | { readonly _: "Suggestion"; readonly suggestionId: SuggestionId }
  | { readonly _: "About" }
  | { readonly _: "Debug" };

/**
 * 英語,日本語,エスペラント語などの言語
 */
export type Language = "Japanese" | "English" | "Esperanto";

/**
 * ユーザーのデータのスナップショット
 */
export type User = {
  /**
   * ユーザー名. 表示される名前. 他のユーザーとかぶっても良い. 絵文字も使える. 全角英数は半角英数,半角カタカナは全角カタカナ, (株)の合字を分解するなどのNFKCの正規化がされる. U+0000-U+0019 と U+007F-U+00A0 の範囲の文字は入らない. 前後に空白を含められない. 間の空白は2文字以上連続しない. 文字数のカウント方法は正規化されたあとのCodePoint単位. Twitterと同じ, 1文字以上50文字以下
   */
  readonly name: string;
  /**
   * プロフィール画像
   */
  readonly imageHash: ImageToken;
  /**
   * 自己紹介文. 改行文字を含めることができる. Twitterと同じ 0～160文字
   */
  readonly introduction: string;
  /**
   * Definyでユーザーが作成された日時
   */
  readonly createTime: Time;
  /**
   * プロジェクトに対する いいね
   */
  readonly likeProjectIdList: ReadonlyArray<ProjectId>;
  /**
   * 開発に参加した (書いたコードが使われた) プロジェクト
   */
  readonly developProjectIdList: ReadonlyArray<ProjectId>;
  /**
   * コメントをしたアイデア
   */
  readonly commentIdeaIdList: ReadonlyArray<IdeaId>;
  /**
   * 取得日時
   */
  readonly getTime: Time;
};

/**
 * データを識別するIdとデータ
 */
export type IdAndData<id, data> = {
  /**
   * ID
   */
  readonly id: id;
  /**
   * データ
   */
  readonly data: data;
};

/**
 * プロジェクト
 */
export type Project = {
  /**
   * プロジェクト名
   */
  readonly name: string;
  /**
   * プロジェクトのアイコン画像
   */
  readonly iconHash: ImageToken;
  /**
   * プロジェクトのカバー画像
   */
  readonly imageHash: ImageToken;
  /**
   * 作成日時
   */
  readonly createTime: Time;
  /**
   * 作成アカウント
   */
  readonly createUserId: UserId;
  /**
   * 更新日時
   */
  readonly updateTime: Time;
  /**
   * 取得日時
   */
  readonly getTime: Time;
  /**
   * 所属しているのパーツのIDのリスト
   */
  readonly partIdList: ReadonlyArray<PartId>;
  /**
   * 所属している型パーツのIDのリスト
   */
  readonly typePartIdList: ReadonlyArray<TypePartId>;
};

/**
 * アイデア
 */
export type Idea = {
  /**
   * アイデア名
   */
  readonly name: string;
  /**
   * 言い出しっぺ
   */
  readonly createUserId: UserId;
  /**
   * 作成日時
   */
  readonly createTime: Time;
  /**
   * 対象のプロジェクト
   */
  readonly projectId: ProjectId;
  /**
   * アイデアの要素
   */
  readonly itemList: ReadonlyArray<IdeaItem>;
  /**
   * 更新日時
   */
  readonly updateTime: Time;
  /**
   * 取得日時
   */
  readonly getTime: Time;
};

/**
 * アイデアのコメント
 */
export type IdeaItem = {
  /**
   * 作成者
   */
  readonly createUserId: UserId;
  /**
   * 作成日時
   */
  readonly createTime: Time;
  /**
   * 本文
   */
  readonly body: ItemBody;
};

/**
 * アイデアのアイテム
 */
export type ItemBody =
  | { readonly _: "Comment"; readonly string_: string }
  | { readonly _: "SuggestionCreate"; readonly suggestionId: SuggestionId }
  | {
      readonly _: "SuggestionToApprovalPending";
      readonly suggestionId: SuggestionId;
    }
  | {
      readonly _: "SuggestionCancelToApprovalPending";
      readonly suggestionId: SuggestionId;
    }
  | { readonly _: "SuggestionApprove"; readonly suggestionId: SuggestionId }
  | { readonly _: "SuggestionReject"; readonly suggestionId: SuggestionId }
  | {
      readonly _: "SuggestionCancelRejection";
      readonly suggestionId: SuggestionId;
    };

/**
 * 提案
 */
export type Suggestion = {
  /**
   * 変更概要
   */
  readonly name: string;
  /**
   * 作成者
   */
  readonly createUserId: UserId;
  /**
   * 変更理由
   */
  readonly reason: string;
  /**
   * 承認状態
   */
  readonly state: SuggestionState;
  /**
   * 変更
   */
  readonly changeList: ReadonlyArray<Change>;
  /**
   * 変更をするプロジェクト
   */
  readonly projectId: ProjectId;
  /**
   * 投稿したアイデアID
   */
  readonly ideaId: IdeaId;
  /**
   * 更新日時
   */
  readonly updateTime: Time;
  /**
   * 取得日時
   */
  readonly getTime: Time;
};

/**
 * 提案の状況
 */
export type SuggestionState =
  | "Creating"
  | "ApprovalPending"
  | "Approved"
  | "Rejected";

/**
 * 変更点
 */
export type Change =
  | { readonly _: "ProjectName"; readonly string_: string }
  | { readonly _: "AddPart"; readonly addPart: AddPart };

/**
 * パーツを追加するのに必要なもの
 */
export type AddPart = {
  /**
   * ブラウザで生成した今回作成した提案内で参照するためのID
   */
  readonly id: number;
  /**
   * 新しいパーツの名前
   */
  readonly name: string;
  /**
   * 新しいパーツの説明
   */
  readonly description: string;
  /**
   * 新しいパーツの型
   */
  readonly type: SuggestionType;
  /**
   * 新しいパーツの式
   */
  readonly expr: SuggestionExpr;
};

/**
 * ChangeのAddPartなどで使われる提案で作成した型を使えるType
 */
export type SuggestionType =
  | {
      readonly _: "Function";
      readonly suggestionTypeInputAndOutput: SuggestionTypeInputAndOutput;
    }
  | {
      readonly _: "TypePartWithParameter";
      readonly typePartWithSuggestionTypeParameter: TypePartWithSuggestionTypeParameter;
    }
  | {
      readonly _: "SuggestionTypePartWithParameter";
      readonly suggestionTypePartWithSuggestionTypeParameter: SuggestionTypePartWithSuggestionTypeParameter;
    };

export type SuggestionTypeInputAndOutput = {
  /**
   * 入力の型
   */
  readonly inputType: SuggestionType;
  /**
   * 出力の型
   */
  readonly outputType: SuggestionType;
};

export type TypePartWithSuggestionTypeParameter = {
  /**
   * 型の参照
   */
  readonly typePartId: TypePartId;
  /**
   * 型のパラメーター
   */
  readonly parameter: ReadonlyArray<SuggestionType>;
};

export type SuggestionTypePartWithSuggestionTypeParameter = {
  /**
   * 提案内での定義した型パーツのID
   */
  readonly suggestionTypePartIndex: number;
  /**
   * 型のパラメーター
   */
  readonly parameter: ReadonlyArray<SuggestionType>;
};

/**
 * 提案時に含まれるパーツを参照できる式
 */
export type SuggestionExpr =
  | { readonly _: "Kernel"; readonly kernelExpr: KernelExpr }
  | { readonly _: "Int32Literal"; readonly int32: number }
  | { readonly _: "PartReference"; readonly partId: PartId }
  | { readonly _: "SuggestionPartReference"; readonly int32: number }
  | {
      readonly _: "LocalPartReference";
      readonly localPartReference: LocalPartReference;
    }
  | { readonly _: "TagReference"; readonly tagReference: TagReference }
  | {
      readonly _: "SuggestionTagReference";
      readonly suggestionTagReference: SuggestionTagReference;
    }
  | {
      readonly _: "FunctionCall";
      readonly suggestionFunctionCall: SuggestionFunctionCall;
    }
  | {
      readonly _: "Lambda";
      readonly suggestionLambdaBranchList: ReadonlyArray<
        SuggestionLambdaBranch
      >;
    }
  | { readonly _: "Blank" };

/**
 * 提案内で定義された型のタグ
 */
export type SuggestionTagReference = {
  /**
   * 提案内での定義した型パーツの番号
   */
  readonly suggestionTypePartIndex: number;
  /**
   * タグIndex
   */
  readonly tagIndex: number;
};

/**
 * 関数呼び出し (中に含まれる型はSuggestionExpr)
 */
export type SuggestionFunctionCall = {
  /**
   * 関数
   */
  readonly function: SuggestionExpr;
  /**
   * パラメーター
   */
  readonly parameter: SuggestionExpr;
};

/**
 * suggestionExprの入ったLambdaBranch
 */
export type SuggestionLambdaBranch = {
  /**
   * 入力値の条件を書くところ
   */
  readonly condition: Condition;
  /**
   * ブランチの説明
   */
  readonly description: string;
  readonly localPartList: ReadonlyArray<SuggestionBranchPartDefinition>;
  /**
   * 式
   */
  readonly expr: SuggestionExpr;
};

/**
 * ラムダのブランチで使えるパーツを定義する部分 (SuggestionExpr バージョン)
 */
export type SuggestionBranchPartDefinition = {
  /**
   * ローカルパーツID
   */
  readonly localPartId: LocalPartId;
  /**
   * ブランチパーツの名前
   */
  readonly name: string;
  /**
   * ブランチパーツの説明
   */
  readonly description: string;
  /**
   * ローカルパーツの型
   */
  readonly type: SuggestionType;
  /**
   * ローカルパーツの式
   */
  readonly expr: SuggestionExpr;
};

/**
 * 型パーツ
 */
export type TypePart = {
  /**
   * 型パーツの名前
   */
  readonly name: string;
  /**
   * この型パーツの元
   */
  readonly parentList: ReadonlyArray<PartId>;
  /**
   * 型パーツの説明
   */
  readonly description: string;
  /**
   * 所属しているプロジェクトのID
   */
  readonly projectId: ProjectId;
  /**
   * この型パーツが作成された提案
   */
  readonly createSuggestionId: SuggestionId;
  /**
   * 取得日時
   */
  readonly getTime: Time;
  /**
   * 定義本体
   */
  readonly body: TypePartBody;
};

/**
 * パーツの定義
 */
export type Part = {
  /**
   * パーツの名前
   */
  readonly name: string;
  /**
   * このパーツの元
   */
  readonly parentList: ReadonlyArray<PartId>;
  /**
   * パーツの説明
   */
  readonly description: string;
  /**
   * パーツの型
   */
  readonly type: Type;
  /**
   * パーツの式
   */
  readonly expr: Expr;
  /**
   * 所属しているプロジェクトのID
   */
  readonly projectId: ProjectId;
  /**
   * このパーツが作成された提案
   */
  readonly createSuggestionId: SuggestionId;
  /**
   * 取得日時
   */
  readonly getTime: Time;
};

/**
 * 型の定義本体
 */
export type TypePartBody =
  | { readonly _: "Product"; readonly memberList: ReadonlyArray<Member> }
  | { readonly _: "Sum"; readonly patternList: ReadonlyArray<Pattern> }
  | { readonly _: "Kernel"; readonly typePartBodyKernel: TypePartBodyKernel };

/**
 * 直積型のメンバー
 */
export type Member = {
  /**
   * メンバー名
   */
  readonly name: string;
  /**
   * 説明文
   */
  readonly description: string;
  /**
   * メンバー値の型
   */
  readonly type: Type;
};

/**
 * 直積型のパターン
 */
export type Pattern = {
  /**
   * タグ名
   */
  readonly name: string;
  /**
   * 説明文
   */
  readonly description: string;
  /**
   * パラメーター
   */
  readonly parameter: Maybe<Type>;
};

/**
 * Definyだけでは表現できないデータ型
 */
export type TypePartBodyKernel = "Int32" | "List";

/**
 * 型
 */
export type Type =
  | { readonly _: "Function"; readonly typeInputAndOutput: TypeInputAndOutput }
  | {
      readonly _: "TypePartWithParameter";
      readonly typePartIdWithParameter: TypePartIdWithParameter;
    };

export type TypeInputAndOutput = {
  /**
   * 入力の型
   */
  readonly inputType: Type;
  /**
   * 出力の型
   */
  readonly outputType: Type;
};

export type TypePartIdWithParameter = {
  /**
   * 型の参照
   */
  readonly typePartId: TypePartId;
  /**
   * 型のパラメーター
   */
  readonly parameter: ReadonlyArray<Type>;
};

/**
 * 式
 */
export type Expr =
  | { readonly _: "Kernel"; readonly kernelExpr: KernelExpr }
  | { readonly _: "Int32Literal"; readonly int32: number }
  | { readonly _: "PartReference"; readonly partId: PartId }
  | {
      readonly _: "LocalPartReference";
      readonly localPartReference: LocalPartReference;
    }
  | { readonly _: "TagReference"; readonly tagReference: TagReference }
  | { readonly _: "FunctionCall"; readonly functionCall: FunctionCall }
  | {
      readonly _: "Lambda";
      readonly lambdaBranchList: ReadonlyArray<LambdaBranch>;
    };

/**
 * 評価しきった式
 */
export type EvaluatedExpr =
  | { readonly _: "Kernel"; readonly kernelExpr: KernelExpr }
  | { readonly _: "Int32"; readonly int32: number }
  | {
      readonly _: "LocalPartReference";
      readonly localPartReference: LocalPartReference;
    }
  | { readonly _: "TagReference"; readonly tagReference: TagReference }
  | {
      readonly _: "Lambda";
      readonly lambdaBranchList: ReadonlyArray<LambdaBranch>;
    }
  | { readonly _: "KernelCall"; readonly kernelCall: KernelCall };

/**
 * 複数の引数が必要な内部関数の部分呼び出し
 */
export type KernelCall = {
  /**
   * 関数
   */
  readonly kernel: KernelExpr;
  /**
   * 呼び出すパラメーター
   */
  readonly expr: EvaluatedExpr;
};

/**
 * Definyだけでは表現できない式
 */
export type KernelExpr = "Int32Add" | "Int32Sub" | "Int32Mul";

/**
 * ローカルパスの参照を表す
 */
export type LocalPartReference = {
  /**
   * ローカルパスが定義されているパーツのID
   */
  readonly partId: PartId;
  /**
   * ローカルパーツID
   */
  readonly localPartId: LocalPartId;
};

/**
 * タグの参照を表す
 */
export type TagReference = {
  /**
   * 型ID
   */
  readonly typePartId: TypePartId;
  /**
   * タグID
   */
  readonly tagId: TagId;
};

/**
 * 関数呼び出し
 */
export type FunctionCall = {
  /**
   * 関数
   */
  readonly function: Expr;
  /**
   * パラメーター
   */
  readonly parameter: Expr;
};

/**
 * ラムダのブランチ. Just x -> data x のようなところ
 */
export type LambdaBranch = {
  /**
   * 入力値の条件を書くところ. Just x
   */
  readonly condition: Condition;
  /**
   * ブランチの説明
   */
  readonly description: string;
  readonly localPartList: ReadonlyArray<BranchPartDefinition>;
  /**
   * 式
   */
  readonly expr: Expr;
};

/**
 * ブランチの式を使う条件
 */
export type Condition =
  | { readonly _: "ByTag"; readonly conditionTag: ConditionTag }
  | { readonly _: "ByCapture"; readonly conditionCapture: ConditionCapture }
  | { readonly _: "Any" }
  | { readonly _: "Int32"; readonly int32: number };

/**
 * タグによる条件
 */
export type ConditionTag = {
  /**
   * タグ
   */
  readonly tag: TagId;
  /**
   * パラメーター
   */
  readonly parameter: Maybe<Condition>;
};

/**
 * キャプチャパーツへのキャプチャ
 */
export type ConditionCapture = {
  /**
   * キャプチャパーツの名前
   */
  readonly name: string;
  /**
   * ローカルパーツId
   */
  readonly localPartId: LocalPartId;
};

/**
 * ラムダのブランチで使えるパーツを定義する部分
 */
export type BranchPartDefinition = {
  /**
   * ローカルパーツID
   */
  readonly localPartId: LocalPartId;
  /**
   * ブランチパーツの名前
   */
  readonly name: string;
  /**
   * ブランチパーツの説明
   */
  readonly description: string;
  /**
   * ローカルパーツの型
   */
  readonly type: Type;
  /**
   * ローカルパーツの式
   */
  readonly expr: Expr;
};

/**
 * 評価したときに失敗した原因を表すもの
 */
export type EvaluateExprError =
  | { readonly _: "NeedPartDefinition"; readonly partId: PartId }
  | { readonly _: "NeedSuggestionPart"; readonly int32: number }
  | { readonly _: "Blank" }
  | {
      readonly _: "CannotFindLocalPartDefinition";
      readonly localPartReference: LocalPartReference;
    }
  | { readonly _: "TypeError"; readonly typeError: TypeError }
  | { readonly _: "NotSupported" };

/**
 * 型エラー
 */
export type TypeError = {
  /**
   * 型エラーの説明
   */
  readonly message: string;
};

/**
 * 評価する上で必要なソースコード
 */
export type EvalParameter = {
  /**
   * パーツのリスト
   */
  readonly partList: ReadonlyArray<IdAndData<PartId, Part>>;
  /**
   * 型パーツのリスト
   */
  readonly typePartList: ReadonlyArray<IdAndData<TypePartId, TypePart>>;
  /**
   * 変更点
   */
  readonly changeList: ReadonlyArray<Change>;
  /**
   * 評価してほしい式
   */
  readonly expr: SuggestionExpr;
};

/**
 * プロジェクト作成時に必要なパラメーター
 */
export type CreateProjectParameter = {
  /**
   * プロジェクトを作るときのアカウント
   */
  readonly accessToken: AccessToken;
  /**
   * プロジェクト名
   */
  readonly projectName: string;
};

/**
 * アイデアを作成時に必要なパラメーター
 */
export type CreateIdeaParameter = {
  /**
   * プロジェクトを作るときのアカウント
   */
  readonly accessToken: AccessToken;
  /**
   * アイデア名
   */
  readonly ideaName: string;
  /**
   * 対象のプロジェクトID
   */
  readonly projectId: ProjectId;
};

/**
 * アイデアにコメントを追加するときに必要なパラメーター
 */
export type AddCommentParameter = {
  /**
   * プロジェクトを作るときのアカウント
   */
  readonly accessToken: AccessToken;
  /**
   * コメントを追加するアイデア
   */
  readonly ideaId: IdeaId;
  /**
   * コメント本文
   */
  readonly comment: string;
};

/**
 * 提案を作成するときに必要なパラメーター
 */
export type AddSuggestionParameter = {
  /**
   * 提案を作成するアカウント
   */
  readonly accessToken: AccessToken;
  /**
   * 提案に関連付けられるアイデア
   */
  readonly ideaId: IdeaId;
};

/**
 * 提案を更新するときに必要なパラメーター
 */
export type UpdateSuggestionParameter = {
  /**
   * 提案を更新するアカウント
   */
  readonly accessToken: AccessToken;
  /**
   * 書き換える提案
   */
  readonly suggestionId: SuggestionId;
  /**
   * 提案の名前
   */
  readonly name: string;
  /**
   * 変更理由
   */
  readonly reason: string;
  /**
   * 提案の変更
   */
  readonly changeList: ReadonlyArray<Change>;
};

/**
 * 提案を承認待ちにしたり許可したりするときなどに使う
 */
export type AccessTokenAndSuggestionId = {
  /**
   * アクセストークン
   */
  readonly accessToken: AccessToken;
  /**
   * SuggestionId
   */
  readonly suggestionId: SuggestionId;
};

/**
 * ProjectやUserなどのリソースの保存状態を表す
 */
export type Resource<data> =
  | { readonly _: "Loaded"; readonly data: data }
  | { readonly _: "Unknown" }
  | { readonly _: "WaitLoading" }
  | { readonly _: "Loading" }
  | { readonly _: "WaitRequesting" }
  | { readonly _: "Requesting" }
  | { readonly _: "WaitUpdating"; readonly data: data }
  | { readonly _: "Updating"; readonly data: data }
  | { readonly _: "WaitRetrying" }
  | { readonly _: "Retrying" };

/**
 * キーであるTokenによってデータが必ず1つに決まるもの. 絶対に更新されない
 */
export type TokenResource<data> =
  | { readonly _: "Loaded"; readonly data: data }
  | { readonly _: "Unknown" }
  | { readonly _: "WaitLoading" }
  | { readonly _: "Loading" }
  | { readonly _: "WaitRequesting" }
  | { readonly _: "Requesting" }
  | { readonly _: "WaitRetrying" }
  | { readonly _: "Retrying" };

export type ProjectId = string & { readonly _projectId: never };

export type UserId = string & { readonly _userId: never };

export type IdeaId = string & { readonly _ideaId: never };

export type SuggestionId = string & { readonly _suggestionId: never };

export type PartId = string & { readonly _partId: never };

export type TypePartId = string & { readonly _typePartId: never };

export type LocalPartId = string & { readonly _localPartId: never };

export type TagId = string & { readonly _tagId: never };

export type ImageToken = string & { readonly _imageToken: never };

export type AccessToken = string & { readonly _accessToken: never };

/**
 * -2 147 483 648 ～ 2 147 483 647. 32bit 符号付き整数. JavaScriptのnumberで扱う
 */
export const Int32: {
  /**
   * numberの32bit符号あり整数をSigned Leb128のバイナリに変換する
   */
  readonly codec: Codec<number>;
} = {
  codec: {
    encode: (value: number): ReadonlyArray<number> => {
      value |= 0;
      const result: Array<number> = [];
      while (true) {
        const byte: number = value & 127;
        value >>= 7;
        if (
          (value === 0 && (byte & 64) === 0) ||
          (value === -1 && (byte & 64) !== 0)
        ) {
          result.push(byte);
          return result;
        }
        result.push(byte | 128);
      }
    },
    decode: (
      index: number,
      binary: Uint8Array
    ): { readonly result: number; readonly nextIndex: number } => {
      let result: number = 0;
      let offset: number = 0;
      while (true) {
        const byte: number = binary[index + offset];
        result |= (byte & 127) << (offset * 7);
        offset += 1;
        if ((128 & byte) === 0) {
          if (offset * 7 < 32 && (byte & 64) !== 0) {
            return {
              result: result | (~0 << (offset * 7)),
              nextIndex: index + offset,
            };
          }
          return { result: result, nextIndex: index + offset };
        }
      }
    },
  },
};

/**
 * 文字列. JavaScriptのstringで扱う
 */
export const String: {
  /**
   * stringをUTF-8のバイナリに変換する
   */
  readonly codec: Codec<string>;
} = {
  codec: {
    encode: (value: string): ReadonlyArray<number> => {
      const result: ReadonlyArray<number> = [
        ...new (process === undefined || process.title === "browser"
          ? TextEncoder
          : a.TextEncoder)().encode(value),
      ];
      return Int32.codec.encode(result.length).concat(result);
    },
    decode: (
      index: number,
      binary: Uint8Array
    ): { readonly result: string; readonly nextIndex: number } => {
      const length: {
        readonly result: number;
        readonly nextIndex: number;
      } = Int32.codec.decode(index, binary);
      const nextIndex: number = length.nextIndex + length.result;
      const textBinary: Uint8Array = binary.slice(length.nextIndex, nextIndex);
      const isBrowser: boolean =
        process === undefined || process.title === "browser";
      if (isBrowser) {
        return {
          result: new TextDecoder().decode(textBinary),
          nextIndex: nextIndex,
        };
      }
      return {
        result: new a.TextDecoder().decode(textBinary),
        nextIndex: nextIndex,
      };
    },
  },
};

/**
 * Bool. 真か偽. JavaScriptのbooleanで扱う
 */
export const Bool: {
  /**
   * true: 1, false: 0. (1byte)としてバイナリに変換する
   */
  readonly codec: Codec<boolean>;
} = {
  codec: {
    encode: (value: boolean): ReadonlyArray<number> => [value ? 1 : 0],
    decode: (
      index: number,
      binary: Uint8Array
    ): { readonly result: boolean; readonly nextIndex: number } => ({
      result: binary[index] !== 0,
      nextIndex: index + 1,
    }),
  },
};

/**
 * バイナリ. JavaScriptのUint8Arrayで扱う
 */
export const Binary: {
  /**
   * 最初にバイト数, その次にバイナリそのまま
   */
  readonly codec: Codec<Uint8Array>;
} = {
  codec: {
    encode: (value: Uint8Array): ReadonlyArray<number> =>
      Int32.codec.encode(value.length).concat([...value]),
    decode: (
      index: number,
      binary: Uint8Array
    ): { readonly result: Uint8Array; readonly nextIndex: number } => {
      const length: {
        readonly result: number;
        readonly nextIndex: number;
      } = Int32.codec.decode(index, binary);
      const nextIndex: number = length.nextIndex + length.result;
      return {
        result: binary.slice(length.nextIndex, nextIndex),
        nextIndex: nextIndex,
      };
    },
  },
};

/**
 * リスト. JavaScriptのArrayで扱う
 */
export const List: {
  readonly codec: <element>(a: Codec<element>) => Codec<ReadonlyArray<element>>;
} = {
  codec: <element>(
    elementCodec: Codec<element>
  ): Codec<ReadonlyArray<element>> => ({
    encode: (value: ReadonlyArray<element>): ReadonlyArray<number> => {
      let result: Array<number> = Int32.codec.encode(value.length) as Array<
        number
      >;
      for (const element of value) {
        result = result.concat(elementCodec.encode(element));
      }
      return result;
    },
    decode: (
      index: number,
      binary: Uint8Array
    ): {
      readonly result: ReadonlyArray<element>;
      readonly nextIndex: number;
    } => {
      const lengthResult: {
        readonly result: number;
        readonly nextIndex: number;
      } = Int32.codec.decode(index, binary);
      index = lengthResult.nextIndex;
      const result: Array<element> = [];
      for (let i = 0; i < lengthResult.result; i += 1) {
        const resultAndNextIndex: {
          readonly result: element;
          readonly nextIndex: number;
        } = elementCodec.decode(index, binary);
        result.push(resultAndNextIndex.result);
        index = resultAndNextIndex.nextIndex;
      }
      return { result: result, nextIndex: index };
    },
  }),
};

/**
 * Id
 */
export const Id: {
  /**
   * バイナリに変換する
   */
  readonly codec: Codec<string>;
} = {
  codec: {
    encode: (value: string): ReadonlyArray<number> => {
      const result: Array<number> = [];
      for (let i = 0; i < 16; i += 1) {
        result[i] = Number.parseInt(value.slice(i * 2, i * 2 + 2), 16);
      }
      return result;
    },
    decode: (
      index: number,
      binary: Uint8Array
    ): { readonly result: string; readonly nextIndex: number } => ({
      result: [...binary.slice(index, index + 16)]
        .map((n: number): string => n.toString(16).padStart(2, "0"))
        .join(""),
      nextIndex: index + 16,
    }),
  },
};

/**
 * Token
 */
export const Token: {
  /**
   * バイナリに変換する
   */
  readonly codec: Codec<string>;
} = {
  codec: {
    encode: (value: string): ReadonlyArray<number> => {
      const result: Array<number> = [];
      for (let i = 0; i < 32; i += 1) {
        result[i] = Number.parseInt(value.slice(i * 2, i * 2 + 2), 16);
      }
      return result;
    },
    decode: (
      index: number,
      binary: Uint8Array
    ): { readonly result: string; readonly nextIndex: number } => ({
      result: [...binary.slice(index, index + 32)]
        .map((n: number): string => n.toString(16).padStart(2, "0"))
        .join(""),
      nextIndex: index + 32,
    }),
  },
};

/**
 * ProjectId
 */
export const ProjectId: {
  /**
   * バイナリに変換する
   */
  readonly codec: Codec<ProjectId>;
} = {
  codec: {
    encode: Id.codec.encode,
    decode: Id.codec.decode as (
      a: number,
      b: Uint8Array
    ) => { readonly result: ProjectId; readonly nextIndex: number },
  },
};

/**
 * UserId
 */
export const UserId: {
  /**
   * バイナリに変換する
   */
  readonly codec: Codec<UserId>;
} = {
  codec: {
    encode: Id.codec.encode,
    decode: Id.codec.decode as (
      a: number,
      b: Uint8Array
    ) => { readonly result: UserId; readonly nextIndex: number },
  },
};

/**
 * IdeaId
 */
export const IdeaId: {
  /**
   * バイナリに変換する
   */
  readonly codec: Codec<IdeaId>;
} = {
  codec: {
    encode: Id.codec.encode,
    decode: Id.codec.decode as (
      a: number,
      b: Uint8Array
    ) => { readonly result: IdeaId; readonly nextIndex: number },
  },
};

/**
 * SuggestionId
 */
export const SuggestionId: {
  /**
   * バイナリに変換する
   */
  readonly codec: Codec<SuggestionId>;
} = {
  codec: {
    encode: Id.codec.encode,
    decode: Id.codec.decode as (
      a: number,
      b: Uint8Array
    ) => { readonly result: SuggestionId; readonly nextIndex: number },
  },
};

/**
 * PartId
 */
export const PartId: {
  /**
   * バイナリに変換する
   */
  readonly codec: Codec<PartId>;
} = {
  codec: {
    encode: Id.codec.encode,
    decode: Id.codec.decode as (
      a: number,
      b: Uint8Array
    ) => { readonly result: PartId; readonly nextIndex: number },
  },
};

/**
 * TypePartId
 */
export const TypePartId: {
  /**
   * バイナリに変換する
   */
  readonly codec: Codec<TypePartId>;
} = {
  codec: {
    encode: Id.codec.encode,
    decode: Id.codec.decode as (
      a: number,
      b: Uint8Array
    ) => { readonly result: TypePartId; readonly nextIndex: number },
  },
};

/**
 * LocalPartId
 */
export const LocalPartId: {
  /**
   * バイナリに変換する
   */
  readonly codec: Codec<LocalPartId>;
} = {
  codec: {
    encode: Id.codec.encode,
    decode: Id.codec.decode as (
      a: number,
      b: Uint8Array
    ) => { readonly result: LocalPartId; readonly nextIndex: number },
  },
};

/**
 * TagId
 */
export const TagId: {
  /**
   * バイナリに変換する
   */
  readonly codec: Codec<TagId>;
} = {
  codec: {
    encode: Id.codec.encode,
    decode: Id.codec.decode as (
      a: number,
      b: Uint8Array
    ) => { readonly result: TagId; readonly nextIndex: number },
  },
};

/**
 * ImageToken
 */
export const ImageToken: {
  /**
   * バイナリに変換する
   */
  readonly codec: Codec<ImageToken>;
} = {
  codec: {
    encode: Token.codec.encode,
    decode: Token.codec.decode as (
      a: number,
      b: Uint8Array
    ) => { readonly result: ImageToken; readonly nextIndex: number },
  },
};

/**
 * AccessToken
 */
export const AccessToken: {
  /**
   * バイナリに変換する
   */
  readonly codec: Codec<AccessToken>;
} = {
  codec: {
    encode: Token.codec.encode,
    decode: Token.codec.decode as (
      a: number,
      b: Uint8Array
    ) => { readonly result: AccessToken; readonly nextIndex: number },
  },
};

/**
 * Maybe. nullableのようなもの. Elmに標準で定義されているものに変換をするためにデフォルトで用意した
 */
export const Maybe: {
  /**
   * 値があるということ
   */
  readonly Just: <value>(a: value) => Maybe<value>;
  /**
   * 値がないということ
   */
  readonly Nothing: <value>() => Maybe<value>;
  readonly codec: <value>(a: Codec<value>) => Codec<Maybe<value>>;
} = {
  Just: <value>(value: value): Maybe<value> => ({ _: "Just", value: value }),
  Nothing: <value>(): Maybe<value> => ({ _: "Nothing" }),
  codec: <value>(valueCodec: Codec<value>): Codec<Maybe<value>> => ({
    encode: (value: Maybe<value>): ReadonlyArray<number> => {
      switch (value._) {
        case "Just": {
          return [0].concat(valueCodec.encode(value.value));
        }
        case "Nothing": {
          return [1];
        }
      }
    },
    decode: (
      index: number,
      binary: Uint8Array
    ): { readonly result: Maybe<value>; readonly nextIndex: number } => {
      const patternIndex: {
        readonly result: number;
        readonly nextIndex: number;
      } = Int32.codec.decode(index, binary);
      if (patternIndex.result === 0) {
        const result: {
          readonly result: value;
          readonly nextIndex: number;
        } = valueCodec.decode(patternIndex.nextIndex, binary);
        return {
          result: Maybe.Just(result.result),
          nextIndex: result.nextIndex,
        };
      }
      if (patternIndex.result === 1) {
        return { result: Maybe.Nothing(), nextIndex: patternIndex.nextIndex };
      }
      throw new Error("存在しないパターンを指定された 型を更新してください");
    },
  }),
};

/**
 * 成功と失敗を表す型. Elmに標準で定義されているものに変換をするためにデフォルトで用意した
 */
export const Result: {
  /**
   * 成功
   */
  readonly Ok: <ok, error>(a: ok) => Result<ok, error>;
  /**
   * 失敗
   */
  readonly Error: <ok, error>(a: error) => Result<ok, error>;
  readonly codec: <ok, error>(
    a: Codec<ok>,
    b: Codec<error>
  ) => Codec<Result<ok, error>>;
} = {
  Ok: <ok, error>(ok: ok): Result<ok, error> => ({ _: "Ok", ok: ok }),
  Error: <ok, error>(error: error): Result<ok, error> => ({
    _: "Error",
    error: error,
  }),
  codec: <ok, error>(
    okCodec: Codec<ok>,
    errorCodec: Codec<error>
  ): Codec<Result<ok, error>> => ({
    encode: (value: Result<ok, error>): ReadonlyArray<number> => {
      switch (value._) {
        case "Ok": {
          return [0].concat(okCodec.encode(value.ok));
        }
        case "Error": {
          return [1].concat(errorCodec.encode(value.error));
        }
      }
    },
    decode: (
      index: number,
      binary: Uint8Array
    ): { readonly result: Result<ok, error>; readonly nextIndex: number } => {
      const patternIndex: {
        readonly result: number;
        readonly nextIndex: number;
      } = Int32.codec.decode(index, binary);
      if (patternIndex.result === 0) {
        const result: {
          readonly result: ok;
          readonly nextIndex: number;
        } = okCodec.decode(patternIndex.nextIndex, binary);
        return {
          result: Result.Ok(result.result),
          nextIndex: result.nextIndex,
        };
      }
      if (patternIndex.result === 1) {
        const result: {
          readonly result: error;
          readonly nextIndex: number;
        } = errorCodec.decode(patternIndex.nextIndex, binary);
        return {
          result: Result.Error(result.result),
          nextIndex: result.nextIndex,
        };
      }
      throw new Error("存在しないパターンを指定された 型を更新してください");
    },
  }),
};

/**
 * 日時. 0001-01-01T00:00:00.000Z to 9999-12-31T23:59:59.999Z 最小単位はミリ秒. ミリ秒の求め方は day*1000*60*60*24 + millisecond
 */
export const Time: { readonly codec: Codec<Time> } = {
  codec: {
    encode: (value: Time): ReadonlyArray<number> =>
      Int32.codec
        .encode(value.day)
        .concat(Int32.codec.encode(value.millisecond)),
    decode: (
      index: number,
      binary: Uint8Array
    ): { readonly result: Time; readonly nextIndex: number } => {
      const dayAndNextIndex: {
        readonly result: number;
        readonly nextIndex: number;
      } = Int32.codec.decode(index, binary);
      const millisecondAndNextIndex: {
        readonly result: number;
        readonly nextIndex: number;
      } = Int32.codec.decode(dayAndNextIndex.nextIndex, binary);
      return {
        result: {
          day: dayAndNextIndex.result,
          millisecond: millisecondAndNextIndex.result,
        },
        nextIndex: millisecondAndNextIndex.nextIndex,
      };
    },
  },
};

/**
 * ログインのURLを発行するために必要なデータ
 */
export const RequestLogInUrlRequestData: {
  readonly codec: Codec<RequestLogInUrlRequestData>;
} = {
  codec: {
    encode: (value: RequestLogInUrlRequestData): ReadonlyArray<number> =>
      OpenIdConnectProvider.codec
        .encode(value.openIdConnectProvider)
        .concat(UrlData.codec.encode(value.urlData)),
    decode: (
      index: number,
      binary: Uint8Array
    ): {
      readonly result: RequestLogInUrlRequestData;
      readonly nextIndex: number;
    } => {
      const openIdConnectProviderAndNextIndex: {
        readonly result: OpenIdConnectProvider;
        readonly nextIndex: number;
      } = OpenIdConnectProvider.codec.decode(index, binary);
      const urlDataAndNextIndex: {
        readonly result: UrlData;
        readonly nextIndex: number;
      } = UrlData.codec.decode(
        openIdConnectProviderAndNextIndex.nextIndex,
        binary
      );
      return {
        result: {
          openIdConnectProvider: openIdConnectProviderAndNextIndex.result,
          urlData: urlDataAndNextIndex.result,
        },
        nextIndex: urlDataAndNextIndex.nextIndex,
      };
    },
  },
};

/**
 * ソーシャルログインを提供するプロバイダー (例: Google, GitHub)
 */
export const OpenIdConnectProvider: {
  /**
   * Google ( https://developers.google.com/identity/sign-in/web/ )
   */
  readonly Google: OpenIdConnectProvider;
  /**
   * GitHub ( https://developer.github.com/v3/guides/basics-of-authentication/ )
   */
  readonly GitHub: OpenIdConnectProvider;
  readonly codec: Codec<OpenIdConnectProvider>;
} = {
  Google: "Google",
  GitHub: "GitHub",
  codec: {
    encode: (value: OpenIdConnectProvider): ReadonlyArray<number> => {
      switch (value) {
        case "Google": {
          return [0];
        }
        case "GitHub": {
          return [1];
        }
      }
    },
    decode: (
      index: number,
      binary: Uint8Array
    ): {
      readonly result: OpenIdConnectProvider;
      readonly nextIndex: number;
    } => {
      const patternIndex: {
        readonly result: number;
        readonly nextIndex: number;
      } = Int32.codec.decode(index, binary);
      if (patternIndex.result === 0) {
        return {
          result: OpenIdConnectProvider.Google,
          nextIndex: patternIndex.nextIndex,
        };
      }
      if (patternIndex.result === 1) {
        return {
          result: OpenIdConnectProvider.GitHub,
          nextIndex: patternIndex.nextIndex,
        };
      }
      throw new Error("存在しないパターンを指定された 型を更新してください");
    },
  },
};

/**
 * デバッグモードかどうか,言語とページの場所. URLとして表現されるデータ. Googleなどの検索エンジンの都合( https://support.google.com/webmasters/answer/182192?hl=ja )で,URLにページの言語を入れて,言語ごとに別のURLである必要がある. デバッグ時のホスト名は http://localhost になる
 */
export const UrlData: { readonly codec: Codec<UrlData> } = {
  codec: {
    encode: (value: UrlData): ReadonlyArray<number> =>
      ClientMode.codec
        .encode(value.clientMode)
        .concat(Location.codec.encode(value.location))
        .concat(Language.codec.encode(value.language)),
    decode: (
      index: number,
      binary: Uint8Array
    ): { readonly result: UrlData; readonly nextIndex: number } => {
      const clientModeAndNextIndex: {
        readonly result: ClientMode;
        readonly nextIndex: number;
      } = ClientMode.codec.decode(index, binary);
      const locationAndNextIndex: {
        readonly result: Location;
        readonly nextIndex: number;
      } = Location.codec.decode(clientModeAndNextIndex.nextIndex, binary);
      const languageAndNextIndex: {
        readonly result: Language;
        readonly nextIndex: number;
      } = Language.codec.decode(locationAndNextIndex.nextIndex, binary);
      return {
        result: {
          clientMode: clientModeAndNextIndex.result,
          location: locationAndNextIndex.result,
          language: languageAndNextIndex.result,
        },
        nextIndex: languageAndNextIndex.nextIndex,
      };
    },
  },
};

/**
 * デバッグモードか, リリースモード
 */
export const ClientMode: {
  /**
   * デバッグモード. オリジンは http://localshot:2520
   */
  readonly DebugMode: ClientMode;
  /**
   * リリースモード. オリジンは https://definy.app
   */
  readonly Release: ClientMode;
  readonly codec: Codec<ClientMode>;
} = {
  DebugMode: "DebugMode",
  Release: "Release",
  codec: {
    encode: (value: ClientMode): ReadonlyArray<number> => {
      switch (value) {
        case "DebugMode": {
          return [0];
        }
        case "Release": {
          return [1];
        }
      }
    },
    decode: (
      index: number,
      binary: Uint8Array
    ): { readonly result: ClientMode; readonly nextIndex: number } => {
      const patternIndex: {
        readonly result: number;
        readonly nextIndex: number;
      } = Int32.codec.decode(index, binary);
      if (patternIndex.result === 0) {
        return {
          result: ClientMode.DebugMode,
          nextIndex: patternIndex.nextIndex,
        };
      }
      if (patternIndex.result === 1) {
        return {
          result: ClientMode.Release,
          nextIndex: patternIndex.nextIndex,
        };
      }
      throw new Error("存在しないパターンを指定された 型を更新してください");
    },
  },
};

/**
 * DefinyWebアプリ内での場所を示すもの. URLから求められる. URLに変換できる
 */
export const Location: {
  /**
   * 最初のページ
   */
  readonly Home: Location;
  /**
   * プロジェクト作成画面
   */
  readonly CreateProject: Location;
  /**
   * プロジェクトの詳細ページ
   */
  readonly Project: (a: ProjectId) => Location;
  /**
   * ユーザーの詳細ページ
   */
  readonly User: (a: UserId) => Location;
  /**
   * アイデア詳細ページ
   */
  readonly Idea: (a: IdeaId) => Location;
  /**
   * 提案のページ
   */
  readonly Suggestion: (a: SuggestionId) => Location;
  /**
   * Definyについて説明したページ
   */
  readonly About: Location;
  /**
   * デバッグページ
   */
  readonly Debug: Location;
  readonly codec: Codec<Location>;
} = {
  Home: { _: "Home" },
  CreateProject: { _: "CreateProject" },
  Project: (projectId: ProjectId): Location => ({
    _: "Project",
    projectId: projectId,
  }),
  User: (userId: UserId): Location => ({ _: "User", userId: userId }),
  Idea: (ideaId: IdeaId): Location => ({ _: "Idea", ideaId: ideaId }),
  Suggestion: (suggestionId: SuggestionId): Location => ({
    _: "Suggestion",
    suggestionId: suggestionId,
  }),
  About: { _: "About" },
  Debug: { _: "Debug" },
  codec: {
    encode: (value: Location): ReadonlyArray<number> => {
      switch (value._) {
        case "Home": {
          return [0];
        }
        case "CreateProject": {
          return [1];
        }
        case "Project": {
          return [2].concat(ProjectId.codec.encode(value.projectId));
        }
        case "User": {
          return [3].concat(UserId.codec.encode(value.userId));
        }
        case "Idea": {
          return [4].concat(IdeaId.codec.encode(value.ideaId));
        }
        case "Suggestion": {
          return [5].concat(SuggestionId.codec.encode(value.suggestionId));
        }
        case "About": {
          return [6];
        }
        case "Debug": {
          return [7];
        }
      }
    },
    decode: (
      index: number,
      binary: Uint8Array
    ): { readonly result: Location; readonly nextIndex: number } => {
      const patternIndex: {
        readonly result: number;
        readonly nextIndex: number;
      } = Int32.codec.decode(index, binary);
      if (patternIndex.result === 0) {
        return { result: Location.Home, nextIndex: patternIndex.nextIndex };
      }
      if (patternIndex.result === 1) {
        return {
          result: Location.CreateProject,
          nextIndex: patternIndex.nextIndex,
        };
      }
      if (patternIndex.result === 2) {
        const result: {
          readonly result: ProjectId;
          readonly nextIndex: number;
        } = ProjectId.codec.decode(patternIndex.nextIndex, binary);
        return {
          result: Location.Project(result.result),
          nextIndex: result.nextIndex,
        };
      }
      if (patternIndex.result === 3) {
        const result: {
          readonly result: UserId;
          readonly nextIndex: number;
        } = UserId.codec.decode(patternIndex.nextIndex, binary);
        return {
          result: Location.User(result.result),
          nextIndex: result.nextIndex,
        };
      }
      if (patternIndex.result === 4) {
        const result: {
          readonly result: IdeaId;
          readonly nextIndex: number;
        } = IdeaId.codec.decode(patternIndex.nextIndex, binary);
        return {
          result: Location.Idea(result.result),
          nextIndex: result.nextIndex,
        };
      }
      if (patternIndex.result === 5) {
        const result: {
          readonly result: SuggestionId;
          readonly nextIndex: number;
        } = SuggestionId.codec.decode(patternIndex.nextIndex, binary);
        return {
          result: Location.Suggestion(result.result),
          nextIndex: result.nextIndex,
        };
      }
      if (patternIndex.result === 6) {
        return { result: Location.About, nextIndex: patternIndex.nextIndex };
      }
      if (patternIndex.result === 7) {
        return { result: Location.Debug, nextIndex: patternIndex.nextIndex };
      }
      throw new Error("存在しないパターンを指定された 型を更新してください");
    },
  },
};

/**
 * 英語,日本語,エスペラント語などの言語
 */
export const Language: {
  /**
   * 日本語
   */
  readonly Japanese: Language;
  /**
   * 英語
   */
  readonly English: Language;
  /**
   * エスペラント語
   */
  readonly Esperanto: Language;
  readonly codec: Codec<Language>;
} = {
  Japanese: "Japanese",
  English: "English",
  Esperanto: "Esperanto",
  codec: {
    encode: (value: Language): ReadonlyArray<number> => {
      switch (value) {
        case "Japanese": {
          return [0];
        }
        case "English": {
          return [1];
        }
        case "Esperanto": {
          return [2];
        }
      }
    },
    decode: (
      index: number,
      binary: Uint8Array
    ): { readonly result: Language; readonly nextIndex: number } => {
      const patternIndex: {
        readonly result: number;
        readonly nextIndex: number;
      } = Int32.codec.decode(index, binary);
      if (patternIndex.result === 0) {
        return { result: Language.Japanese, nextIndex: patternIndex.nextIndex };
      }
      if (patternIndex.result === 1) {
        return { result: Language.English, nextIndex: patternIndex.nextIndex };
      }
      if (patternIndex.result === 2) {
        return {
          result: Language.Esperanto,
          nextIndex: patternIndex.nextIndex,
        };
      }
      throw new Error("存在しないパターンを指定された 型を更新してください");
    },
  },
};

/**
 * ユーザーのデータのスナップショット
 */
export const User: { readonly codec: Codec<User> } = {
  codec: {
    encode: (value: User): ReadonlyArray<number> =>
      String.codec
        .encode(value.name)
        .concat(ImageToken.codec.encode(value.imageHash))
        .concat(String.codec.encode(value.introduction))
        .concat(Time.codec.encode(value.createTime))
        .concat(List.codec(ProjectId.codec).encode(value.likeProjectIdList))
        .concat(List.codec(ProjectId.codec).encode(value.developProjectIdList))
        .concat(List.codec(IdeaId.codec).encode(value.commentIdeaIdList))
        .concat(Time.codec.encode(value.getTime)),
    decode: (
      index: number,
      binary: Uint8Array
    ): { readonly result: User; readonly nextIndex: number } => {
      const nameAndNextIndex: {
        readonly result: string;
        readonly nextIndex: number;
      } = String.codec.decode(index, binary);
      const imageHashAndNextIndex: {
        readonly result: ImageToken;
        readonly nextIndex: number;
      } = ImageToken.codec.decode(nameAndNextIndex.nextIndex, binary);
      const introductionAndNextIndex: {
        readonly result: string;
        readonly nextIndex: number;
      } = String.codec.decode(imageHashAndNextIndex.nextIndex, binary);
      const createTimeAndNextIndex: {
        readonly result: Time;
        readonly nextIndex: number;
      } = Time.codec.decode(introductionAndNextIndex.nextIndex, binary);
      const likeProjectIdListAndNextIndex: {
        readonly result: ReadonlyArray<ProjectId>;
        readonly nextIndex: number;
      } = List.codec(ProjectId.codec).decode(
        createTimeAndNextIndex.nextIndex,
        binary
      );
      const developProjectIdListAndNextIndex: {
        readonly result: ReadonlyArray<ProjectId>;
        readonly nextIndex: number;
      } = List.codec(ProjectId.codec).decode(
        likeProjectIdListAndNextIndex.nextIndex,
        binary
      );
      const commentIdeaIdListAndNextIndex: {
        readonly result: ReadonlyArray<IdeaId>;
        readonly nextIndex: number;
      } = List.codec(IdeaId.codec).decode(
        developProjectIdListAndNextIndex.nextIndex,
        binary
      );
      const getTimeAndNextIndex: {
        readonly result: Time;
        readonly nextIndex: number;
      } = Time.codec.decode(commentIdeaIdListAndNextIndex.nextIndex, binary);
      return {
        result: {
          name: nameAndNextIndex.result,
          imageHash: imageHashAndNextIndex.result,
          introduction: introductionAndNextIndex.result,
          createTime: createTimeAndNextIndex.result,
          likeProjectIdList: likeProjectIdListAndNextIndex.result,
          developProjectIdList: developProjectIdListAndNextIndex.result,
          commentIdeaIdList: commentIdeaIdListAndNextIndex.result,
          getTime: getTimeAndNextIndex.result,
        },
        nextIndex: getTimeAndNextIndex.nextIndex,
      };
    },
  },
};

/**
 * データを識別するIdとデータ
 */
export const IdAndData: {
  readonly codec: <id, data>(
    a: Codec<id>,
    b: Codec<data>
  ) => Codec<IdAndData<id, data>>;
} = {
  codec: <id, data>(
    idCodec: Codec<id>,
    dataCodec: Codec<data>
  ): Codec<IdAndData<id, data>> => ({
    encode: (value: IdAndData<id, data>): ReadonlyArray<number> =>
      idCodec.encode(value.id).concat(dataCodec.encode(value.data)),
    decode: (
      index: number,
      binary: Uint8Array
    ): { readonly result: IdAndData<id, data>; readonly nextIndex: number } => {
      const idAndNextIndex: {
        readonly result: id;
        readonly nextIndex: number;
      } = idCodec.decode(index, binary);
      const dataAndNextIndex: {
        readonly result: data;
        readonly nextIndex: number;
      } = dataCodec.decode(idAndNextIndex.nextIndex, binary);
      return {
        result: { id: idAndNextIndex.result, data: dataAndNextIndex.result },
        nextIndex: dataAndNextIndex.nextIndex,
      };
    },
  }),
};

/**
 * プロジェクト
 */
export const Project: { readonly codec: Codec<Project> } = {
  codec: {
    encode: (value: Project): ReadonlyArray<number> =>
      String.codec
        .encode(value.name)
        .concat(ImageToken.codec.encode(value.iconHash))
        .concat(ImageToken.codec.encode(value.imageHash))
        .concat(Time.codec.encode(value.createTime))
        .concat(UserId.codec.encode(value.createUserId))
        .concat(Time.codec.encode(value.updateTime))
        .concat(Time.codec.encode(value.getTime))
        .concat(List.codec(PartId.codec).encode(value.partIdList))
        .concat(List.codec(TypePartId.codec).encode(value.typePartIdList)),
    decode: (
      index: number,
      binary: Uint8Array
    ): { readonly result: Project; readonly nextIndex: number } => {
      const nameAndNextIndex: {
        readonly result: string;
        readonly nextIndex: number;
      } = String.codec.decode(index, binary);
      const iconHashAndNextIndex: {
        readonly result: ImageToken;
        readonly nextIndex: number;
      } = ImageToken.codec.decode(nameAndNextIndex.nextIndex, binary);
      const imageHashAndNextIndex: {
        readonly result: ImageToken;
        readonly nextIndex: number;
      } = ImageToken.codec.decode(iconHashAndNextIndex.nextIndex, binary);
      const createTimeAndNextIndex: {
        readonly result: Time;
        readonly nextIndex: number;
      } = Time.codec.decode(imageHashAndNextIndex.nextIndex, binary);
      const createUserIdAndNextIndex: {
        readonly result: UserId;
        readonly nextIndex: number;
      } = UserId.codec.decode(createTimeAndNextIndex.nextIndex, binary);
      const updateTimeAndNextIndex: {
        readonly result: Time;
        readonly nextIndex: number;
      } = Time.codec.decode(createUserIdAndNextIndex.nextIndex, binary);
      const getTimeAndNextIndex: {
        readonly result: Time;
        readonly nextIndex: number;
      } = Time.codec.decode(updateTimeAndNextIndex.nextIndex, binary);
      const partIdListAndNextIndex: {
        readonly result: ReadonlyArray<PartId>;
        readonly nextIndex: number;
      } = List.codec(PartId.codec).decode(
        getTimeAndNextIndex.nextIndex,
        binary
      );
      const typePartIdListAndNextIndex: {
        readonly result: ReadonlyArray<TypePartId>;
        readonly nextIndex: number;
      } = List.codec(TypePartId.codec).decode(
        partIdListAndNextIndex.nextIndex,
        binary
      );
      return {
        result: {
          name: nameAndNextIndex.result,
          iconHash: iconHashAndNextIndex.result,
          imageHash: imageHashAndNextIndex.result,
          createTime: createTimeAndNextIndex.result,
          createUserId: createUserIdAndNextIndex.result,
          updateTime: updateTimeAndNextIndex.result,
          getTime: getTimeAndNextIndex.result,
          partIdList: partIdListAndNextIndex.result,
          typePartIdList: typePartIdListAndNextIndex.result,
        },
        nextIndex: typePartIdListAndNextIndex.nextIndex,
      };
    },
  },
};

/**
 * アイデア
 */
export const Idea: { readonly codec: Codec<Idea> } = {
  codec: {
    encode: (value: Idea): ReadonlyArray<number> =>
      String.codec
        .encode(value.name)
        .concat(UserId.codec.encode(value.createUserId))
        .concat(Time.codec.encode(value.createTime))
        .concat(ProjectId.codec.encode(value.projectId))
        .concat(List.codec(IdeaItem.codec).encode(value.itemList))
        .concat(Time.codec.encode(value.updateTime))
        .concat(Time.codec.encode(value.getTime)),
    decode: (
      index: number,
      binary: Uint8Array
    ): { readonly result: Idea; readonly nextIndex: number } => {
      const nameAndNextIndex: {
        readonly result: string;
        readonly nextIndex: number;
      } = String.codec.decode(index, binary);
      const createUserIdAndNextIndex: {
        readonly result: UserId;
        readonly nextIndex: number;
      } = UserId.codec.decode(nameAndNextIndex.nextIndex, binary);
      const createTimeAndNextIndex: {
        readonly result: Time;
        readonly nextIndex: number;
      } = Time.codec.decode(createUserIdAndNextIndex.nextIndex, binary);
      const projectIdAndNextIndex: {
        readonly result: ProjectId;
        readonly nextIndex: number;
      } = ProjectId.codec.decode(createTimeAndNextIndex.nextIndex, binary);
      const itemListAndNextIndex: {
        readonly result: ReadonlyArray<IdeaItem>;
        readonly nextIndex: number;
      } = List.codec(IdeaItem.codec).decode(
        projectIdAndNextIndex.nextIndex,
        binary
      );
      const updateTimeAndNextIndex: {
        readonly result: Time;
        readonly nextIndex: number;
      } = Time.codec.decode(itemListAndNextIndex.nextIndex, binary);
      const getTimeAndNextIndex: {
        readonly result: Time;
        readonly nextIndex: number;
      } = Time.codec.decode(updateTimeAndNextIndex.nextIndex, binary);
      return {
        result: {
          name: nameAndNextIndex.result,
          createUserId: createUserIdAndNextIndex.result,
          createTime: createTimeAndNextIndex.result,
          projectId: projectIdAndNextIndex.result,
          itemList: itemListAndNextIndex.result,
          updateTime: updateTimeAndNextIndex.result,
          getTime: getTimeAndNextIndex.result,
        },
        nextIndex: getTimeAndNextIndex.nextIndex,
      };
    },
  },
};

/**
 * アイデアのコメント
 */
export const IdeaItem: { readonly codec: Codec<IdeaItem> } = {
  codec: {
    encode: (value: IdeaItem): ReadonlyArray<number> =>
      UserId.codec
        .encode(value.createUserId)
        .concat(Time.codec.encode(value.createTime))
        .concat(ItemBody.codec.encode(value.body)),
    decode: (
      index: number,
      binary: Uint8Array
    ): { readonly result: IdeaItem; readonly nextIndex: number } => {
      const createUserIdAndNextIndex: {
        readonly result: UserId;
        readonly nextIndex: number;
      } = UserId.codec.decode(index, binary);
      const createTimeAndNextIndex: {
        readonly result: Time;
        readonly nextIndex: number;
      } = Time.codec.decode(createUserIdAndNextIndex.nextIndex, binary);
      const bodyAndNextIndex: {
        readonly result: ItemBody;
        readonly nextIndex: number;
      } = ItemBody.codec.decode(createTimeAndNextIndex.nextIndex, binary);
      return {
        result: {
          createUserId: createUserIdAndNextIndex.result,
          createTime: createTimeAndNextIndex.result,
          body: bodyAndNextIndex.result,
        },
        nextIndex: bodyAndNextIndex.nextIndex,
      };
    },
  },
};

/**
 * アイデアのアイテム
 */
export const ItemBody: {
  /**
   * 文章でのコメントをした
   */
  readonly Comment: (a: string) => ItemBody;
  /**
   * 提案を作成した
   */
  readonly SuggestionCreate: (a: SuggestionId) => ItemBody;
  /**
   * 提案を承認待ちにした
   */
  readonly SuggestionToApprovalPending: (a: SuggestionId) => ItemBody;
  /**
   * 承認待ちをキャンセルした
   */
  readonly SuggestionCancelToApprovalPending: (a: SuggestionId) => ItemBody;
  /**
   * 提案を承認した
   */
  readonly SuggestionApprove: (a: SuggestionId) => ItemBody;
  /**
   * 提案を拒否した
   */
  readonly SuggestionReject: (a: SuggestionId) => ItemBody;
  /**
   * 提案の拒否をキャンセルした
   */
  readonly SuggestionCancelRejection: (a: SuggestionId) => ItemBody;
  readonly codec: Codec<ItemBody>;
} = {
  Comment: (string_: string): ItemBody => ({ _: "Comment", string_: string_ }),
  SuggestionCreate: (suggestionId: SuggestionId): ItemBody => ({
    _: "SuggestionCreate",
    suggestionId: suggestionId,
  }),
  SuggestionToApprovalPending: (suggestionId: SuggestionId): ItemBody => ({
    _: "SuggestionToApprovalPending",
    suggestionId: suggestionId,
  }),
  SuggestionCancelToApprovalPending: (
    suggestionId: SuggestionId
  ): ItemBody => ({
    _: "SuggestionCancelToApprovalPending",
    suggestionId: suggestionId,
  }),
  SuggestionApprove: (suggestionId: SuggestionId): ItemBody => ({
    _: "SuggestionApprove",
    suggestionId: suggestionId,
  }),
  SuggestionReject: (suggestionId: SuggestionId): ItemBody => ({
    _: "SuggestionReject",
    suggestionId: suggestionId,
  }),
  SuggestionCancelRejection: (suggestionId: SuggestionId): ItemBody => ({
    _: "SuggestionCancelRejection",
    suggestionId: suggestionId,
  }),
  codec: {
    encode: (value: ItemBody): ReadonlyArray<number> => {
      switch (value._) {
        case "Comment": {
          return [0].concat(String.codec.encode(value.string_));
        }
        case "SuggestionCreate": {
          return [1].concat(SuggestionId.codec.encode(value.suggestionId));
        }
        case "SuggestionToApprovalPending": {
          return [2].concat(SuggestionId.codec.encode(value.suggestionId));
        }
        case "SuggestionCancelToApprovalPending": {
          return [3].concat(SuggestionId.codec.encode(value.suggestionId));
        }
        case "SuggestionApprove": {
          return [4].concat(SuggestionId.codec.encode(value.suggestionId));
        }
        case "SuggestionReject": {
          return [5].concat(SuggestionId.codec.encode(value.suggestionId));
        }
        case "SuggestionCancelRejection": {
          return [6].concat(SuggestionId.codec.encode(value.suggestionId));
        }
      }
    },
    decode: (
      index: number,
      binary: Uint8Array
    ): { readonly result: ItemBody; readonly nextIndex: number } => {
      const patternIndex: {
        readonly result: number;
        readonly nextIndex: number;
      } = Int32.codec.decode(index, binary);
      if (patternIndex.result === 0) {
        const result: {
          readonly result: string;
          readonly nextIndex: number;
        } = String.codec.decode(patternIndex.nextIndex, binary);
        return {
          result: ItemBody.Comment(result.result),
          nextIndex: result.nextIndex,
        };
      }
      if (patternIndex.result === 1) {
        const result: {
          readonly result: SuggestionId;
          readonly nextIndex: number;
        } = SuggestionId.codec.decode(patternIndex.nextIndex, binary);
        return {
          result: ItemBody.SuggestionCreate(result.result),
          nextIndex: result.nextIndex,
        };
      }
      if (patternIndex.result === 2) {
        const result: {
          readonly result: SuggestionId;
          readonly nextIndex: number;
        } = SuggestionId.codec.decode(patternIndex.nextIndex, binary);
        return {
          result: ItemBody.SuggestionToApprovalPending(result.result),
          nextIndex: result.nextIndex,
        };
      }
      if (patternIndex.result === 3) {
        const result: {
          readonly result: SuggestionId;
          readonly nextIndex: number;
        } = SuggestionId.codec.decode(patternIndex.nextIndex, binary);
        return {
          result: ItemBody.SuggestionCancelToApprovalPending(result.result),
          nextIndex: result.nextIndex,
        };
      }
      if (patternIndex.result === 4) {
        const result: {
          readonly result: SuggestionId;
          readonly nextIndex: number;
        } = SuggestionId.codec.decode(patternIndex.nextIndex, binary);
        return {
          result: ItemBody.SuggestionApprove(result.result),
          nextIndex: result.nextIndex,
        };
      }
      if (patternIndex.result === 5) {
        const result: {
          readonly result: SuggestionId;
          readonly nextIndex: number;
        } = SuggestionId.codec.decode(patternIndex.nextIndex, binary);
        return {
          result: ItemBody.SuggestionReject(result.result),
          nextIndex: result.nextIndex,
        };
      }
      if (patternIndex.result === 6) {
        const result: {
          readonly result: SuggestionId;
          readonly nextIndex: number;
        } = SuggestionId.codec.decode(patternIndex.nextIndex, binary);
        return {
          result: ItemBody.SuggestionCancelRejection(result.result),
          nextIndex: result.nextIndex,
        };
      }
      throw new Error("存在しないパターンを指定された 型を更新してください");
    },
  },
};

/**
 * 提案
 */
export const Suggestion: { readonly codec: Codec<Suggestion> } = {
  codec: {
    encode: (value: Suggestion): ReadonlyArray<number> =>
      String.codec
        .encode(value.name)
        .concat(UserId.codec.encode(value.createUserId))
        .concat(String.codec.encode(value.reason))
        .concat(SuggestionState.codec.encode(value.state))
        .concat(List.codec(Change.codec).encode(value.changeList))
        .concat(ProjectId.codec.encode(value.projectId))
        .concat(IdeaId.codec.encode(value.ideaId))
        .concat(Time.codec.encode(value.updateTime))
        .concat(Time.codec.encode(value.getTime)),
    decode: (
      index: number,
      binary: Uint8Array
    ): { readonly result: Suggestion; readonly nextIndex: number } => {
      const nameAndNextIndex: {
        readonly result: string;
        readonly nextIndex: number;
      } = String.codec.decode(index, binary);
      const createUserIdAndNextIndex: {
        readonly result: UserId;
        readonly nextIndex: number;
      } = UserId.codec.decode(nameAndNextIndex.nextIndex, binary);
      const reasonAndNextIndex: {
        readonly result: string;
        readonly nextIndex: number;
      } = String.codec.decode(createUserIdAndNextIndex.nextIndex, binary);
      const stateAndNextIndex: {
        readonly result: SuggestionState;
        readonly nextIndex: number;
      } = SuggestionState.codec.decode(reasonAndNextIndex.nextIndex, binary);
      const changeListAndNextIndex: {
        readonly result: ReadonlyArray<Change>;
        readonly nextIndex: number;
      } = List.codec(Change.codec).decode(stateAndNextIndex.nextIndex, binary);
      const projectIdAndNextIndex: {
        readonly result: ProjectId;
        readonly nextIndex: number;
      } = ProjectId.codec.decode(changeListAndNextIndex.nextIndex, binary);
      const ideaIdAndNextIndex: {
        readonly result: IdeaId;
        readonly nextIndex: number;
      } = IdeaId.codec.decode(projectIdAndNextIndex.nextIndex, binary);
      const updateTimeAndNextIndex: {
        readonly result: Time;
        readonly nextIndex: number;
      } = Time.codec.decode(ideaIdAndNextIndex.nextIndex, binary);
      const getTimeAndNextIndex: {
        readonly result: Time;
        readonly nextIndex: number;
      } = Time.codec.decode(updateTimeAndNextIndex.nextIndex, binary);
      return {
        result: {
          name: nameAndNextIndex.result,
          createUserId: createUserIdAndNextIndex.result,
          reason: reasonAndNextIndex.result,
          state: stateAndNextIndex.result,
          changeList: changeListAndNextIndex.result,
          projectId: projectIdAndNextIndex.result,
          ideaId: ideaIdAndNextIndex.result,
          updateTime: updateTimeAndNextIndex.result,
          getTime: getTimeAndNextIndex.result,
        },
        nextIndex: getTimeAndNextIndex.nextIndex,
      };
    },
  },
};

/**
 * 提案の状況
 */
export const SuggestionState: {
  /**
   * 作成中
   */
  readonly Creating: SuggestionState;
  /**
   * 承認待ち
   */
  readonly ApprovalPending: SuggestionState;
  /**
   * 承認済み
   */
  readonly Approved: SuggestionState;
  /**
   * 拒否された
   */
  readonly Rejected: SuggestionState;
  readonly codec: Codec<SuggestionState>;
} = {
  Creating: "Creating",
  ApprovalPending: "ApprovalPending",
  Approved: "Approved",
  Rejected: "Rejected",
  codec: {
    encode: (value: SuggestionState): ReadonlyArray<number> => {
      switch (value) {
        case "Creating": {
          return [0];
        }
        case "ApprovalPending": {
          return [1];
        }
        case "Approved": {
          return [2];
        }
        case "Rejected": {
          return [3];
        }
      }
    },
    decode: (
      index: number,
      binary: Uint8Array
    ): { readonly result: SuggestionState; readonly nextIndex: number } => {
      const patternIndex: {
        readonly result: number;
        readonly nextIndex: number;
      } = Int32.codec.decode(index, binary);
      if (patternIndex.result === 0) {
        return {
          result: SuggestionState.Creating,
          nextIndex: patternIndex.nextIndex,
        };
      }
      if (patternIndex.result === 1) {
        return {
          result: SuggestionState.ApprovalPending,
          nextIndex: patternIndex.nextIndex,
        };
      }
      if (patternIndex.result === 2) {
        return {
          result: SuggestionState.Approved,
          nextIndex: patternIndex.nextIndex,
        };
      }
      if (patternIndex.result === 3) {
        return {
          result: SuggestionState.Rejected,
          nextIndex: patternIndex.nextIndex,
        };
      }
      throw new Error("存在しないパターンを指定された 型を更新してください");
    },
  },
};

/**
 * 変更点
 */
export const Change: {
  /**
   * プロジェクト名の変更
   */
  readonly ProjectName: (a: string) => Change;
  /**
   * パーツの追加
   */
  readonly AddPart: (a: AddPart) => Change;
  readonly codec: Codec<Change>;
} = {
  ProjectName: (string_: string): Change => ({
    _: "ProjectName",
    string_: string_,
  }),
  AddPart: (addPart: AddPart): Change => ({ _: "AddPart", addPart: addPart }),
  codec: {
    encode: (value: Change): ReadonlyArray<number> => {
      switch (value._) {
        case "ProjectName": {
          return [0].concat(String.codec.encode(value.string_));
        }
        case "AddPart": {
          return [1].concat(AddPart.codec.encode(value.addPart));
        }
      }
    },
    decode: (
      index: number,
      binary: Uint8Array
    ): { readonly result: Change; readonly nextIndex: number } => {
      const patternIndex: {
        readonly result: number;
        readonly nextIndex: number;
      } = Int32.codec.decode(index, binary);
      if (patternIndex.result === 0) {
        const result: {
          readonly result: string;
          readonly nextIndex: number;
        } = String.codec.decode(patternIndex.nextIndex, binary);
        return {
          result: Change.ProjectName(result.result),
          nextIndex: result.nextIndex,
        };
      }
      if (patternIndex.result === 1) {
        const result: {
          readonly result: AddPart;
          readonly nextIndex: number;
        } = AddPart.codec.decode(patternIndex.nextIndex, binary);
        return {
          result: Change.AddPart(result.result),
          nextIndex: result.nextIndex,
        };
      }
      throw new Error("存在しないパターンを指定された 型を更新してください");
    },
  },
};

/**
 * パーツを追加するのに必要なもの
 */
export const AddPart: { readonly codec: Codec<AddPart> } = {
  codec: {
    encode: (value: AddPart): ReadonlyArray<number> =>
      Int32.codec
        .encode(value.id)
        .concat(String.codec.encode(value.name))
        .concat(String.codec.encode(value.description))
        .concat(SuggestionType.codec.encode(value["type"]))
        .concat(SuggestionExpr.codec.encode(value.expr)),
    decode: (
      index: number,
      binary: Uint8Array
    ): { readonly result: AddPart; readonly nextIndex: number } => {
      const idAndNextIndex: {
        readonly result: number;
        readonly nextIndex: number;
      } = Int32.codec.decode(index, binary);
      const nameAndNextIndex: {
        readonly result: string;
        readonly nextIndex: number;
      } = String.codec.decode(idAndNextIndex.nextIndex, binary);
      const descriptionAndNextIndex: {
        readonly result: string;
        readonly nextIndex: number;
      } = String.codec.decode(nameAndNextIndex.nextIndex, binary);
      const typeAndNextIndex: {
        readonly result: SuggestionType;
        readonly nextIndex: number;
      } = SuggestionType.codec.decode(
        descriptionAndNextIndex.nextIndex,
        binary
      );
      const exprAndNextIndex: {
        readonly result: SuggestionExpr;
        readonly nextIndex: number;
      } = SuggestionExpr.codec.decode(typeAndNextIndex.nextIndex, binary);
      return {
        result: {
          id: idAndNextIndex.result,
          name: nameAndNextIndex.result,
          description: descriptionAndNextIndex.result,
          type: typeAndNextIndex.result,
          expr: exprAndNextIndex.result,
        },
        nextIndex: exprAndNextIndex.nextIndex,
      };
    },
  },
};

/**
 * ChangeのAddPartなどで使われる提案で作成した型を使えるType
 */
export const SuggestionType: {
  /**
   * 関数
   */
  readonly Function: (a: SuggestionTypeInputAndOutput) => SuggestionType;
  /**
   * 提案前に作られた型パーツとパラメーター
   */
  readonly TypePartWithParameter: (
    a: TypePartWithSuggestionTypeParameter
  ) => SuggestionType;
  /**
   * 提案時に作られた型パーツとパラメーター
   */
  readonly SuggestionTypePartWithParameter: (
    a: SuggestionTypePartWithSuggestionTypeParameter
  ) => SuggestionType;
  readonly codec: Codec<SuggestionType>;
} = {
  Function: (
    suggestionTypeInputAndOutput: SuggestionTypeInputAndOutput
  ): SuggestionType => ({
    _: "Function",
    suggestionTypeInputAndOutput: suggestionTypeInputAndOutput,
  }),
  TypePartWithParameter: (
    typePartWithSuggestionTypeParameter: TypePartWithSuggestionTypeParameter
  ): SuggestionType => ({
    _: "TypePartWithParameter",
    typePartWithSuggestionTypeParameter: typePartWithSuggestionTypeParameter,
  }),
  SuggestionTypePartWithParameter: (
    suggestionTypePartWithSuggestionTypeParameter: SuggestionTypePartWithSuggestionTypeParameter
  ): SuggestionType => ({
    _: "SuggestionTypePartWithParameter",
    suggestionTypePartWithSuggestionTypeParameter: suggestionTypePartWithSuggestionTypeParameter,
  }),
  codec: {
    encode: (value: SuggestionType): ReadonlyArray<number> => {
      switch (value._) {
        case "Function": {
          return [0].concat(
            SuggestionTypeInputAndOutput.codec.encode(
              value.suggestionTypeInputAndOutput
            )
          );
        }
        case "TypePartWithParameter": {
          return [1].concat(
            TypePartWithSuggestionTypeParameter.codec.encode(
              value.typePartWithSuggestionTypeParameter
            )
          );
        }
        case "SuggestionTypePartWithParameter": {
          return [2].concat(
            SuggestionTypePartWithSuggestionTypeParameter.codec.encode(
              value.suggestionTypePartWithSuggestionTypeParameter
            )
          );
        }
      }
    },
    decode: (
      index: number,
      binary: Uint8Array
    ): { readonly result: SuggestionType; readonly nextIndex: number } => {
      const patternIndex: {
        readonly result: number;
        readonly nextIndex: number;
      } = Int32.codec.decode(index, binary);
      if (patternIndex.result === 0) {
        const result: {
          readonly result: SuggestionTypeInputAndOutput;
          readonly nextIndex: number;
        } = SuggestionTypeInputAndOutput.codec.decode(
          patternIndex.nextIndex,
          binary
        );
        return {
          result: SuggestionType.Function(result.result),
          nextIndex: result.nextIndex,
        };
      }
      if (patternIndex.result === 1) {
        const result: {
          readonly result: TypePartWithSuggestionTypeParameter;
          readonly nextIndex: number;
        } = TypePartWithSuggestionTypeParameter.codec.decode(
          patternIndex.nextIndex,
          binary
        );
        return {
          result: SuggestionType.TypePartWithParameter(result.result),
          nextIndex: result.nextIndex,
        };
      }
      if (patternIndex.result === 2) {
        const result: {
          readonly result: SuggestionTypePartWithSuggestionTypeParameter;
          readonly nextIndex: number;
        } = SuggestionTypePartWithSuggestionTypeParameter.codec.decode(
          patternIndex.nextIndex,
          binary
        );
        return {
          result: SuggestionType.SuggestionTypePartWithParameter(result.result),
          nextIndex: result.nextIndex,
        };
      }
      throw new Error("存在しないパターンを指定された 型を更新してください");
    },
  },
};

export const SuggestionTypeInputAndOutput: {
  readonly codec: Codec<SuggestionTypeInputAndOutput>;
} = {
  codec: {
    encode: (value: SuggestionTypeInputAndOutput): ReadonlyArray<number> =>
      SuggestionType.codec
        .encode(value.inputType)
        .concat(SuggestionType.codec.encode(value.outputType)),
    decode: (
      index: number,
      binary: Uint8Array
    ): {
      readonly result: SuggestionTypeInputAndOutput;
      readonly nextIndex: number;
    } => {
      const inputTypeAndNextIndex: {
        readonly result: SuggestionType;
        readonly nextIndex: number;
      } = SuggestionType.codec.decode(index, binary);
      const outputTypeAndNextIndex: {
        readonly result: SuggestionType;
        readonly nextIndex: number;
      } = SuggestionType.codec.decode(inputTypeAndNextIndex.nextIndex, binary);
      return {
        result: {
          inputType: inputTypeAndNextIndex.result,
          outputType: outputTypeAndNextIndex.result,
        },
        nextIndex: outputTypeAndNextIndex.nextIndex,
      };
    },
  },
};

export const TypePartWithSuggestionTypeParameter: {
  readonly codec: Codec<TypePartWithSuggestionTypeParameter>;
} = {
  codec: {
    encode: (
      value: TypePartWithSuggestionTypeParameter
    ): ReadonlyArray<number> =>
      TypePartId.codec
        .encode(value.typePartId)
        .concat(List.codec(SuggestionType.codec).encode(value.parameter)),
    decode: (
      index: number,
      binary: Uint8Array
    ): {
      readonly result: TypePartWithSuggestionTypeParameter;
      readonly nextIndex: number;
    } => {
      const typePartIdAndNextIndex: {
        readonly result: TypePartId;
        readonly nextIndex: number;
      } = TypePartId.codec.decode(index, binary);
      const parameterAndNextIndex: {
        readonly result: ReadonlyArray<SuggestionType>;
        readonly nextIndex: number;
      } = List.codec(SuggestionType.codec).decode(
        typePartIdAndNextIndex.nextIndex,
        binary
      );
      return {
        result: {
          typePartId: typePartIdAndNextIndex.result,
          parameter: parameterAndNextIndex.result,
        },
        nextIndex: parameterAndNextIndex.nextIndex,
      };
    },
  },
};

export const SuggestionTypePartWithSuggestionTypeParameter: {
  readonly codec: Codec<SuggestionTypePartWithSuggestionTypeParameter>;
} = {
  codec: {
    encode: (
      value: SuggestionTypePartWithSuggestionTypeParameter
    ): ReadonlyArray<number> =>
      Int32.codec
        .encode(value.suggestionTypePartIndex)
        .concat(List.codec(SuggestionType.codec).encode(value.parameter)),
    decode: (
      index: number,
      binary: Uint8Array
    ): {
      readonly result: SuggestionTypePartWithSuggestionTypeParameter;
      readonly nextIndex: number;
    } => {
      const suggestionTypePartIndexAndNextIndex: {
        readonly result: number;
        readonly nextIndex: number;
      } = Int32.codec.decode(index, binary);
      const parameterAndNextIndex: {
        readonly result: ReadonlyArray<SuggestionType>;
        readonly nextIndex: number;
      } = List.codec(SuggestionType.codec).decode(
        suggestionTypePartIndexAndNextIndex.nextIndex,
        binary
      );
      return {
        result: {
          suggestionTypePartIndex: suggestionTypePartIndexAndNextIndex.result,
          parameter: parameterAndNextIndex.result,
        },
        nextIndex: parameterAndNextIndex.nextIndex,
      };
    },
  },
};

/**
 * 提案時に含まれるパーツを参照できる式
 */
export const SuggestionExpr: {
  /**
   * Definyだけでは表現できない式
   */
  readonly Kernel: (a: KernelExpr) => SuggestionExpr;
  /**
   * 32bit整数
   */
  readonly Int32Literal: (a: number) => SuggestionExpr;
  /**
   * パーツの値を参照
   */
  readonly PartReference: (a: PartId) => SuggestionExpr;
  /**
   * 提案内で定義されたパーツのID
   */
  readonly SuggestionPartReference: (a: number) => SuggestionExpr;
  /**
   * ローカルパーツの参照
   */
  readonly LocalPartReference: (a: LocalPartReference) => SuggestionExpr;
  /**
   * タグを参照
   */
  readonly TagReference: (a: TagReference) => SuggestionExpr;
  /**
   * 提案内で定義された型のタグ
   */
  readonly SuggestionTagReference: (
    a: SuggestionTagReference
  ) => SuggestionExpr;
  /**
   * 関数呼び出し (中に含まれる型はSuggestionExpr)
   */
  readonly FunctionCall: (a: SuggestionFunctionCall) => SuggestionExpr;
  /**
   * ラムダ
   */
  readonly Lambda: (a: ReadonlyArray<SuggestionLambdaBranch>) => SuggestionExpr;
  /**
   * 空白
   */
  readonly Blank: SuggestionExpr;
  readonly codec: Codec<SuggestionExpr>;
} = {
  Kernel: (kernelExpr: KernelExpr): SuggestionExpr => ({
    _: "Kernel",
    kernelExpr: kernelExpr,
  }),
  Int32Literal: (int32: number): SuggestionExpr => ({
    _: "Int32Literal",
    int32: int32,
  }),
  PartReference: (partId: PartId): SuggestionExpr => ({
    _: "PartReference",
    partId: partId,
  }),
  SuggestionPartReference: (int32: number): SuggestionExpr => ({
    _: "SuggestionPartReference",
    int32: int32,
  }),
  LocalPartReference: (
    localPartReference: LocalPartReference
  ): SuggestionExpr => ({
    _: "LocalPartReference",
    localPartReference: localPartReference,
  }),
  TagReference: (tagReference: TagReference): SuggestionExpr => ({
    _: "TagReference",
    tagReference: tagReference,
  }),
  SuggestionTagReference: (
    suggestionTagReference: SuggestionTagReference
  ): SuggestionExpr => ({
    _: "SuggestionTagReference",
    suggestionTagReference: suggestionTagReference,
  }),
  FunctionCall: (
    suggestionFunctionCall: SuggestionFunctionCall
  ): SuggestionExpr => ({
    _: "FunctionCall",
    suggestionFunctionCall: suggestionFunctionCall,
  }),
  Lambda: (
    suggestionLambdaBranchList: ReadonlyArray<SuggestionLambdaBranch>
  ): SuggestionExpr => ({
    _: "Lambda",
    suggestionLambdaBranchList: suggestionLambdaBranchList,
  }),
  Blank: { _: "Blank" },
  codec: {
    encode: (value: SuggestionExpr): ReadonlyArray<number> => {
      switch (value._) {
        case "Kernel": {
          return [0].concat(KernelExpr.codec.encode(value.kernelExpr));
        }
        case "Int32Literal": {
          return [1].concat(Int32.codec.encode(value.int32));
        }
        case "PartReference": {
          return [2].concat(PartId.codec.encode(value.partId));
        }
        case "SuggestionPartReference": {
          return [3].concat(Int32.codec.encode(value.int32));
        }
        case "LocalPartReference": {
          return [4].concat(
            LocalPartReference.codec.encode(value.localPartReference)
          );
        }
        case "TagReference": {
          return [5].concat(TagReference.codec.encode(value.tagReference));
        }
        case "SuggestionTagReference": {
          return [6].concat(
            SuggestionTagReference.codec.encode(value.suggestionTagReference)
          );
        }
        case "FunctionCall": {
          return [7].concat(
            SuggestionFunctionCall.codec.encode(value.suggestionFunctionCall)
          );
        }
        case "Lambda": {
          return [8].concat(
            List.codec(SuggestionLambdaBranch.codec).encode(
              value.suggestionLambdaBranchList
            )
          );
        }
        case "Blank": {
          return [9];
        }
      }
    },
    decode: (
      index: number,
      binary: Uint8Array
    ): { readonly result: SuggestionExpr; readonly nextIndex: number } => {
      const patternIndex: {
        readonly result: number;
        readonly nextIndex: number;
      } = Int32.codec.decode(index, binary);
      if (patternIndex.result === 0) {
        const result: {
          readonly result: KernelExpr;
          readonly nextIndex: number;
        } = KernelExpr.codec.decode(patternIndex.nextIndex, binary);
        return {
          result: SuggestionExpr.Kernel(result.result),
          nextIndex: result.nextIndex,
        };
      }
      if (patternIndex.result === 1) {
        const result: {
          readonly result: number;
          readonly nextIndex: number;
        } = Int32.codec.decode(patternIndex.nextIndex, binary);
        return {
          result: SuggestionExpr.Int32Literal(result.result),
          nextIndex: result.nextIndex,
        };
      }
      if (patternIndex.result === 2) {
        const result: {
          readonly result: PartId;
          readonly nextIndex: number;
        } = PartId.codec.decode(patternIndex.nextIndex, binary);
        return {
          result: SuggestionExpr.PartReference(result.result),
          nextIndex: result.nextIndex,
        };
      }
      if (patternIndex.result === 3) {
        const result: {
          readonly result: number;
          readonly nextIndex: number;
        } = Int32.codec.decode(patternIndex.nextIndex, binary);
        return {
          result: SuggestionExpr.SuggestionPartReference(result.result),
          nextIndex: result.nextIndex,
        };
      }
      if (patternIndex.result === 4) {
        const result: {
          readonly result: LocalPartReference;
          readonly nextIndex: number;
        } = LocalPartReference.codec.decode(patternIndex.nextIndex, binary);
        return {
          result: SuggestionExpr.LocalPartReference(result.result),
          nextIndex: result.nextIndex,
        };
      }
      if (patternIndex.result === 5) {
        const result: {
          readonly result: TagReference;
          readonly nextIndex: number;
        } = TagReference.codec.decode(patternIndex.nextIndex, binary);
        return {
          result: SuggestionExpr.TagReference(result.result),
          nextIndex: result.nextIndex,
        };
      }
      if (patternIndex.result === 6) {
        const result: {
          readonly result: SuggestionTagReference;
          readonly nextIndex: number;
        } = SuggestionTagReference.codec.decode(patternIndex.nextIndex, binary);
        return {
          result: SuggestionExpr.SuggestionTagReference(result.result),
          nextIndex: result.nextIndex,
        };
      }
      if (patternIndex.result === 7) {
        const result: {
          readonly result: SuggestionFunctionCall;
          readonly nextIndex: number;
        } = SuggestionFunctionCall.codec.decode(patternIndex.nextIndex, binary);
        return {
          result: SuggestionExpr.FunctionCall(result.result),
          nextIndex: result.nextIndex,
        };
      }
      if (patternIndex.result === 8) {
        const result: {
          readonly result: ReadonlyArray<SuggestionLambdaBranch>;
          readonly nextIndex: number;
        } = List.codec(SuggestionLambdaBranch.codec).decode(
          patternIndex.nextIndex,
          binary
        );
        return {
          result: SuggestionExpr.Lambda(result.result),
          nextIndex: result.nextIndex,
        };
      }
      if (patternIndex.result === 9) {
        return {
          result: SuggestionExpr.Blank,
          nextIndex: patternIndex.nextIndex,
        };
      }
      throw new Error("存在しないパターンを指定された 型を更新してください");
    },
  },
};

/**
 * 提案内で定義された型のタグ
 */
export const SuggestionTagReference: {
  readonly codec: Codec<SuggestionTagReference>;
} = {
  codec: {
    encode: (value: SuggestionTagReference): ReadonlyArray<number> =>
      Int32.codec
        .encode(value.suggestionTypePartIndex)
        .concat(Int32.codec.encode(value.tagIndex)),
    decode: (
      index: number,
      binary: Uint8Array
    ): {
      readonly result: SuggestionTagReference;
      readonly nextIndex: number;
    } => {
      const suggestionTypePartIndexAndNextIndex: {
        readonly result: number;
        readonly nextIndex: number;
      } = Int32.codec.decode(index, binary);
      const tagIndexAndNextIndex: {
        readonly result: number;
        readonly nextIndex: number;
      } = Int32.codec.decode(
        suggestionTypePartIndexAndNextIndex.nextIndex,
        binary
      );
      return {
        result: {
          suggestionTypePartIndex: suggestionTypePartIndexAndNextIndex.result,
          tagIndex: tagIndexAndNextIndex.result,
        },
        nextIndex: tagIndexAndNextIndex.nextIndex,
      };
    },
  },
};

/**
 * 関数呼び出し (中に含まれる型はSuggestionExpr)
 */
export const SuggestionFunctionCall: {
  readonly codec: Codec<SuggestionFunctionCall>;
} = {
  codec: {
    encode: (value: SuggestionFunctionCall): ReadonlyArray<number> =>
      SuggestionExpr.codec
        .encode(value["function"])
        .concat(SuggestionExpr.codec.encode(value.parameter)),
    decode: (
      index: number,
      binary: Uint8Array
    ): {
      readonly result: SuggestionFunctionCall;
      readonly nextIndex: number;
    } => {
      const functionAndNextIndex: {
        readonly result: SuggestionExpr;
        readonly nextIndex: number;
      } = SuggestionExpr.codec.decode(index, binary);
      const parameterAndNextIndex: {
        readonly result: SuggestionExpr;
        readonly nextIndex: number;
      } = SuggestionExpr.codec.decode(functionAndNextIndex.nextIndex, binary);
      return {
        result: {
          function: functionAndNextIndex.result,
          parameter: parameterAndNextIndex.result,
        },
        nextIndex: parameterAndNextIndex.nextIndex,
      };
    },
  },
};

/**
 * suggestionExprの入ったLambdaBranch
 */
export const SuggestionLambdaBranch: {
  readonly codec: Codec<SuggestionLambdaBranch>;
} = {
  codec: {
    encode: (value: SuggestionLambdaBranch): ReadonlyArray<number> =>
      Condition.codec
        .encode(value.condition)
        .concat(String.codec.encode(value.description))
        .concat(
          List.codec(SuggestionBranchPartDefinition.codec).encode(
            value.localPartList
          )
        )
        .concat(SuggestionExpr.codec.encode(value.expr)),
    decode: (
      index: number,
      binary: Uint8Array
    ): {
      readonly result: SuggestionLambdaBranch;
      readonly nextIndex: number;
    } => {
      const conditionAndNextIndex: {
        readonly result: Condition;
        readonly nextIndex: number;
      } = Condition.codec.decode(index, binary);
      const descriptionAndNextIndex: {
        readonly result: string;
        readonly nextIndex: number;
      } = String.codec.decode(conditionAndNextIndex.nextIndex, binary);
      const localPartListAndNextIndex: {
        readonly result: ReadonlyArray<SuggestionBranchPartDefinition>;
        readonly nextIndex: number;
      } = List.codec(SuggestionBranchPartDefinition.codec).decode(
        descriptionAndNextIndex.nextIndex,
        binary
      );
      const exprAndNextIndex: {
        readonly result: SuggestionExpr;
        readonly nextIndex: number;
      } = SuggestionExpr.codec.decode(
        localPartListAndNextIndex.nextIndex,
        binary
      );
      return {
        result: {
          condition: conditionAndNextIndex.result,
          description: descriptionAndNextIndex.result,
          localPartList: localPartListAndNextIndex.result,
          expr: exprAndNextIndex.result,
        },
        nextIndex: exprAndNextIndex.nextIndex,
      };
    },
  },
};

/**
 * ラムダのブランチで使えるパーツを定義する部分 (SuggestionExpr バージョン)
 */
export const SuggestionBranchPartDefinition: {
  readonly codec: Codec<SuggestionBranchPartDefinition>;
} = {
  codec: {
    encode: (value: SuggestionBranchPartDefinition): ReadonlyArray<number> =>
      LocalPartId.codec
        .encode(value.localPartId)
        .concat(String.codec.encode(value.name))
        .concat(String.codec.encode(value.description))
        .concat(SuggestionType.codec.encode(value["type"]))
        .concat(SuggestionExpr.codec.encode(value.expr)),
    decode: (
      index: number,
      binary: Uint8Array
    ): {
      readonly result: SuggestionBranchPartDefinition;
      readonly nextIndex: number;
    } => {
      const localPartIdAndNextIndex: {
        readonly result: LocalPartId;
        readonly nextIndex: number;
      } = LocalPartId.codec.decode(index, binary);
      const nameAndNextIndex: {
        readonly result: string;
        readonly nextIndex: number;
      } = String.codec.decode(localPartIdAndNextIndex.nextIndex, binary);
      const descriptionAndNextIndex: {
        readonly result: string;
        readonly nextIndex: number;
      } = String.codec.decode(nameAndNextIndex.nextIndex, binary);
      const typeAndNextIndex: {
        readonly result: SuggestionType;
        readonly nextIndex: number;
      } = SuggestionType.codec.decode(
        descriptionAndNextIndex.nextIndex,
        binary
      );
      const exprAndNextIndex: {
        readonly result: SuggestionExpr;
        readonly nextIndex: number;
      } = SuggestionExpr.codec.decode(typeAndNextIndex.nextIndex, binary);
      return {
        result: {
          localPartId: localPartIdAndNextIndex.result,
          name: nameAndNextIndex.result,
          description: descriptionAndNextIndex.result,
          type: typeAndNextIndex.result,
          expr: exprAndNextIndex.result,
        },
        nextIndex: exprAndNextIndex.nextIndex,
      };
    },
  },
};

/**
 * 型パーツ
 */
export const TypePart: { readonly codec: Codec<TypePart> } = {
  codec: {
    encode: (value: TypePart): ReadonlyArray<number> =>
      String.codec
        .encode(value.name)
        .concat(List.codec(PartId.codec).encode(value.parentList))
        .concat(String.codec.encode(value.description))
        .concat(ProjectId.codec.encode(value.projectId))
        .concat(SuggestionId.codec.encode(value.createSuggestionId))
        .concat(Time.codec.encode(value.getTime))
        .concat(TypePartBody.codec.encode(value.body)),
    decode: (
      index: number,
      binary: Uint8Array
    ): { readonly result: TypePart; readonly nextIndex: number } => {
      const nameAndNextIndex: {
        readonly result: string;
        readonly nextIndex: number;
      } = String.codec.decode(index, binary);
      const parentListAndNextIndex: {
        readonly result: ReadonlyArray<PartId>;
        readonly nextIndex: number;
      } = List.codec(PartId.codec).decode(nameAndNextIndex.nextIndex, binary);
      const descriptionAndNextIndex: {
        readonly result: string;
        readonly nextIndex: number;
      } = String.codec.decode(parentListAndNextIndex.nextIndex, binary);
      const projectIdAndNextIndex: {
        readonly result: ProjectId;
        readonly nextIndex: number;
      } = ProjectId.codec.decode(descriptionAndNextIndex.nextIndex, binary);
      const createSuggestionIdAndNextIndex: {
        readonly result: SuggestionId;
        readonly nextIndex: number;
      } = SuggestionId.codec.decode(projectIdAndNextIndex.nextIndex, binary);
      const getTimeAndNextIndex: {
        readonly result: Time;
        readonly nextIndex: number;
      } = Time.codec.decode(createSuggestionIdAndNextIndex.nextIndex, binary);
      const bodyAndNextIndex: {
        readonly result: TypePartBody;
        readonly nextIndex: number;
      } = TypePartBody.codec.decode(getTimeAndNextIndex.nextIndex, binary);
      return {
        result: {
          name: nameAndNextIndex.result,
          parentList: parentListAndNextIndex.result,
          description: descriptionAndNextIndex.result,
          projectId: projectIdAndNextIndex.result,
          createSuggestionId: createSuggestionIdAndNextIndex.result,
          getTime: getTimeAndNextIndex.result,
          body: bodyAndNextIndex.result,
        },
        nextIndex: bodyAndNextIndex.nextIndex,
      };
    },
  },
};

/**
 * パーツの定義
 */
export const Part: { readonly codec: Codec<Part> } = {
  codec: {
    encode: (value: Part): ReadonlyArray<number> =>
      String.codec
        .encode(value.name)
        .concat(List.codec(PartId.codec).encode(value.parentList))
        .concat(String.codec.encode(value.description))
        .concat(Type.codec.encode(value["type"]))
        .concat(Expr.codec.encode(value.expr))
        .concat(ProjectId.codec.encode(value.projectId))
        .concat(SuggestionId.codec.encode(value.createSuggestionId))
        .concat(Time.codec.encode(value.getTime)),
    decode: (
      index: number,
      binary: Uint8Array
    ): { readonly result: Part; readonly nextIndex: number } => {
      const nameAndNextIndex: {
        readonly result: string;
        readonly nextIndex: number;
      } = String.codec.decode(index, binary);
      const parentListAndNextIndex: {
        readonly result: ReadonlyArray<PartId>;
        readonly nextIndex: number;
      } = List.codec(PartId.codec).decode(nameAndNextIndex.nextIndex, binary);
      const descriptionAndNextIndex: {
        readonly result: string;
        readonly nextIndex: number;
      } = String.codec.decode(parentListAndNextIndex.nextIndex, binary);
      const typeAndNextIndex: {
        readonly result: Type;
        readonly nextIndex: number;
      } = Type.codec.decode(descriptionAndNextIndex.nextIndex, binary);
      const exprAndNextIndex: {
        readonly result: Expr;
        readonly nextIndex: number;
      } = Expr.codec.decode(typeAndNextIndex.nextIndex, binary);
      const projectIdAndNextIndex: {
        readonly result: ProjectId;
        readonly nextIndex: number;
      } = ProjectId.codec.decode(exprAndNextIndex.nextIndex, binary);
      const createSuggestionIdAndNextIndex: {
        readonly result: SuggestionId;
        readonly nextIndex: number;
      } = SuggestionId.codec.decode(projectIdAndNextIndex.nextIndex, binary);
      const getTimeAndNextIndex: {
        readonly result: Time;
        readonly nextIndex: number;
      } = Time.codec.decode(createSuggestionIdAndNextIndex.nextIndex, binary);
      return {
        result: {
          name: nameAndNextIndex.result,
          parentList: parentListAndNextIndex.result,
          description: descriptionAndNextIndex.result,
          type: typeAndNextIndex.result,
          expr: exprAndNextIndex.result,
          projectId: projectIdAndNextIndex.result,
          createSuggestionId: createSuggestionIdAndNextIndex.result,
          getTime: getTimeAndNextIndex.result,
        },
        nextIndex: getTimeAndNextIndex.nextIndex,
      };
    },
  },
};

/**
 * 型の定義本体
 */
export const TypePartBody: {
  /**
   * 直積型
   */
  readonly Product: (a: ReadonlyArray<Member>) => TypePartBody;
  /**
   * 直和型
   */
  readonly Sum: (a: ReadonlyArray<Pattern>) => TypePartBody;
  /**
   * Definyだけでは表現できないデータ型
   */
  readonly Kernel: (a: TypePartBodyKernel) => TypePartBody;
  readonly codec: Codec<TypePartBody>;
} = {
  Product: (memberList: ReadonlyArray<Member>): TypePartBody => ({
    _: "Product",
    memberList: memberList,
  }),
  Sum: (patternList: ReadonlyArray<Pattern>): TypePartBody => ({
    _: "Sum",
    patternList: patternList,
  }),
  Kernel: (typePartBodyKernel: TypePartBodyKernel): TypePartBody => ({
    _: "Kernel",
    typePartBodyKernel: typePartBodyKernel,
  }),
  codec: {
    encode: (value: TypePartBody): ReadonlyArray<number> => {
      switch (value._) {
        case "Product": {
          return [0].concat(List.codec(Member.codec).encode(value.memberList));
        }
        case "Sum": {
          return [1].concat(
            List.codec(Pattern.codec).encode(value.patternList)
          );
        }
        case "Kernel": {
          return [2].concat(
            TypePartBodyKernel.codec.encode(value.typePartBodyKernel)
          );
        }
      }
    },
    decode: (
      index: number,
      binary: Uint8Array
    ): { readonly result: TypePartBody; readonly nextIndex: number } => {
      const patternIndex: {
        readonly result: number;
        readonly nextIndex: number;
      } = Int32.codec.decode(index, binary);
      if (patternIndex.result === 0) {
        const result: {
          readonly result: ReadonlyArray<Member>;
          readonly nextIndex: number;
        } = List.codec(Member.codec).decode(patternIndex.nextIndex, binary);
        return {
          result: TypePartBody.Product(result.result),
          nextIndex: result.nextIndex,
        };
      }
      if (patternIndex.result === 1) {
        const result: {
          readonly result: ReadonlyArray<Pattern>;
          readonly nextIndex: number;
        } = List.codec(Pattern.codec).decode(patternIndex.nextIndex, binary);
        return {
          result: TypePartBody.Sum(result.result),
          nextIndex: result.nextIndex,
        };
      }
      if (patternIndex.result === 2) {
        const result: {
          readonly result: TypePartBodyKernel;
          readonly nextIndex: number;
        } = TypePartBodyKernel.codec.decode(patternIndex.nextIndex, binary);
        return {
          result: TypePartBody.Kernel(result.result),
          nextIndex: result.nextIndex,
        };
      }
      throw new Error("存在しないパターンを指定された 型を更新してください");
    },
  },
};

/**
 * 直積型のメンバー
 */
export const Member: { readonly codec: Codec<Member> } = {
  codec: {
    encode: (value: Member): ReadonlyArray<number> =>
      String.codec
        .encode(value.name)
        .concat(String.codec.encode(value.description))
        .concat(Type.codec.encode(value["type"])),
    decode: (
      index: number,
      binary: Uint8Array
    ): { readonly result: Member; readonly nextIndex: number } => {
      const nameAndNextIndex: {
        readonly result: string;
        readonly nextIndex: number;
      } = String.codec.decode(index, binary);
      const descriptionAndNextIndex: {
        readonly result: string;
        readonly nextIndex: number;
      } = String.codec.decode(nameAndNextIndex.nextIndex, binary);
      const typeAndNextIndex: {
        readonly result: Type;
        readonly nextIndex: number;
      } = Type.codec.decode(descriptionAndNextIndex.nextIndex, binary);
      return {
        result: {
          name: nameAndNextIndex.result,
          description: descriptionAndNextIndex.result,
          type: typeAndNextIndex.result,
        },
        nextIndex: typeAndNextIndex.nextIndex,
      };
    },
  },
};

/**
 * 直積型のパターン
 */
export const Pattern: { readonly codec: Codec<Pattern> } = {
  codec: {
    encode: (value: Pattern): ReadonlyArray<number> =>
      String.codec
        .encode(value.name)
        .concat(String.codec.encode(value.description))
        .concat(Maybe.codec(Type.codec).encode(value.parameter)),
    decode: (
      index: number,
      binary: Uint8Array
    ): { readonly result: Pattern; readonly nextIndex: number } => {
      const nameAndNextIndex: {
        readonly result: string;
        readonly nextIndex: number;
      } = String.codec.decode(index, binary);
      const descriptionAndNextIndex: {
        readonly result: string;
        readonly nextIndex: number;
      } = String.codec.decode(nameAndNextIndex.nextIndex, binary);
      const parameterAndNextIndex: {
        readonly result: Maybe<Type>;
        readonly nextIndex: number;
      } = Maybe.codec(Type.codec).decode(
        descriptionAndNextIndex.nextIndex,
        binary
      );
      return {
        result: {
          name: nameAndNextIndex.result,
          description: descriptionAndNextIndex.result,
          parameter: parameterAndNextIndex.result,
        },
        nextIndex: parameterAndNextIndex.nextIndex,
      };
    },
  },
};

/**
 * Definyだけでは表現できないデータ型
 */
export const TypePartBodyKernel: {
  /**
   * 32bit整数
   */
  readonly Int32: TypePartBodyKernel;
  /**
   * リスト
   */
  readonly List: TypePartBodyKernel;
  readonly codec: Codec<TypePartBodyKernel>;
} = {
  Int32: "Int32",
  List: "List",
  codec: {
    encode: (value: TypePartBodyKernel): ReadonlyArray<number> => {
      switch (value) {
        case "Int32": {
          return [0];
        }
        case "List": {
          return [1];
        }
      }
    },
    decode: (
      index: number,
      binary: Uint8Array
    ): { readonly result: TypePartBodyKernel; readonly nextIndex: number } => {
      const patternIndex: {
        readonly result: number;
        readonly nextIndex: number;
      } = Int32.codec.decode(index, binary);
      if (patternIndex.result === 0) {
        return {
          result: TypePartBodyKernel.Int32,
          nextIndex: patternIndex.nextIndex,
        };
      }
      if (patternIndex.result === 1) {
        return {
          result: TypePartBodyKernel.List,
          nextIndex: patternIndex.nextIndex,
        };
      }
      throw new Error("存在しないパターンを指定された 型を更新してください");
    },
  },
};

/**
 * 型
 */
export const Type: {
  /**
   * 関数
   */
  readonly Function: (a: TypeInputAndOutput) => Type;
  /**
   * 型パーツと, パラメーターのリスト
   */
  readonly TypePartWithParameter: (a: TypePartIdWithParameter) => Type;
  readonly codec: Codec<Type>;
} = {
  Function: (typeInputAndOutput: TypeInputAndOutput): Type => ({
    _: "Function",
    typeInputAndOutput: typeInputAndOutput,
  }),
  TypePartWithParameter: (
    typePartIdWithParameter: TypePartIdWithParameter
  ): Type => ({
    _: "TypePartWithParameter",
    typePartIdWithParameter: typePartIdWithParameter,
  }),
  codec: {
    encode: (value: Type): ReadonlyArray<number> => {
      switch (value._) {
        case "Function": {
          return [0].concat(
            TypeInputAndOutput.codec.encode(value.typeInputAndOutput)
          );
        }
        case "TypePartWithParameter": {
          return [1].concat(
            TypePartIdWithParameter.codec.encode(value.typePartIdWithParameter)
          );
        }
      }
    },
    decode: (
      index: number,
      binary: Uint8Array
    ): { readonly result: Type; readonly nextIndex: number } => {
      const patternIndex: {
        readonly result: number;
        readonly nextIndex: number;
      } = Int32.codec.decode(index, binary);
      if (patternIndex.result === 0) {
        const result: {
          readonly result: TypeInputAndOutput;
          readonly nextIndex: number;
        } = TypeInputAndOutput.codec.decode(patternIndex.nextIndex, binary);
        return {
          result: Type.Function(result.result),
          nextIndex: result.nextIndex,
        };
      }
      if (patternIndex.result === 1) {
        const result: {
          readonly result: TypePartIdWithParameter;
          readonly nextIndex: number;
        } = TypePartIdWithParameter.codec.decode(
          patternIndex.nextIndex,
          binary
        );
        return {
          result: Type.TypePartWithParameter(result.result),
          nextIndex: result.nextIndex,
        };
      }
      throw new Error("存在しないパターンを指定された 型を更新してください");
    },
  },
};

export const TypeInputAndOutput: {
  readonly codec: Codec<TypeInputAndOutput>;
} = {
  codec: {
    encode: (value: TypeInputAndOutput): ReadonlyArray<number> =>
      Type.codec
        .encode(value.inputType)
        .concat(Type.codec.encode(value.outputType)),
    decode: (
      index: number,
      binary: Uint8Array
    ): { readonly result: TypeInputAndOutput; readonly nextIndex: number } => {
      const inputTypeAndNextIndex: {
        readonly result: Type;
        readonly nextIndex: number;
      } = Type.codec.decode(index, binary);
      const outputTypeAndNextIndex: {
        readonly result: Type;
        readonly nextIndex: number;
      } = Type.codec.decode(inputTypeAndNextIndex.nextIndex, binary);
      return {
        result: {
          inputType: inputTypeAndNextIndex.result,
          outputType: outputTypeAndNextIndex.result,
        },
        nextIndex: outputTypeAndNextIndex.nextIndex,
      };
    },
  },
};

export const TypePartIdWithParameter: {
  readonly codec: Codec<TypePartIdWithParameter>;
} = {
  codec: {
    encode: (value: TypePartIdWithParameter): ReadonlyArray<number> =>
      TypePartId.codec
        .encode(value.typePartId)
        .concat(List.codec(Type.codec).encode(value.parameter)),
    decode: (
      index: number,
      binary: Uint8Array
    ): {
      readonly result: TypePartIdWithParameter;
      readonly nextIndex: number;
    } => {
      const typePartIdAndNextIndex: {
        readonly result: TypePartId;
        readonly nextIndex: number;
      } = TypePartId.codec.decode(index, binary);
      const parameterAndNextIndex: {
        readonly result: ReadonlyArray<Type>;
        readonly nextIndex: number;
      } = List.codec(Type.codec).decode(
        typePartIdAndNextIndex.nextIndex,
        binary
      );
      return {
        result: {
          typePartId: typePartIdAndNextIndex.result,
          parameter: parameterAndNextIndex.result,
        },
        nextIndex: parameterAndNextIndex.nextIndex,
      };
    },
  },
};

/**
 * 式
 */
export const Expr: {
  /**
   * Definyだけでは表現できない式
   */
  readonly Kernel: (a: KernelExpr) => Expr;
  /**
   * 32bit整数
   */
  readonly Int32Literal: (a: number) => Expr;
  /**
   * パーツの値を参照
   */
  readonly PartReference: (a: PartId) => Expr;
  /**
   * ローカルパーツの参照
   */
  readonly LocalPartReference: (a: LocalPartReference) => Expr;
  /**
   * タグを参照
   */
  readonly TagReference: (a: TagReference) => Expr;
  /**
   * 関数呼び出し
   */
  readonly FunctionCall: (a: FunctionCall) => Expr;
  /**
   * ラムダ
   */
  readonly Lambda: (a: ReadonlyArray<LambdaBranch>) => Expr;
  readonly codec: Codec<Expr>;
} = {
  Kernel: (kernelExpr: KernelExpr): Expr => ({
    _: "Kernel",
    kernelExpr: kernelExpr,
  }),
  Int32Literal: (int32: number): Expr => ({ _: "Int32Literal", int32: int32 }),
  PartReference: (partId: PartId): Expr => ({
    _: "PartReference",
    partId: partId,
  }),
  LocalPartReference: (localPartReference: LocalPartReference): Expr => ({
    _: "LocalPartReference",
    localPartReference: localPartReference,
  }),
  TagReference: (tagReference: TagReference): Expr => ({
    _: "TagReference",
    tagReference: tagReference,
  }),
  FunctionCall: (functionCall: FunctionCall): Expr => ({
    _: "FunctionCall",
    functionCall: functionCall,
  }),
  Lambda: (lambdaBranchList: ReadonlyArray<LambdaBranch>): Expr => ({
    _: "Lambda",
    lambdaBranchList: lambdaBranchList,
  }),
  codec: {
    encode: (value: Expr): ReadonlyArray<number> => {
      switch (value._) {
        case "Kernel": {
          return [0].concat(KernelExpr.codec.encode(value.kernelExpr));
        }
        case "Int32Literal": {
          return [1].concat(Int32.codec.encode(value.int32));
        }
        case "PartReference": {
          return [2].concat(PartId.codec.encode(value.partId));
        }
        case "LocalPartReference": {
          return [3].concat(
            LocalPartReference.codec.encode(value.localPartReference)
          );
        }
        case "TagReference": {
          return [4].concat(TagReference.codec.encode(value.tagReference));
        }
        case "FunctionCall": {
          return [5].concat(FunctionCall.codec.encode(value.functionCall));
        }
        case "Lambda": {
          return [6].concat(
            List.codec(LambdaBranch.codec).encode(value.lambdaBranchList)
          );
        }
      }
    },
    decode: (
      index: number,
      binary: Uint8Array
    ): { readonly result: Expr; readonly nextIndex: number } => {
      const patternIndex: {
        readonly result: number;
        readonly nextIndex: number;
      } = Int32.codec.decode(index, binary);
      if (patternIndex.result === 0) {
        const result: {
          readonly result: KernelExpr;
          readonly nextIndex: number;
        } = KernelExpr.codec.decode(patternIndex.nextIndex, binary);
        return {
          result: Expr.Kernel(result.result),
          nextIndex: result.nextIndex,
        };
      }
      if (patternIndex.result === 1) {
        const result: {
          readonly result: number;
          readonly nextIndex: number;
        } = Int32.codec.decode(patternIndex.nextIndex, binary);
        return {
          result: Expr.Int32Literal(result.result),
          nextIndex: result.nextIndex,
        };
      }
      if (patternIndex.result === 2) {
        const result: {
          readonly result: PartId;
          readonly nextIndex: number;
        } = PartId.codec.decode(patternIndex.nextIndex, binary);
        return {
          result: Expr.PartReference(result.result),
          nextIndex: result.nextIndex,
        };
      }
      if (patternIndex.result === 3) {
        const result: {
          readonly result: LocalPartReference;
          readonly nextIndex: number;
        } = LocalPartReference.codec.decode(patternIndex.nextIndex, binary);
        return {
          result: Expr.LocalPartReference(result.result),
          nextIndex: result.nextIndex,
        };
      }
      if (patternIndex.result === 4) {
        const result: {
          readonly result: TagReference;
          readonly nextIndex: number;
        } = TagReference.codec.decode(patternIndex.nextIndex, binary);
        return {
          result: Expr.TagReference(result.result),
          nextIndex: result.nextIndex,
        };
      }
      if (patternIndex.result === 5) {
        const result: {
          readonly result: FunctionCall;
          readonly nextIndex: number;
        } = FunctionCall.codec.decode(patternIndex.nextIndex, binary);
        return {
          result: Expr.FunctionCall(result.result),
          nextIndex: result.nextIndex,
        };
      }
      if (patternIndex.result === 6) {
        const result: {
          readonly result: ReadonlyArray<LambdaBranch>;
          readonly nextIndex: number;
        } = List.codec(LambdaBranch.codec).decode(
          patternIndex.nextIndex,
          binary
        );
        return {
          result: Expr.Lambda(result.result),
          nextIndex: result.nextIndex,
        };
      }
      throw new Error("存在しないパターンを指定された 型を更新してください");
    },
  },
};

/**
 * 評価しきった式
 */
export const EvaluatedExpr: {
  /**
   * Definyだけでは表現できない式
   */
  readonly Kernel: (a: KernelExpr) => EvaluatedExpr;
  /**
   * 32bit整数
   */
  readonly Int32: (a: number) => EvaluatedExpr;
  /**
   * ローカルパーツの参照
   */
  readonly LocalPartReference: (a: LocalPartReference) => EvaluatedExpr;
  /**
   * タグを参照
   */
  readonly TagReference: (a: TagReference) => EvaluatedExpr;
  /**
   * ラムダ
   */
  readonly Lambda: (a: ReadonlyArray<LambdaBranch>) => EvaluatedExpr;
  /**
   * 内部関数呼び出し
   */
  readonly KernelCall: (a: KernelCall) => EvaluatedExpr;
  readonly codec: Codec<EvaluatedExpr>;
} = {
  Kernel: (kernelExpr: KernelExpr): EvaluatedExpr => ({
    _: "Kernel",
    kernelExpr: kernelExpr,
  }),
  Int32: (int32: number): EvaluatedExpr => ({ _: "Int32", int32: int32 }),
  LocalPartReference: (
    localPartReference: LocalPartReference
  ): EvaluatedExpr => ({
    _: "LocalPartReference",
    localPartReference: localPartReference,
  }),
  TagReference: (tagReference: TagReference): EvaluatedExpr => ({
    _: "TagReference",
    tagReference: tagReference,
  }),
  Lambda: (lambdaBranchList: ReadonlyArray<LambdaBranch>): EvaluatedExpr => ({
    _: "Lambda",
    lambdaBranchList: lambdaBranchList,
  }),
  KernelCall: (kernelCall: KernelCall): EvaluatedExpr => ({
    _: "KernelCall",
    kernelCall: kernelCall,
  }),
  codec: {
    encode: (value: EvaluatedExpr): ReadonlyArray<number> => {
      switch (value._) {
        case "Kernel": {
          return [0].concat(KernelExpr.codec.encode(value.kernelExpr));
        }
        case "Int32": {
          return [1].concat(Int32.codec.encode(value.int32));
        }
        case "LocalPartReference": {
          return [2].concat(
            LocalPartReference.codec.encode(value.localPartReference)
          );
        }
        case "TagReference": {
          return [3].concat(TagReference.codec.encode(value.tagReference));
        }
        case "Lambda": {
          return [4].concat(
            List.codec(LambdaBranch.codec).encode(value.lambdaBranchList)
          );
        }
        case "KernelCall": {
          return [5].concat(KernelCall.codec.encode(value.kernelCall));
        }
      }
    },
    decode: (
      index: number,
      binary: Uint8Array
    ): { readonly result: EvaluatedExpr; readonly nextIndex: number } => {
      const patternIndex: {
        readonly result: number;
        readonly nextIndex: number;
      } = Int32.codec.decode(index, binary);
      if (patternIndex.result === 0) {
        const result: {
          readonly result: KernelExpr;
          readonly nextIndex: number;
        } = KernelExpr.codec.decode(patternIndex.nextIndex, binary);
        return {
          result: EvaluatedExpr.Kernel(result.result),
          nextIndex: result.nextIndex,
        };
      }
      if (patternIndex.result === 1) {
        const result: {
          readonly result: number;
          readonly nextIndex: number;
        } = Int32.codec.decode(patternIndex.nextIndex, binary);
        return {
          result: EvaluatedExpr.Int32(result.result),
          nextIndex: result.nextIndex,
        };
      }
      if (patternIndex.result === 2) {
        const result: {
          readonly result: LocalPartReference;
          readonly nextIndex: number;
        } = LocalPartReference.codec.decode(patternIndex.nextIndex, binary);
        return {
          result: EvaluatedExpr.LocalPartReference(result.result),
          nextIndex: result.nextIndex,
        };
      }
      if (patternIndex.result === 3) {
        const result: {
          readonly result: TagReference;
          readonly nextIndex: number;
        } = TagReference.codec.decode(patternIndex.nextIndex, binary);
        return {
          result: EvaluatedExpr.TagReference(result.result),
          nextIndex: result.nextIndex,
        };
      }
      if (patternIndex.result === 4) {
        const result: {
          readonly result: ReadonlyArray<LambdaBranch>;
          readonly nextIndex: number;
        } = List.codec(LambdaBranch.codec).decode(
          patternIndex.nextIndex,
          binary
        );
        return {
          result: EvaluatedExpr.Lambda(result.result),
          nextIndex: result.nextIndex,
        };
      }
      if (patternIndex.result === 5) {
        const result: {
          readonly result: KernelCall;
          readonly nextIndex: number;
        } = KernelCall.codec.decode(patternIndex.nextIndex, binary);
        return {
          result: EvaluatedExpr.KernelCall(result.result),
          nextIndex: result.nextIndex,
        };
      }
      throw new Error("存在しないパターンを指定された 型を更新してください");
    },
  },
};

/**
 * 複数の引数が必要な内部関数の部分呼び出し
 */
export const KernelCall: { readonly codec: Codec<KernelCall> } = {
  codec: {
    encode: (value: KernelCall): ReadonlyArray<number> =>
      KernelExpr.codec
        .encode(value.kernel)
        .concat(EvaluatedExpr.codec.encode(value.expr)),
    decode: (
      index: number,
      binary: Uint8Array
    ): { readonly result: KernelCall; readonly nextIndex: number } => {
      const kernelAndNextIndex: {
        readonly result: KernelExpr;
        readonly nextIndex: number;
      } = KernelExpr.codec.decode(index, binary);
      const exprAndNextIndex: {
        readonly result: EvaluatedExpr;
        readonly nextIndex: number;
      } = EvaluatedExpr.codec.decode(kernelAndNextIndex.nextIndex, binary);
      return {
        result: {
          kernel: kernelAndNextIndex.result,
          expr: exprAndNextIndex.result,
        },
        nextIndex: exprAndNextIndex.nextIndex,
      };
    },
  },
};

/**
 * Definyだけでは表現できない式
 */
export const KernelExpr: {
  /**
   * 32bit整数を足す関数
   */
  readonly Int32Add: KernelExpr;
  /**
   * 32bit整数を引く関数
   */
  readonly Int32Sub: KernelExpr;
  /**
   * 32bit整数をかける関数
   */
  readonly Int32Mul: KernelExpr;
  readonly codec: Codec<KernelExpr>;
} = {
  Int32Add: "Int32Add",
  Int32Sub: "Int32Sub",
  Int32Mul: "Int32Mul",
  codec: {
    encode: (value: KernelExpr): ReadonlyArray<number> => {
      switch (value) {
        case "Int32Add": {
          return [0];
        }
        case "Int32Sub": {
          return [1];
        }
        case "Int32Mul": {
          return [2];
        }
      }
    },
    decode: (
      index: number,
      binary: Uint8Array
    ): { readonly result: KernelExpr; readonly nextIndex: number } => {
      const patternIndex: {
        readonly result: number;
        readonly nextIndex: number;
      } = Int32.codec.decode(index, binary);
      if (patternIndex.result === 0) {
        return {
          result: KernelExpr.Int32Add,
          nextIndex: patternIndex.nextIndex,
        };
      }
      if (patternIndex.result === 1) {
        return {
          result: KernelExpr.Int32Sub,
          nextIndex: patternIndex.nextIndex,
        };
      }
      if (patternIndex.result === 2) {
        return {
          result: KernelExpr.Int32Mul,
          nextIndex: patternIndex.nextIndex,
        };
      }
      throw new Error("存在しないパターンを指定された 型を更新してください");
    },
  },
};

/**
 * ローカルパスの参照を表す
 */
export const LocalPartReference: {
  readonly codec: Codec<LocalPartReference>;
} = {
  codec: {
    encode: (value: LocalPartReference): ReadonlyArray<number> =>
      PartId.codec
        .encode(value.partId)
        .concat(LocalPartId.codec.encode(value.localPartId)),
    decode: (
      index: number,
      binary: Uint8Array
    ): { readonly result: LocalPartReference; readonly nextIndex: number } => {
      const partIdAndNextIndex: {
        readonly result: PartId;
        readonly nextIndex: number;
      } = PartId.codec.decode(index, binary);
      const localPartIdAndNextIndex: {
        readonly result: LocalPartId;
        readonly nextIndex: number;
      } = LocalPartId.codec.decode(partIdAndNextIndex.nextIndex, binary);
      return {
        result: {
          partId: partIdAndNextIndex.result,
          localPartId: localPartIdAndNextIndex.result,
        },
        nextIndex: localPartIdAndNextIndex.nextIndex,
      };
    },
  },
};

/**
 * タグの参照を表す
 */
export const TagReference: { readonly codec: Codec<TagReference> } = {
  codec: {
    encode: (value: TagReference): ReadonlyArray<number> =>
      TypePartId.codec
        .encode(value.typePartId)
        .concat(TagId.codec.encode(value.tagId)),
    decode: (
      index: number,
      binary: Uint8Array
    ): { readonly result: TagReference; readonly nextIndex: number } => {
      const typePartIdAndNextIndex: {
        readonly result: TypePartId;
        readonly nextIndex: number;
      } = TypePartId.codec.decode(index, binary);
      const tagIdAndNextIndex: {
        readonly result: TagId;
        readonly nextIndex: number;
      } = TagId.codec.decode(typePartIdAndNextIndex.nextIndex, binary);
      return {
        result: {
          typePartId: typePartIdAndNextIndex.result,
          tagId: tagIdAndNextIndex.result,
        },
        nextIndex: tagIdAndNextIndex.nextIndex,
      };
    },
  },
};

/**
 * 関数呼び出し
 */
export const FunctionCall: { readonly codec: Codec<FunctionCall> } = {
  codec: {
    encode: (value: FunctionCall): ReadonlyArray<number> =>
      Expr.codec
        .encode(value["function"])
        .concat(Expr.codec.encode(value.parameter)),
    decode: (
      index: number,
      binary: Uint8Array
    ): { readonly result: FunctionCall; readonly nextIndex: number } => {
      const functionAndNextIndex: {
        readonly result: Expr;
        readonly nextIndex: number;
      } = Expr.codec.decode(index, binary);
      const parameterAndNextIndex: {
        readonly result: Expr;
        readonly nextIndex: number;
      } = Expr.codec.decode(functionAndNextIndex.nextIndex, binary);
      return {
        result: {
          function: functionAndNextIndex.result,
          parameter: parameterAndNextIndex.result,
        },
        nextIndex: parameterAndNextIndex.nextIndex,
      };
    },
  },
};

/**
 * ラムダのブランチ. Just x -> data x のようなところ
 */
export const LambdaBranch: { readonly codec: Codec<LambdaBranch> } = {
  codec: {
    encode: (value: LambdaBranch): ReadonlyArray<number> =>
      Condition.codec
        .encode(value.condition)
        .concat(String.codec.encode(value.description))
        .concat(
          List.codec(BranchPartDefinition.codec).encode(value.localPartList)
        )
        .concat(Expr.codec.encode(value.expr)),
    decode: (
      index: number,
      binary: Uint8Array
    ): { readonly result: LambdaBranch; readonly nextIndex: number } => {
      const conditionAndNextIndex: {
        readonly result: Condition;
        readonly nextIndex: number;
      } = Condition.codec.decode(index, binary);
      const descriptionAndNextIndex: {
        readonly result: string;
        readonly nextIndex: number;
      } = String.codec.decode(conditionAndNextIndex.nextIndex, binary);
      const localPartListAndNextIndex: {
        readonly result: ReadonlyArray<BranchPartDefinition>;
        readonly nextIndex: number;
      } = List.codec(BranchPartDefinition.codec).decode(
        descriptionAndNextIndex.nextIndex,
        binary
      );
      const exprAndNextIndex: {
        readonly result: Expr;
        readonly nextIndex: number;
      } = Expr.codec.decode(localPartListAndNextIndex.nextIndex, binary);
      return {
        result: {
          condition: conditionAndNextIndex.result,
          description: descriptionAndNextIndex.result,
          localPartList: localPartListAndNextIndex.result,
          expr: exprAndNextIndex.result,
        },
        nextIndex: exprAndNextIndex.nextIndex,
      };
    },
  },
};

/**
 * ブランチの式を使う条件
 */
export const Condition: {
  /**
   * タグ
   */
  readonly ByTag: (a: ConditionTag) => Condition;
  /**
   * キャプチャパーツへのキャプチャ
   */
  readonly ByCapture: (a: ConditionCapture) => Condition;
  /**
   * _ すべてのパターンを通すもの
   */
  readonly Any: Condition;
  /**
   * 32bit整数の完全一致
   */
  readonly Int32: (a: number) => Condition;
  readonly codec: Codec<Condition>;
} = {
  ByTag: (conditionTag: ConditionTag): Condition => ({
    _: "ByTag",
    conditionTag: conditionTag,
  }),
  ByCapture: (conditionCapture: ConditionCapture): Condition => ({
    _: "ByCapture",
    conditionCapture: conditionCapture,
  }),
  Any: { _: "Any" },
  Int32: (int32: number): Condition => ({ _: "Int32", int32: int32 }),
  codec: {
    encode: (value: Condition): ReadonlyArray<number> => {
      switch (value._) {
        case "ByTag": {
          return [0].concat(ConditionTag.codec.encode(value.conditionTag));
        }
        case "ByCapture": {
          return [1].concat(
            ConditionCapture.codec.encode(value.conditionCapture)
          );
        }
        case "Any": {
          return [2];
        }
        case "Int32": {
          return [3].concat(Int32.codec.encode(value.int32));
        }
      }
    },
    decode: (
      index: number,
      binary: Uint8Array
    ): { readonly result: Condition; readonly nextIndex: number } => {
      const patternIndex: {
        readonly result: number;
        readonly nextIndex: number;
      } = Int32.codec.decode(index, binary);
      if (patternIndex.result === 0) {
        const result: {
          readonly result: ConditionTag;
          readonly nextIndex: number;
        } = ConditionTag.codec.decode(patternIndex.nextIndex, binary);
        return {
          result: Condition.ByTag(result.result),
          nextIndex: result.nextIndex,
        };
      }
      if (patternIndex.result === 1) {
        const result: {
          readonly result: ConditionCapture;
          readonly nextIndex: number;
        } = ConditionCapture.codec.decode(patternIndex.nextIndex, binary);
        return {
          result: Condition.ByCapture(result.result),
          nextIndex: result.nextIndex,
        };
      }
      if (patternIndex.result === 2) {
        return { result: Condition.Any, nextIndex: patternIndex.nextIndex };
      }
      if (patternIndex.result === 3) {
        const result: {
          readonly result: number;
          readonly nextIndex: number;
        } = Int32.codec.decode(patternIndex.nextIndex, binary);
        return {
          result: Condition.Int32(result.result),
          nextIndex: result.nextIndex,
        };
      }
      throw new Error("存在しないパターンを指定された 型を更新してください");
    },
  },
};

/**
 * タグによる条件
 */
export const ConditionTag: { readonly codec: Codec<ConditionTag> } = {
  codec: {
    encode: (value: ConditionTag): ReadonlyArray<number> =>
      TagId.codec
        .encode(value.tag)
        .concat(Maybe.codec(Condition.codec).encode(value.parameter)),
    decode: (
      index: number,
      binary: Uint8Array
    ): { readonly result: ConditionTag; readonly nextIndex: number } => {
      const tagAndNextIndex: {
        readonly result: TagId;
        readonly nextIndex: number;
      } = TagId.codec.decode(index, binary);
      const parameterAndNextIndex: {
        readonly result: Maybe<Condition>;
        readonly nextIndex: number;
      } = Maybe.codec(Condition.codec).decode(
        tagAndNextIndex.nextIndex,
        binary
      );
      return {
        result: {
          tag: tagAndNextIndex.result,
          parameter: parameterAndNextIndex.result,
        },
        nextIndex: parameterAndNextIndex.nextIndex,
      };
    },
  },
};

/**
 * キャプチャパーツへのキャプチャ
 */
export const ConditionCapture: { readonly codec: Codec<ConditionCapture> } = {
  codec: {
    encode: (value: ConditionCapture): ReadonlyArray<number> =>
      String.codec
        .encode(value.name)
        .concat(LocalPartId.codec.encode(value.localPartId)),
    decode: (
      index: number,
      binary: Uint8Array
    ): { readonly result: ConditionCapture; readonly nextIndex: number } => {
      const nameAndNextIndex: {
        readonly result: string;
        readonly nextIndex: number;
      } = String.codec.decode(index, binary);
      const localPartIdAndNextIndex: {
        readonly result: LocalPartId;
        readonly nextIndex: number;
      } = LocalPartId.codec.decode(nameAndNextIndex.nextIndex, binary);
      return {
        result: {
          name: nameAndNextIndex.result,
          localPartId: localPartIdAndNextIndex.result,
        },
        nextIndex: localPartIdAndNextIndex.nextIndex,
      };
    },
  },
};

/**
 * ラムダのブランチで使えるパーツを定義する部分
 */
export const BranchPartDefinition: {
  readonly codec: Codec<BranchPartDefinition>;
} = {
  codec: {
    encode: (value: BranchPartDefinition): ReadonlyArray<number> =>
      LocalPartId.codec
        .encode(value.localPartId)
        .concat(String.codec.encode(value.name))
        .concat(String.codec.encode(value.description))
        .concat(Type.codec.encode(value["type"]))
        .concat(Expr.codec.encode(value.expr)),
    decode: (
      index: number,
      binary: Uint8Array
    ): {
      readonly result: BranchPartDefinition;
      readonly nextIndex: number;
    } => {
      const localPartIdAndNextIndex: {
        readonly result: LocalPartId;
        readonly nextIndex: number;
      } = LocalPartId.codec.decode(index, binary);
      const nameAndNextIndex: {
        readonly result: string;
        readonly nextIndex: number;
      } = String.codec.decode(localPartIdAndNextIndex.nextIndex, binary);
      const descriptionAndNextIndex: {
        readonly result: string;
        readonly nextIndex: number;
      } = String.codec.decode(nameAndNextIndex.nextIndex, binary);
      const typeAndNextIndex: {
        readonly result: Type;
        readonly nextIndex: number;
      } = Type.codec.decode(descriptionAndNextIndex.nextIndex, binary);
      const exprAndNextIndex: {
        readonly result: Expr;
        readonly nextIndex: number;
      } = Expr.codec.decode(typeAndNextIndex.nextIndex, binary);
      return {
        result: {
          localPartId: localPartIdAndNextIndex.result,
          name: nameAndNextIndex.result,
          description: descriptionAndNextIndex.result,
          type: typeAndNextIndex.result,
          expr: exprAndNextIndex.result,
        },
        nextIndex: exprAndNextIndex.nextIndex,
      };
    },
  },
};

/**
 * 評価したときに失敗した原因を表すもの
 */
export const EvaluateExprError: {
  /**
   * 式を評価するには,このパーツの定義が必要だと言っている
   */
  readonly NeedPartDefinition: (a: PartId) => EvaluateExprError;
  /**
   * 式を評価するために必要なSuggestionPartが見つからない
   */
  readonly NeedSuggestionPart: (a: number) => EvaluateExprError;
  /**
   * 計算結果にblankが含まれている
   */
  readonly Blank: EvaluateExprError;
  /**
   * ローカルパーツの定義を見つけることができなかった
   */
  readonly CannotFindLocalPartDefinition: (
    a: LocalPartReference
  ) => EvaluateExprError;
  /**
   * 型が合わない
   */
  readonly TypeError: (a: TypeError) => EvaluateExprError;
  /**
   * まだサポートしていないものが含まれている
   */
  readonly NotSupported: EvaluateExprError;
  readonly codec: Codec<EvaluateExprError>;
} = {
  NeedPartDefinition: (partId: PartId): EvaluateExprError => ({
    _: "NeedPartDefinition",
    partId: partId,
  }),
  NeedSuggestionPart: (int32: number): EvaluateExprError => ({
    _: "NeedSuggestionPart",
    int32: int32,
  }),
  Blank: { _: "Blank" },
  CannotFindLocalPartDefinition: (
    localPartReference: LocalPartReference
  ): EvaluateExprError => ({
    _: "CannotFindLocalPartDefinition",
    localPartReference: localPartReference,
  }),
  TypeError: (typeError: TypeError): EvaluateExprError => ({
    _: "TypeError",
    typeError: typeError,
  }),
  NotSupported: { _: "NotSupported" },
  codec: {
    encode: (value: EvaluateExprError): ReadonlyArray<number> => {
      switch (value._) {
        case "NeedPartDefinition": {
          return [0].concat(PartId.codec.encode(value.partId));
        }
        case "NeedSuggestionPart": {
          return [1].concat(Int32.codec.encode(value.int32));
        }
        case "Blank": {
          return [2];
        }
        case "CannotFindLocalPartDefinition": {
          return [3].concat(
            LocalPartReference.codec.encode(value.localPartReference)
          );
        }
        case "TypeError": {
          return [4].concat(TypeError.codec.encode(value.typeError));
        }
        case "NotSupported": {
          return [5];
        }
      }
    },
    decode: (
      index: number,
      binary: Uint8Array
    ): { readonly result: EvaluateExprError; readonly nextIndex: number } => {
      const patternIndex: {
        readonly result: number;
        readonly nextIndex: number;
      } = Int32.codec.decode(index, binary);
      if (patternIndex.result === 0) {
        const result: {
          readonly result: PartId;
          readonly nextIndex: number;
        } = PartId.codec.decode(patternIndex.nextIndex, binary);
        return {
          result: EvaluateExprError.NeedPartDefinition(result.result),
          nextIndex: result.nextIndex,
        };
      }
      if (patternIndex.result === 1) {
        const result: {
          readonly result: number;
          readonly nextIndex: number;
        } = Int32.codec.decode(patternIndex.nextIndex, binary);
        return {
          result: EvaluateExprError.NeedSuggestionPart(result.result),
          nextIndex: result.nextIndex,
        };
      }
      if (patternIndex.result === 2) {
        return {
          result: EvaluateExprError.Blank,
          nextIndex: patternIndex.nextIndex,
        };
      }
      if (patternIndex.result === 3) {
        const result: {
          readonly result: LocalPartReference;
          readonly nextIndex: number;
        } = LocalPartReference.codec.decode(patternIndex.nextIndex, binary);
        return {
          result: EvaluateExprError.CannotFindLocalPartDefinition(
            result.result
          ),
          nextIndex: result.nextIndex,
        };
      }
      if (patternIndex.result === 4) {
        const result: {
          readonly result: TypeError;
          readonly nextIndex: number;
        } = TypeError.codec.decode(patternIndex.nextIndex, binary);
        return {
          result: EvaluateExprError.TypeError(result.result),
          nextIndex: result.nextIndex,
        };
      }
      if (patternIndex.result === 5) {
        return {
          result: EvaluateExprError.NotSupported,
          nextIndex: patternIndex.nextIndex,
        };
      }
      throw new Error("存在しないパターンを指定された 型を更新してください");
    },
  },
};

/**
 * 型エラー
 */
export const TypeError: { readonly codec: Codec<TypeError> } = {
  codec: {
    encode: (value: TypeError): ReadonlyArray<number> =>
      String.codec.encode(value.message),
    decode: (
      index: number,
      binary: Uint8Array
    ): { readonly result: TypeError; readonly nextIndex: number } => {
      const messageAndNextIndex: {
        readonly result: string;
        readonly nextIndex: number;
      } = String.codec.decode(index, binary);
      return {
        result: { message: messageAndNextIndex.result },
        nextIndex: messageAndNextIndex.nextIndex,
      };
    },
  },
};

/**
 * 評価する上で必要なソースコード
 */
export const EvalParameter: { readonly codec: Codec<EvalParameter> } = {
  codec: {
    encode: (value: EvalParameter): ReadonlyArray<number> =>
      List.codec(IdAndData.codec(PartId.codec, Part.codec))
        .encode(value.partList)
        .concat(
          List.codec(IdAndData.codec(TypePartId.codec, TypePart.codec)).encode(
            value.typePartList
          )
        )
        .concat(List.codec(Change.codec).encode(value.changeList))
        .concat(SuggestionExpr.codec.encode(value.expr)),
    decode: (
      index: number,
      binary: Uint8Array
    ): { readonly result: EvalParameter; readonly nextIndex: number } => {
      const partListAndNextIndex: {
        readonly result: ReadonlyArray<IdAndData<PartId, Part>>;
        readonly nextIndex: number;
      } = List.codec(IdAndData.codec(PartId.codec, Part.codec)).decode(
        index,
        binary
      );
      const typePartListAndNextIndex: {
        readonly result: ReadonlyArray<IdAndData<TypePartId, TypePart>>;
        readonly nextIndex: number;
      } = List.codec(IdAndData.codec(TypePartId.codec, TypePart.codec)).decode(
        partListAndNextIndex.nextIndex,
        binary
      );
      const changeListAndNextIndex: {
        readonly result: ReadonlyArray<Change>;
        readonly nextIndex: number;
      } = List.codec(Change.codec).decode(
        typePartListAndNextIndex.nextIndex,
        binary
      );
      const exprAndNextIndex: {
        readonly result: SuggestionExpr;
        readonly nextIndex: number;
      } = SuggestionExpr.codec.decode(changeListAndNextIndex.nextIndex, binary);
      return {
        result: {
          partList: partListAndNextIndex.result,
          typePartList: typePartListAndNextIndex.result,
          changeList: changeListAndNextIndex.result,
          expr: exprAndNextIndex.result,
        },
        nextIndex: exprAndNextIndex.nextIndex,
      };
    },
  },
};

/**
 * プロジェクト作成時に必要なパラメーター
 */
export const CreateProjectParameter: {
  readonly codec: Codec<CreateProjectParameter>;
} = {
  codec: {
    encode: (value: CreateProjectParameter): ReadonlyArray<number> =>
      AccessToken.codec
        .encode(value.accessToken)
        .concat(String.codec.encode(value.projectName)),
    decode: (
      index: number,
      binary: Uint8Array
    ): {
      readonly result: CreateProjectParameter;
      readonly nextIndex: number;
    } => {
      const accessTokenAndNextIndex: {
        readonly result: AccessToken;
        readonly nextIndex: number;
      } = AccessToken.codec.decode(index, binary);
      const projectNameAndNextIndex: {
        readonly result: string;
        readonly nextIndex: number;
      } = String.codec.decode(accessTokenAndNextIndex.nextIndex, binary);
      return {
        result: {
          accessToken: accessTokenAndNextIndex.result,
          projectName: projectNameAndNextIndex.result,
        },
        nextIndex: projectNameAndNextIndex.nextIndex,
      };
    },
  },
};

/**
 * アイデアを作成時に必要なパラメーター
 */
export const CreateIdeaParameter: {
  readonly codec: Codec<CreateIdeaParameter>;
} = {
  codec: {
    encode: (value: CreateIdeaParameter): ReadonlyArray<number> =>
      AccessToken.codec
        .encode(value.accessToken)
        .concat(String.codec.encode(value.ideaName))
        .concat(ProjectId.codec.encode(value.projectId)),
    decode: (
      index: number,
      binary: Uint8Array
    ): { readonly result: CreateIdeaParameter; readonly nextIndex: number } => {
      const accessTokenAndNextIndex: {
        readonly result: AccessToken;
        readonly nextIndex: number;
      } = AccessToken.codec.decode(index, binary);
      const ideaNameAndNextIndex: {
        readonly result: string;
        readonly nextIndex: number;
      } = String.codec.decode(accessTokenAndNextIndex.nextIndex, binary);
      const projectIdAndNextIndex: {
        readonly result: ProjectId;
        readonly nextIndex: number;
      } = ProjectId.codec.decode(ideaNameAndNextIndex.nextIndex, binary);
      return {
        result: {
          accessToken: accessTokenAndNextIndex.result,
          ideaName: ideaNameAndNextIndex.result,
          projectId: projectIdAndNextIndex.result,
        },
        nextIndex: projectIdAndNextIndex.nextIndex,
      };
    },
  },
};

/**
 * アイデアにコメントを追加するときに必要なパラメーター
 */
export const AddCommentParameter: {
  readonly codec: Codec<AddCommentParameter>;
} = {
  codec: {
    encode: (value: AddCommentParameter): ReadonlyArray<number> =>
      AccessToken.codec
        .encode(value.accessToken)
        .concat(IdeaId.codec.encode(value.ideaId))
        .concat(String.codec.encode(value.comment)),
    decode: (
      index: number,
      binary: Uint8Array
    ): { readonly result: AddCommentParameter; readonly nextIndex: number } => {
      const accessTokenAndNextIndex: {
        readonly result: AccessToken;
        readonly nextIndex: number;
      } = AccessToken.codec.decode(index, binary);
      const ideaIdAndNextIndex: {
        readonly result: IdeaId;
        readonly nextIndex: number;
      } = IdeaId.codec.decode(accessTokenAndNextIndex.nextIndex, binary);
      const commentAndNextIndex: {
        readonly result: string;
        readonly nextIndex: number;
      } = String.codec.decode(ideaIdAndNextIndex.nextIndex, binary);
      return {
        result: {
          accessToken: accessTokenAndNextIndex.result,
          ideaId: ideaIdAndNextIndex.result,
          comment: commentAndNextIndex.result,
        },
        nextIndex: commentAndNextIndex.nextIndex,
      };
    },
  },
};

/**
 * 提案を作成するときに必要なパラメーター
 */
export const AddSuggestionParameter: {
  readonly codec: Codec<AddSuggestionParameter>;
} = {
  codec: {
    encode: (value: AddSuggestionParameter): ReadonlyArray<number> =>
      AccessToken.codec
        .encode(value.accessToken)
        .concat(IdeaId.codec.encode(value.ideaId)),
    decode: (
      index: number,
      binary: Uint8Array
    ): {
      readonly result: AddSuggestionParameter;
      readonly nextIndex: number;
    } => {
      const accessTokenAndNextIndex: {
        readonly result: AccessToken;
        readonly nextIndex: number;
      } = AccessToken.codec.decode(index, binary);
      const ideaIdAndNextIndex: {
        readonly result: IdeaId;
        readonly nextIndex: number;
      } = IdeaId.codec.decode(accessTokenAndNextIndex.nextIndex, binary);
      return {
        result: {
          accessToken: accessTokenAndNextIndex.result,
          ideaId: ideaIdAndNextIndex.result,
        },
        nextIndex: ideaIdAndNextIndex.nextIndex,
      };
    },
  },
};

/**
 * 提案を更新するときに必要なパラメーター
 */
export const UpdateSuggestionParameter: {
  readonly codec: Codec<UpdateSuggestionParameter>;
} = {
  codec: {
    encode: (value: UpdateSuggestionParameter): ReadonlyArray<number> =>
      AccessToken.codec
        .encode(value.accessToken)
        .concat(SuggestionId.codec.encode(value.suggestionId))
        .concat(String.codec.encode(value.name))
        .concat(String.codec.encode(value.reason))
        .concat(List.codec(Change.codec).encode(value.changeList)),
    decode: (
      index: number,
      binary: Uint8Array
    ): {
      readonly result: UpdateSuggestionParameter;
      readonly nextIndex: number;
    } => {
      const accessTokenAndNextIndex: {
        readonly result: AccessToken;
        readonly nextIndex: number;
      } = AccessToken.codec.decode(index, binary);
      const suggestionIdAndNextIndex: {
        readonly result: SuggestionId;
        readonly nextIndex: number;
      } = SuggestionId.codec.decode(accessTokenAndNextIndex.nextIndex, binary);
      const nameAndNextIndex: {
        readonly result: string;
        readonly nextIndex: number;
      } = String.codec.decode(suggestionIdAndNextIndex.nextIndex, binary);
      const reasonAndNextIndex: {
        readonly result: string;
        readonly nextIndex: number;
      } = String.codec.decode(nameAndNextIndex.nextIndex, binary);
      const changeListAndNextIndex: {
        readonly result: ReadonlyArray<Change>;
        readonly nextIndex: number;
      } = List.codec(Change.codec).decode(reasonAndNextIndex.nextIndex, binary);
      return {
        result: {
          accessToken: accessTokenAndNextIndex.result,
          suggestionId: suggestionIdAndNextIndex.result,
          name: nameAndNextIndex.result,
          reason: reasonAndNextIndex.result,
          changeList: changeListAndNextIndex.result,
        },
        nextIndex: changeListAndNextIndex.nextIndex,
      };
    },
  },
};

/**
 * 提案を承認待ちにしたり許可したりするときなどに使う
 */
export const AccessTokenAndSuggestionId: {
  readonly codec: Codec<AccessTokenAndSuggestionId>;
} = {
  codec: {
    encode: (value: AccessTokenAndSuggestionId): ReadonlyArray<number> =>
      AccessToken.codec
        .encode(value.accessToken)
        .concat(SuggestionId.codec.encode(value.suggestionId)),
    decode: (
      index: number,
      binary: Uint8Array
    ): {
      readonly result: AccessTokenAndSuggestionId;
      readonly nextIndex: number;
    } => {
      const accessTokenAndNextIndex: {
        readonly result: AccessToken;
        readonly nextIndex: number;
      } = AccessToken.codec.decode(index, binary);
      const suggestionIdAndNextIndex: {
        readonly result: SuggestionId;
        readonly nextIndex: number;
      } = SuggestionId.codec.decode(accessTokenAndNextIndex.nextIndex, binary);
      return {
        result: {
          accessToken: accessTokenAndNextIndex.result,
          suggestionId: suggestionIdAndNextIndex.result,
        },
        nextIndex: suggestionIdAndNextIndex.nextIndex,
      };
    },
  },
};

/**
 * ProjectやUserなどのリソースの保存状態を表す
 */
export const Resource: {
  /**
   * データを取得済み
   */
  readonly Loaded: <data>(a: data) => Resource<data>;
  /**
   * データを取得できなかった (サーバーの障害, オフライン)
   */
  readonly Unknown: <data>() => Resource<data>;
  /**
   * indexedDBにアクセス待ち
   */
  readonly WaitLoading: <data>() => Resource<data>;
  /**
   * indexedDBにアクセス中
   */
  readonly Loading: <data>() => Resource<data>;
  /**
   * サーバに問い合わせ待ち
   */
  readonly WaitRequesting: <data>() => Resource<data>;
  /**
   * サーバに問い合わせ中
   */
  readonly Requesting: <data>() => Resource<data>;
  /**
   * 更新待ち
   */
  readonly WaitUpdating: <data>(a: data) => Resource<data>;
  /**
   * サーバーに問い合わせてリソースを更新中
   */
  readonly Updating: <data>(a: data) => Resource<data>;
  /**
   * Unknownだったリソースをサーバーに問い合わせ待ち
   */
  readonly WaitRetrying: <data>() => Resource<data>;
  /**
   * Unknownだったリソースをサーバーに問い合わせ中
   */
  readonly Retrying: <data>() => Resource<data>;
  readonly codec: <data>(a: Codec<data>) => Codec<Resource<data>>;
} = {
  Loaded: <data>(data: data): Resource<data> => ({ _: "Loaded", data: data }),
  Unknown: <data>(): Resource<data> => ({ _: "Unknown" }),
  WaitLoading: <data>(): Resource<data> => ({ _: "WaitLoading" }),
  Loading: <data>(): Resource<data> => ({ _: "Loading" }),
  WaitRequesting: <data>(): Resource<data> => ({ _: "WaitRequesting" }),
  Requesting: <data>(): Resource<data> => ({ _: "Requesting" }),
  WaitUpdating: <data>(data: data): Resource<data> => ({
    _: "WaitUpdating",
    data: data,
  }),
  Updating: <data>(data: data): Resource<data> => ({
    _: "Updating",
    data: data,
  }),
  WaitRetrying: <data>(): Resource<data> => ({ _: "WaitRetrying" }),
  Retrying: <data>(): Resource<data> => ({ _: "Retrying" }),
  codec: <data>(dataCodec: Codec<data>): Codec<Resource<data>> => ({
    encode: (value: Resource<data>): ReadonlyArray<number> => {
      switch (value._) {
        case "Loaded": {
          return [0].concat(dataCodec.encode(value.data));
        }
        case "Unknown": {
          return [1];
        }
        case "WaitLoading": {
          return [2];
        }
        case "Loading": {
          return [3];
        }
        case "WaitRequesting": {
          return [4];
        }
        case "Requesting": {
          return [5];
        }
        case "WaitUpdating": {
          return [6].concat(dataCodec.encode(value.data));
        }
        case "Updating": {
          return [7].concat(dataCodec.encode(value.data));
        }
        case "WaitRetrying": {
          return [8];
        }
        case "Retrying": {
          return [9];
        }
      }
    },
    decode: (
      index: number,
      binary: Uint8Array
    ): { readonly result: Resource<data>; readonly nextIndex: number } => {
      const patternIndex: {
        readonly result: number;
        readonly nextIndex: number;
      } = Int32.codec.decode(index, binary);
      if (patternIndex.result === 0) {
        const result: {
          readonly result: data;
          readonly nextIndex: number;
        } = dataCodec.decode(patternIndex.nextIndex, binary);
        return {
          result: Resource.Loaded(result.result),
          nextIndex: result.nextIndex,
        };
      }
      if (patternIndex.result === 1) {
        return {
          result: Resource.Unknown(),
          nextIndex: patternIndex.nextIndex,
        };
      }
      if (patternIndex.result === 2) {
        return {
          result: Resource.WaitLoading(),
          nextIndex: patternIndex.nextIndex,
        };
      }
      if (patternIndex.result === 3) {
        return {
          result: Resource.Loading(),
          nextIndex: patternIndex.nextIndex,
        };
      }
      if (patternIndex.result === 4) {
        return {
          result: Resource.WaitRequesting(),
          nextIndex: patternIndex.nextIndex,
        };
      }
      if (patternIndex.result === 5) {
        return {
          result: Resource.Requesting(),
          nextIndex: patternIndex.nextIndex,
        };
      }
      if (patternIndex.result === 6) {
        const result: {
          readonly result: data;
          readonly nextIndex: number;
        } = dataCodec.decode(patternIndex.nextIndex, binary);
        return {
          result: Resource.WaitUpdating(result.result),
          nextIndex: result.nextIndex,
        };
      }
      if (patternIndex.result === 7) {
        const result: {
          readonly result: data;
          readonly nextIndex: number;
        } = dataCodec.decode(patternIndex.nextIndex, binary);
        return {
          result: Resource.Updating(result.result),
          nextIndex: result.nextIndex,
        };
      }
      if (patternIndex.result === 8) {
        return {
          result: Resource.WaitRetrying(),
          nextIndex: patternIndex.nextIndex,
        };
      }
      if (patternIndex.result === 9) {
        return {
          result: Resource.Retrying(),
          nextIndex: patternIndex.nextIndex,
        };
      }
      throw new Error("存在しないパターンを指定された 型を更新してください");
    },
  }),
};

/**
 * キーであるTokenによってデータが必ず1つに決まるもの. 絶対に更新されない
 */
export const TokenResource: {
  /**
   * 取得済み
   */
  readonly Loaded: <data>(a: data) => TokenResource<data>;
  /**
   * データを取得できなかった (サーバーの障害, オフライン)
   */
  readonly Unknown: <data>() => TokenResource<data>;
  /**
   * indexedDBにアクセス待ち
   */
  readonly WaitLoading: <data>() => TokenResource<data>;
  /**
   * indexedDBにアクセス中
   */
  readonly Loading: <data>() => TokenResource<data>;
  /**
   * サーバに問い合わせ待ち
   */
  readonly WaitRequesting: <data>() => TokenResource<data>;
  /**
   * サーバに問い合わせ中
   */
  readonly Requesting: <data>() => TokenResource<data>;
  /**
   * Unknownだったリソースをサーバーに問い合わせ待ち
   */
  readonly WaitRetrying: <data>() => TokenResource<data>;
  /**
   * Unknownだったリソースをサーバーに問い合わせ中
   */
  readonly Retrying: <data>() => TokenResource<data>;
  readonly codec: <data>(a: Codec<data>) => Codec<TokenResource<data>>;
} = {
  Loaded: <data>(data: data): TokenResource<data> => ({
    _: "Loaded",
    data: data,
  }),
  Unknown: <data>(): TokenResource<data> => ({ _: "Unknown" }),
  WaitLoading: <data>(): TokenResource<data> => ({ _: "WaitLoading" }),
  Loading: <data>(): TokenResource<data> => ({ _: "Loading" }),
  WaitRequesting: <data>(): TokenResource<data> => ({ _: "WaitRequesting" }),
  Requesting: <data>(): TokenResource<data> => ({ _: "Requesting" }),
  WaitRetrying: <data>(): TokenResource<data> => ({ _: "WaitRetrying" }),
  Retrying: <data>(): TokenResource<data> => ({ _: "Retrying" }),
  codec: <data>(dataCodec: Codec<data>): Codec<TokenResource<data>> => ({
    encode: (value: TokenResource<data>): ReadonlyArray<number> => {
      switch (value._) {
        case "Loaded": {
          return [0].concat(dataCodec.encode(value.data));
        }
        case "Unknown": {
          return [1];
        }
        case "WaitLoading": {
          return [2];
        }
        case "Loading": {
          return [3];
        }
        case "WaitRequesting": {
          return [4];
        }
        case "Requesting": {
          return [5];
        }
        case "WaitRetrying": {
          return [6];
        }
        case "Retrying": {
          return [7];
        }
      }
    },
    decode: (
      index: number,
      binary: Uint8Array
    ): { readonly result: TokenResource<data>; readonly nextIndex: number } => {
      const patternIndex: {
        readonly result: number;
        readonly nextIndex: number;
      } = Int32.codec.decode(index, binary);
      if (patternIndex.result === 0) {
        const result: {
          readonly result: data;
          readonly nextIndex: number;
        } = dataCodec.decode(patternIndex.nextIndex, binary);
        return {
          result: TokenResource.Loaded(result.result),
          nextIndex: result.nextIndex,
        };
      }
      if (patternIndex.result === 1) {
        return {
          result: TokenResource.Unknown(),
          nextIndex: patternIndex.nextIndex,
        };
      }
      if (patternIndex.result === 2) {
        return {
          result: TokenResource.WaitLoading(),
          nextIndex: patternIndex.nextIndex,
        };
      }
      if (patternIndex.result === 3) {
        return {
          result: TokenResource.Loading(),
          nextIndex: patternIndex.nextIndex,
        };
      }
      if (patternIndex.result === 4) {
        return {
          result: TokenResource.WaitRequesting(),
          nextIndex: patternIndex.nextIndex,
        };
      }
      if (patternIndex.result === 5) {
        return {
          result: TokenResource.Requesting(),
          nextIndex: patternIndex.nextIndex,
        };
      }
      if (patternIndex.result === 6) {
        return {
          result: TokenResource.WaitRetrying(),
          nextIndex: patternIndex.nextIndex,
        };
      }
      if (patternIndex.result === 7) {
        return {
          result: TokenResource.Retrying(),
          nextIndex: patternIndex.nextIndex,
        };
      }
      throw new Error("存在しないパターンを指定された 型を更新してください");
    },
  }),
};
