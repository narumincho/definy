import * as g from "graphql";
import { URL } from "url";
import * as crypto from "crypto";

/*  =============================================================
                        SocialLoginService
    =============================================================
*/
const socialLoginServiceValues = {
    google: {
        description:
            "Google https://developers.google.com/identity/sign-in/web/"
    },
    gitHub: {
        description:
            "GitHub https://developer.github.com/v3/guides/basics-of-authentication/"
    },
    line: {
        description: "LINE https://developers.line.biz/ja/docs/line-login/"
    }
};

export type SocialLoginService = keyof typeof socialLoginServiceValues;

export const logInServiceGraphQLType = new g.GraphQLEnumType({
    name: "SocialLoginService",
    values: socialLoginServiceValues,
    description: "ソーシャルログインを提供するサービス"
});
/*  =============================================================
                       LogInServiceAndId
    =============================================================
*/
/**
 * ソーシャルログインで利用するサービス名とそのアカウントIDをセットにしたもの
 */
export type LogInServiceAndId = {
    /** サービスの種類 */
    service: SocialLoginService;
    /** サービス内でのアカウントID */
    accountId: string;
};

/*
    Graph QL で使うような相互に参照するものも作れる型
*/
/*  =============================================================
                            User
    =============================================================
*/
export type User = {
    id: UserId;
    name: UserName;
    imageFileHash: FileHash;
    introduction: string;
    createdAt: Date;
    branches: ReadonlyArray<Branch>;
};

export type UserId = string & { __userIdBrand: never };
/*  =============================================================
                            Project
    =============================================================
*/
export type Project = {
    id: ProjectId;
    masterBranch: Branch;
    branches: ReadonlyArray<Branch>;
    taggedCommits: ReadonlyArray<Commit>; // ブランチのコミットを全て走査しなくていいように
};

export type ProjectId = string & { __projectIdBrand: never };

/*  =============================================================
                            Branch
    =============================================================
*/

export type Branch = {
    id: BranchId;
    name: Label;
    project: Project;
    description: string;
    head: Commit;
    owner: User;
    draftCommit: null | DraftCommit;
};

export type BranchId = string & { __branchIdBrand: never };

/*  =============================================================
                            Commit
    =============================================================
*/

export type Commit = {
    hash: CommitHash;
    /** 親コミット */
    parentCommits: ReadonlyArray<Commit>;
    /** リリースID */
    releaseId: null | ReleaseId;
    /** 作成者 */
    author: User;
    /** 作成日時 */
    date: Date;
    /** コミットの説明 最大1000文字 */
    description: string;
    /** プロジェクト名 最大50文字 */
    projectName: string;
    /** プロジェクトのアイコン */
    projectIcon: FileHash | null;
    /** プロジェクトの画像 */
    projectImage: FileHash | null;
    /** プロジェクトの簡潔な説明 最大150文字 */
    projectSummary: string;
    /** プロジェクトの詳しい説明 最大1000文字 */
    projectDescription: string;
    /** 直下以外のモジュール 最大3000こ */
    children: ReadonlyArray<{
        id: ModuleId;
        snapshot: ModuleSnapshot;
    }>;
    /** 直下の型定義 最大300こ */
    typeDefs: ReadonlyArray<{
        id: TypeId;
        snapshot: TypeDefSnapshot;
    }>;
    /** 直下のパーツ定義 最大5000こ */
    partDefs: ReadonlyArray<{
        id: PartId;
        snapshot: PartDefSnapshot;
    }>;
    /** 依存プロジェクト 最大1000こ */
    dependencies: ReadonlyArray<Dependency>;
};

export type CommitHash = string & { __commitObjectHashBrand: never };

/** ブランチに対して1つまで? indexともいう。他人のドラフトコミットは見れない。プロジェクト名を決めずにやれると速くて便利
 * 作者はブランチの所有者と同じになるのでいらない
 * ドキュメントサイズ最大 1,048,576byte
 */
export type DraftCommit = {
    hash: DraftCommitHash;
    /** 作成日時 (この値を使ってハッシュ値を求めてしまうと編集していないのに変更したと判定されてしまう) */
    date: Date;
    /** コミットの説明 最大1000文字 */
    description: string;
    /** リリースとして公開する予定か */
    isRelease: boolean;
    /** プロジェクト名 最大50文字 */
    projectName: string;
    /** プロジェクトのアイコン */
    projectIcon: FileHash;
    /** プロジェクトの画像 */
    projectImage: FileHash;
    /** プロジェクトの簡潔な説明 最大150文字 */
    projectSummary: string;
    /** プロジェクトの詳しい説明 最大1000文字 */
    projectDescription: string;
    /** 直下以外のモジュール 最大3000こ */
    children: ReadonlyArray<{
        id: ModuleId;
        snapshot: ModuleSnapshot;
    }>;
    /** 直下の型定義 最大300こ */
    typeDefs: ReadonlyArray<{
        id: TypeId;
        snapshot: TypeDefSnapshot;
    }>;
    /** 直下のパーツ定義 最大5000こ */
    partDefs: ReadonlyArray<{
        id: PartId;
        snapshot: PartDefSnapshot;
    }>;
    /** 依存プロジェクト 最大1000こ */
    dependencies: ReadonlyArray<Dependency>;
};

