import * as g from "graphql";
import { URL } from "url";
import * as crypto from "crypto";

/*  =============================================================
                            LogInService
    =============================================================
*/
const logInServiceValues = {
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

export type LogInService = keyof (typeof logInServiceValues);

export const logInServiceGraphQLType = new g.GraphQLEnumType({
    name: "AccountService",
    values: logInServiceValues,
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
    service: LogInService;
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
    image: Image;
    introduction: string;
    createdAt: Date;
    branches: Array<Branch>;
};

export type UserId = string & { __userIdBrand: never };
/*  =============================================================
                            Project
    =============================================================
*/
export type Project = {
    id: ProjectId;
    masterBranch: Branch;
    branches: Array<Branch>;
    taggedCommits: Array<Commit>;
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
};

export type BranchId = string & { __branchIdBrand: never };

/*  =============================================================
                            Commit
    =============================================================
*/

export type Commit = {
    hash: CommitHash;
    parentCommits: Array<Commit>;
    tag: null | CommitTagName | Version;
    projectName: string;
    projectDescription: string;
    author: User;
    date: Date;
    commitSummary: string;
    commitDescription: string;
    children: Array<{
        id: ModuleId;
        snapshot: ModuleSnapshot;
    }>;
    typeDefs: Array<{
        id: TypeId;
        snapshot: TypeDefSnapshot;
    }>;
    partDefs: Array<{
        id: PartId;
        snapshot: PartDefSnapshot;
    }>;
    dependencies: Array<Dependency>;
};

export type CommitHash = string & { __commitObjectBrand: never };

export type CommitTagName = {
    text: string;
};

export type Dependency = {
    project: Project;
    version: DependencyVersion;
};

/** 他のプロジェクトを利用するときに指定するバージョンの形式。メジャーバージョンだけを維持して最新のものを指定するのがデフォルト(メジャーが0のときはマイナーまで固定) 開発バージョンやバージョンがpatchまで完全一致に指定することも可能 */
export type DependencyVersion = InitialRelease | Release | Version;

export type InitialRelease = { type: "initialRelease"; minor: number };

export type Release = { type: "release"; major: number };

export type Version = {
    major: number;
    minor: number;
    patch: number;
};

/*  =============================================================
                        Module Snapshot
    =============================================================
*/
/** 0～fで64文字 256bit SHA-256のハッシュ値 */
export type ModuleSnapshotHash = string & { __moduleObjectHashBrand: never };

export type ModuleSnapshot = {
    hash: ModuleSnapshotHash;
    name: Label;
    children: Array<{
        id: ModuleId;
        snapshot: ModuleSnapshot;
    }>;
    typeDefs: Array<{
        id: TypeId;
        snapshot: TypeDefSnapshot;
    }>;
    partDefs: Array<{
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
    tags: Array<TypeBodyTag>;
};

export type TypeBodyTag = {
    name: Label;
    description: string;
    parameter: Array<TypeTermOrParenthesis>;
};

export type TypeBodyKernel = {
    type: "kernel";
    kernelType: KernelType;
};

export type KernelType = keyof (typeof kernelTypeValues);

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
    type: Array<TypeTermOrParenthesis>;
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
    value: Array<TermOrParenthesis>;
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
                            Image
    =============================================================
*/
export type Image = {
    hash: FileHash;
    base64EncodedPng: Base64EncodedPng;
};

export type FileHash = string & { __fileHashBrand: never };
/*  =============================================================
                            Id
    =============================================================
*/
/**
 * Id。各種リソースを識別するために使うID。
 * URLでも使うので、大文字と小文字の差を持たせるべきではないので。小文字に統一して、大文字は一切使わない。長さは24文字
 */
export const createRandomId = (): string => {
    let id = "";
    const chars = "0123456789abcdefghijklmnopqrstuvwxyz";
    for (let i = 0; i < 24; i++) {
        id += chars[Math.floor(Math.random() * chars.length)];
    }
    return id;
};

const idTypeConfig: g.GraphQLScalarTypeConfig<string, string> = {
    name: "Id",
    description:
        "Id。各種リソースを識別するために使うID。使う文字はabcdefghijklmnopqrstuvwxyz0123456789。長さは24文字",
    serialize: (value: string): string => value,
    parseValue: (value: unknown): string => {
        if (typeof value !== "string") {
            throw new Error("id must be string");
        }
        if (value.length !== 24) {
            throw new Error("Id length must be 24");
        }
        for (const char of value) {
            if (!"abcdefghijklmnopqrstuvwxyz0123456789".includes(char)) {
                throw new Error("Id char must be match /[a-zA-Z0-9]/");
            }
        }
        return value;
    }
};

export const idGraphQLType = new g.GraphQLScalarType(idTypeConfig);

/*  =============================================================
                            Hash
    =============================================================
*/
const hashTypeConfig: g.GraphQLScalarTypeConfig<string, string> = {
    name: "Hash",
    description:
        "SHA-256で得られたハッシュ値。hexスタイル。16進数でa-fは小文字、64文字",
    serialize: (value: string): string => value,
    parseValue: (value: unknown): string => {
        if (typeof value !== "string") {
            throw new Error("Hash must be string");
        }
        if (value.length !== 64) {
            throw new Error("Hash length must be 64");
        }
        for (const char of value) {
            if ("0123456789abcdef".includes(char)) {
                throw new Error("Hash char must match /[0-9a-f]/");
            }
        }
        return value;
    }
};

export const hashGraphQLType = new g.GraphQLScalarType(hashTypeConfig);

/* ==========================================
                SHA-256 Hash
   ==========================================
*/
export const createHash = (data: unknown): string =>
    crypto
        .createHash("sha256")
        .update(JSON.stringify(data))
        .digest("hex");

export const createHashFromBuffer = (data: Buffer): string =>
    crypto
        .createHash("sha256")
        .update(data)
        .digest("hex");

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
export const accessTokenDescription =
    "アクセストークン。getLogInUrlで取得したログインURLのページからリダイレクトするときのクエリパラメータについてくる。";
