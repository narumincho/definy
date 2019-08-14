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

export const logInServiceAndIdToString = (
    logInAccountServiceId: LogInServiceAndId
) => logInAccountServiceId.service + "_" + logInAccountServiceId.serviceId;

/*  =============================================================
                            User
    =============================================================
*/
export type User = {
    id: Id;
    name: Label;
    image: Image;
    createdAt: Date;
    leaderProjects: Array<Project>;
    editingProjects: Array<Project>;
};

/*  =============================================================
                            Project
    =============================================================
*/
export type Project = {
    id: Id;
    name: Label;
    leader: User;
    editor: Array<User>;
    createdAt: Date;
    rootModule: Module;
};

/*  =============================================================
                            Module
    =============================================================
*/
export type Module = {
    id: Id;
    name: Label;
    childModules: Array<Module>;
    editor: Array<User>;
    createdAt: Date;
    updateAt: Date;
};

/*  =============================================================
                         Type Definition
    =============================================================
*/
type TypeDefinition = {
    id: Id;
    name: Label;
};

type TypeValue = {
    versionId: Id;
    versionDate: Date;
    name: Label;
    value: Array<Label>;
};
/*  =============================================================
                         Part Definition
    =============================================================
*/

type PartDefinition = {
    id: Id;
    name: Label;
    createdAt: PartDefinition;
};
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
        throw new Error(`label is empty. label length must be 1～63`);
    }
    if (63 < text.length) {
        throw new Error(
            `label(=${text}) length is ${
                text.length
            }. too long. label length must be 1～63`
        );
    }
    if (!"abcdefghijklmnopqrstuvwxyz".includes(text[0])) {
        throw new Error("label first char must be match /[a-z]/");
    }
    for (const char of text.substring(1)) {
        if (
            !"abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789".includes(
                char
            )
        ) {
            throw new Error("label char must be match /[a-zA-Z0-9]/");
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
                            Image
    =============================================================
*/
export type Image = {
    id: string;
    base64EncodedPng: Base64EncodedPng;
};

type ImageIO = {
    id: string;
    base64EncodedPng: Base64EncodedPng;
};
/** ===================================
 *            Id
 * ====================================
 */
/**
 * Id。各種リソースを識別するために使うID。
 * URLでも使うので、大文字と小文字の差を持たせるべきではないので。小文字に統一して、大文字は一切使わない。長さは24文字
 */
export type Id = string & { idBrand: never };

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
                throw new Error("label char must be match /[a-zA-Z0-9]/");
            }
        }
        return value as Id;
    }
};

export const idGraphQLType = new g.GraphQLScalarType(idTypeConfig);
/** ===================================
 *            DateTime
 * ====================================
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
/** ===================================
 *          Base64Encoded Png
 * ====================================
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

/*  ===================================
 *              URL
 * ====================================
 */
const urlTypeScalarTypeConfig: g.GraphQLScalarTypeConfig<URL, string> = {
    name: "URL",
    description: `URL 文字列で指定する 例"https://narumincho.com/definy/spec.html"`,
    serialize: (url: URL): string => url.toString(),
    parseValue: (value: string): URL => new URL(value)
};

export const urlGraphQLType = new g.GraphQLScalarType(urlTypeScalarTypeConfig);