export type DraftCommitHash = string & { __draftCommitIdBrand: never };

export type Dependency = {
    project: Project; //32Byte
    releaseId: ReleaseId; // 32Byte
};

/** リリースしているコミットを表すもの。依存プロジェクトのバージョンを表すのに使う
 */
export type ReleaseId = string & { __releaseIdBrand: never };

/*  =============================================================
                        Module Snapshot
    =============================================================
*/
/** 0～fで64文字 256bit SHA-256のハッシュ値 */
export type ModuleSnapshotHash = string & { __moduleObjectHashBrand: never };

export type ModuleSnapshot = {
    hash: ModuleSnapshotHash;
    name: Label;
    children: ReadonlyArray<{
        id: ModuleId;
        snapshot: ModuleSnapshot;
    }>;
    typeDefs: ReadonlyArray<{
        id: TypeId;
        snapshot: TypeDefSnapshot;
    }>;
    partDefs: ReadonlyArray<{
        id: PartId;
        snapshot: PartDefSnapshot;
    }>;
    description: string;
    exposing: boolean;
};

export type ModuleId = string & { __moduleIdBrand: never };
/*  =============================================================
                        Type Def Snapshot
    =============================================================
*/
export type TypeId = string & { __typeIdBrand: never };

export type TypeDefSnapshot = {
    hash: TypeDefSnapshotHash;
    name: Label;
    description: string;
    body: TypeBody;
};

/** 0～fで64文字 256bit SHA-256のハッシュ値 */
export type TypeDefSnapshotHash = string & { __typeDefObjectBrand: never };

export type TypeBody = TypeBodyTags | TypeBodyKernel;

export type TypeBodyTags = {
    type: "tag";
    tags: ReadonlyArray<TypeBodyTag>;
};

export type TypeBodyTag = {
    name: Label;
    description: string;
    parameter: ReadonlyArray<TypeTermOrParenthesis>;
};

export type TypeBodyKernel = {
    type: "kernel";
    kernelType: KernelType;
};

export type KernelType = keyof typeof kernelTypeValues;

const kernelTypeValues = {
    jsNumber: {
        description: "JavaScriptのnumber"
    },
    jsString: {
        description: "JavaScriptのstring"
    },
    jsArray: {
        description: "JavaScriptのArray"
    },
    jsFunction: {
        description: "JavaScriptのFunction"
    }
};

export const kernelTypeGraphQLType = new g.GraphQLEnumType({
    name: "KernelType",
    description: "内部で表現された型",
    values: kernelTypeValues
});
/*  =============================================================
                        Part Def Snapshot
    =============================================================
*/

export type PartDefSnapshot = {
    hash: PartDefSnapshotHash;
    name: Label;
    description: string;
    type: ReadonlyArray<TypeTermOrParenthesis>;
    expr: ExprSnapshot;
};

/** 0～fで64文字 256bit SHA-256のハッシュ値 */
export type PartDefSnapshotHash = string & { __partDefObjectBrand: never };

export type PartId = string & { __partIdBrand: never };

export type TypeTermOrParenthesis =
    | TypeTermParenthesisStart
    | TypeTermParenthesisEnd
    | TypeTermRef;

export type TypeTermParenthesisStart = {
    type: "(";
};

export type TypeTermParenthesisEnd = {
    type: ")";
};

export type TypeTermRef = { type: "ref"; typeId: TypeId };
/*  =============================================================
                            Expr Snapshot
    =============================================================
*/
export type ExprSnapshot = {
    hash: ExprSnapshotHash;
    value: ReadonlyArray<TermOrParenthesis>;
};

/** 0～fで64文字 256bit SHA-256のハッシュ値 */
export type ExprSnapshotHash = string & { __exprObjectHashBrand: never };

export type TermOrParenthesis =
    | TermParenthesisStart
    | TermParenthesisEnd
    | TermNumber
    | TermPartRef
    | TermKernel;

export type TermParenthesisStart = { type: "(" };
export type TermParenthesisEnd = { type: ")" };
export type TermNumber = { type: "number"; value: number };
export type TermPartRef = { type: "part"; partId: PartId };
export type TermKernel = { type: "kernel"; value: KernelTerm };

const kernelTermValues = {
    add: {
        description: "+"
    },
    sub: {
        description: "-"
    },
    mul: {
        description: "*"
    },
    div: {
        description: "/"
    }
};

