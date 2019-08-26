import * as g from "graphql";
import { URL } from "url";
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
    service: LogInService;
    serviceId: string;
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
    leaderProjects: Array<Project>;
    editingProjects: Array<Project>;
};

export type UserId = Id & { __userIdBrand: never };
/*  =============================================================
                            Project
    =============================================================
*/
export type Project = {
    id: ProjectId;
    masterBranch: Branch;
    branches: Array<Branch>;
};

export type ProjectId = Id & { __projectIdBrand: never };

export type Branch = {
    id: BranchId;
    name: Label;
    description: string;
    head: Commit;
};

export type BranchId = Id & { __branchIdBrand: never };

export type Commit = {
    id: CommitId;
    parentCommits: Array<Commit>;
    tag: null | string | Version;
    projectName: string;
    projectDescription: string;
    author: User;
    date: Date;
    commitSummary: string;
    commitDescription: string;
    typeData: Array<{
        typeId: TypeId;
        module: Module;
        name: Label;
        type: TypeBody;
    }>;
    partData: Array<{
        partId: PartId;
        module: Module;
        name: Label;
        type: Type;
        expr: Expr;
    }>;
    modules: Array<Module>;
    dependencies: Array<{
        projectId: ProjectId;
        version: DependencyVersion;
    }>;
};

export type CommitId = Id & { __commitIdBrand: never };

/** 他のプロジェクトを利用するときに指定するバージョンの形式。メジャーバージョンだけを維持して最新のものを指定するのがデフォルト(メジャーが0のときはマイナーまで固定) 開発バージョンやバージョンがpatchまで完全一致に指定することも可能 */
export type DependencyVersion =
    | { type: "initialRelease"; major: 0; minor: number }
    | { type: "release"; major: number }
    | { type: "commitWithTag"; tag: string | Version };

export type Version = {
    major: number;
    minor: number;
    patch: number;
};

/**
 * 正式版のプロジェクト
 */
export type ReleaseProject = {
    id: ReleaseProjectId;
    name: Label;
    leader: User;
    editors: Array<User>;
    project: Project;
    modules: Array<Module>;
    createdAt: Date;
    dependencies: Array<Project>;
};

export type ReleaseProjectId = Id & { __preReleaseProjectBrand: never };
/*  =============================================================
                            Module
    =============================================================
*/
export type Module = {
    id: ModuleId;
    name: Array<Label>;
    project: Project;
    editors: Array<User>;
    createdAt: Date;
    updateAt: Date;
    description: string;
};

export type ModuleId = Id & { __moduleIdBrand: never };
/*  =============================================================
                             Type Body
    =============================================================
*/
export type TypeId = Id & { __typeIdBrand: never };

export type TypeBody = {
    id: TypeBodyId;
    name: Label;
};

export type TypeBodyId = Id & { __typeBodyIdBrand: never };
/*  =============================================================
                         Part Definition
    =============================================================
*/

export type PartDefinition = {
    id: PartId;
    name: Label;
    createdAt: Date;
    type: Array<Type>;
    expr: Expr;
};

export type PartId = Id & { __partIdBrand: never };

export type Type =
    | {
          type: "core";
          value: "number";
      }
    | { type: "func"; value: Array<Type> };

export type Expr = {
    id: ExprId;
    value: Array<TermOrParenthesis>;
};

export type ExprId = Id & { __partExprBrand: never };

type TermOrParenthesis =
    | { type: "(" }
    | { type: ")" }
    | { type: "int32"; value: number }
    | { type: "core"; value: "add" | "sub" | "mul" | "div" };
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
    id: ImageId;
    base64EncodedPng: Base64EncodedPng;
};

export type ImageId = Id & { __imageIdBrand: never };
/*  =============================================================
                            Id
    =============================================================
*/
/**
 * Id。各種リソースを識別するために使うID。
 * URLでも使うので、大文字と小文字の差を持たせるべきではないので。小文字に統一して、大文字は一切使わない。長さは24文字
 */
export type Id = string & { __idBrand: never };

export const idFromString = (string: string): Id => string as Id;

export const createRandomId = (): Id => {
    let id = "";
    const chars = "0123456789abcdefghijklmnopqrstuvwxyz";
    for (let i = 0; i < 24; i++) {
        id += chars[Math.floor(Math.random() * chars.length)];
    }
    return id as Id;
};

const idTypeConfig: g.GraphQLScalarTypeConfig<Id, string> = {
    name: "Id",
    description:
        "Id。各種リソースを識別するために使うID。URLでも使うので、大文字と小文字の差を持たせるべきではないので。小文字に統一して、大文字は一切使わない。長さは24文字",
    serialize: (value: Id): string => value,
    parseValue: (value: string): Id => {
        if (value.length <= 0) {
            throw new Error("Id length must be 0 < length");
        }
        for (const char of value) {
            if (
                !"abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789".includes(
                    char
                )
            ) {
                throw new Error("Id char must be match /[a-zA-Z0-9]/");
            }
        }
        return value as Id;
    }
};

export const idGraphQLType = new g.GraphQLScalarType(idTypeConfig);
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