export type KernelTerm = keyof typeof kernelTermValues;

export const kernelTermGraphQLType = new g.GraphQLEnumType({
    name: "KernelTerm",
    description: "内部で表現された項",
    values: kernelTermValues
});
/*  =============================================================
                            Label
    =============================================================
*/
/**
 * Definyでよく使う識別子 最初の1文字はアルファベット、それ以降は数字と大文字アルファベット、小文字のアルファベット。1文字以上63文字以下
 */
export type Label = string & { __simpleNameBrand: never };

export const labelFromString = (text: string): Label => {
    if (text.length < 1) {
        throw new Error(`Label is empty. Label length must be 1～63`);
    }
    if (63 < text.length) {
        throw new Error(
            `Label(=${text}) length is ${text.length}. too long. Label length must be 1～63`
        );
    }
    if (!"abcdefghijklmnopqrstuvwxyz".includes(text[0])) {
        throw new Error("Label first char must be match /[a-z]/");
    }
    for (const char of text.substring(1)) {
        if (
            !"abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789".includes(
                char
            )
        ) {
            throw new Error("Label char must be match /[a-zA-Z0-9]/");
        }
    }
    return text as Label;
};

const labelTypeConfig: g.GraphQLScalarTypeConfig<Label, string> = {
    name: "Label",
    description:
        "Definyでよく使う識別子 最初の1文字はアルファベット、それ以降は数字と大文字アルファベット、小文字のアルファベット。1文字以上63文字以下",
    serialize: (value: Label) => value,
    parseValue: (value: string) => labelFromString(value)
};

export const labelGraphQLType = new g.GraphQLScalarType(labelTypeConfig);
/*  =============================================================
                            UserName
    =============================================================
*/
export type UserName = string & { __userNameBrand: never };

export const userNameFromString = (text: string): UserName => {
    if (text.trim() !== text) {
        throw new Error("UserName contains spaces at both ends");
    }
    if (/[\u{0000}-\u{001f}]/u.test(text)) {
        throw new Error(
            `UserName contains ASCII control characters (U+0000 to U+001F)`
        );
    }
    if (text.length < 1) {
        throw new Error(`UserName is empty. UserName length must be 1～50`);
    }
    if (50 < text.length) {
        throw new Error(
            `UserName(=${text}) length is ${text.length}. too long. Label length must be 1～63`
        );
    }
    return text as UserName;
};

const userNameTypeConfig: g.GraphQLScalarTypeConfig<UserName, string> = {
    name: "UserName",
    description:
        "ユーザー名。ASCIIの制御文字U+0000～U+001Fを含めることができない。両端に空白を含めることができない。長さは1～50文字。すべて空白の名前はできない",
    serialize: (value: UserName) => value,
    parseValue: (value: string) => userNameFromString(value)
};

export const userNameGraphQLType = new g.GraphQLScalarType(userNameTypeConfig);
/*  =============================================================
                            Id
    =============================================================
*/
/**
 * Id。各種リソースを識別するために使うID。UUID(v4)やIPv6と同じ128bit, 16bytes
 * 小文字に統一して、大文字は使わない。長さは32文字
 */
export const createRandomId = (): string => {
    return crypto.randomBytes(16).toString("hex");
};

const idTypeConfig: g.GraphQLScalarTypeConfig<string, string> = {
    name: "Id",
    description:
        "Id。各種リソースを識別するために使うID。使う文字は0123456789abcdef。長さは32文字",
    serialize: (value: string): string => value,
    parseValue: (value: unknown): string => {
        if (typeof value !== "string") {
            throw new Error("id must be string");
        }
        if (value.length !== 32) {
            throw new Error("Id length must be 32");
        }
        for (const char of value) {
            if (!"0123456789abcdef".includes(char)) {
                throw new Error("Id char must be match /[0-9a-f]/");
            }
        }
        return value;
    }
};

export const idGraphQLType = new g.GraphQLScalarType(idTypeConfig);

/*  =============================================================
                        File Hash
    =============================================================
*/
export const parseFileHash = (value: unknown): FileHash => {
    if (typeof value !== "string") {
        throw new Error("Hash must be string");
    }
    if (value.length !== 64) {
        throw new Error("Hash length must be 64");
    }
    for (const char of value) {
        if (!"0123456789abcdef".includes(char)) {
            throw new Error("Hash char must match /[0-9a-f]/");
        }
    }
    return value as FileHash;
};

export type FileHash = string & { __hashBrand: never };

const fileHashTypeConfig: g.GraphQLScalarTypeConfig<FileHash, string> = {
    name: "Hash",
    description:
        "SHA-256で得られたハッシュ値。hexスタイル。16進数でa-fは小文字、64文字",
    serialize: (value: FileHash): string => value,
    parseValue: parseFileHash
};

export const hashGraphQLType = new g.GraphQLScalarType(fileHashTypeConfig);

export const fileHashDescription =
    "https://us-central1-definy-lang.cloudfunctions.net/file/{hash} のURLからファイルを得ることができる";
/* ==========================================
                SHA-256 Hash
   ==========================================
*/
export const createHash = (data: unknown): string =>
    crypto
        .createHash("sha256")
        .update(JSON.stringify(data))
        .digest("hex");

export const createHashFromBuffer = (
    data: Buffer,
    mimeType: string
): FileHash =>
    crypto
        .createHash("sha256")
        .update(data)
        .update(mimeType, "utf8")
        .digest("hex") as FileHash;

/*  =============================================================
                            DateTime
    =============================================================
*/
const dateTimeTypeConfig: g.GraphQLScalarTypeConfig<Date, number> = {
    name: "DateTime",
    description:
        "日付と時刻。1970年1月1日 00:00:00 UTCから指定した日時までの経過時間をミリ秒で表した数値 2038年問題を回避するために64bitFloatの型を使う",
    serialize: (value: Date): number => value.getTime(),
    parseValue: (value: number): Date => new Date(value),
    parseLiteral: ast => {
        if (ast.kind === "FloatValue" || ast.kind === "IntValue") {
            try {
                return new Date(Number.parseInt(ast.value));
            } catch {
                return null;
            }
        }
        return null;
    }
};

export const dateTimeGraphQLType = new g.GraphQLScalarType(dateTimeTypeConfig);
/*  =============================================================
                        Base64Encoded Png
    =============================================================
*/

export type Base64EncodedPng = string & { __base64EncodedBrand: never };

export const base64EncodedPngFromString = (value: string) =>
    value as Base64EncodedPng;

const base64EncodedPngTypeConfig: g.GraphQLScalarTypeConfig<
    Base64EncodedPng,
    string
> = {
    name: "Base64EncodedPng",
    description: "Base64で表現されたPNG画像",
    serialize: (value: Base64EncodedPng): string => value,
    parseValue: (value: string): Base64EncodedPng => {
        console.log(`parseValue:${value}`);
        return value as Base64EncodedPng;
    },
    parseLiteral: ast => {
        console.log(`parseLiteral:${ast}`);
        if (ast.kind === "StringValue") {
            return ast.value as Base64EncodedPng;
        }
        return null;
    }
};

export const base64EncodedPngGraphQLType = new g.GraphQLScalarType(
    base64EncodedPngTypeConfig
);
/*  =============================================================
                                URL
    =============================================================
*/
const urlTypeScalarTypeConfig: g.GraphQLScalarTypeConfig<URL, string> = {
    name: "URL",
    description: `URL 文字列で指定する 例"https://narumincho.com/definy/spec.html"`,
    serialize: (url: URL): string => url.toString(),
    parseValue: (value: string): URL => new URL(value)
};

export const urlGraphQLType = new g.GraphQLScalarType(urlTypeScalarTypeConfig);
/*  =============================================================
                            AccessToken
    =============================================================
*/
export const createAccessToken = (): AccessToken => {
    return crypto.randomBytes(24).toString("hex") as AccessToken;
};

export const hashAccessToken = (accessToken: AccessToken): AccessTokenHash =>
    crypto
        .createHash("sha256")
        .update(accessTokenToTypedArray(accessToken))
        .digest("hex") as AccessTokenHash;

const accessTokenToTypedArray = (accessToken: AccessToken): Uint8Array => {
    const binary = new Uint8Array(24);
    for (let i = 0; i < 24; i++) {
        binary[i] = Number.parseInt(accessToken.slice(i, i + 2), 16);
    }
    return binary;
};

export const accessTokenDescription =
    "アクセストークン。getLogInUrlで取得したログインURLのページからリダイレクトするときのクエリパラメータについてくる。個人的なデータにアクセスするときに必要。使う文字は0123456789abcdef。長さは48文字";

const accessTokenTypeConfig: g.GraphQLScalarTypeConfig<string, string> = {
    name: "AccessToken",
    description: accessTokenDescription,
    serialize: (value: string): string => value,
    parseValue: (value: unknown): string => {
        if (typeof value !== "string") {
            throw new Error("AccessToken must be string");
        }
        if (value.length !== 48) {
            throw new Error("AccessToken length must be 48");
        }
        for (const char of value) {
            if (!"0123456789abcdef".includes(char)) {
                throw new Error("AccessToken char must be match /[0-9a-f]/");
            }
        }
        return value;
    }
};

export const accessTokenGraphQLType = new g.GraphQLScalarType(
    accessTokenTypeConfig
);

export type AccessToken = string & { __accessTokenBrand: never };

export type AccessTokenHash = string & { __accessTokenHashBrand: never };
