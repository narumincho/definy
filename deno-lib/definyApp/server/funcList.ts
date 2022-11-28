import {
  createApiFunction,
  FunctionAndTypeList,
  number,
  product,
  string,
  unit,
} from "../../definyRpc/server/definyRpc.ts";
import * as f from "../../typedFauna.ts";
import { openConnectStateCreate } from "./faunaInterface.ts";
import { googleLogInUrl } from "./logIn.ts";
import { Mode } from "./mode.ts";

export const funcList = (
  faunaClient: f.TypedFaunaClient,
  mode: Mode,
): FunctionAndTypeList => {
  return {
    functionsList: [
      createApiFunction({
        fullName: ["hello"],
        description: "hello と挨拶が返ってくる",
        needAuthentication: false,
        isMutation: false,
        input: unit,
        output: string,
        resolve: () => {
          return "hello";
        },
      }),
      createApiFunction({
        fullName: ["now"],
        description: "現在時刻を文字列で返す",
        needAuthentication: false,
        isMutation: false,
        input: unit,
        output: string,
        resolve: () => {
          return new Date().toISOString();
        },
      }),
      createApiFunction({
        fullName: ["repeat"],
        description: '"ok"を指定した回数分繰り返して返す',
        needAuthentication: false,
        isMutation: false,
        input: number,
        output: string,
        resolve: (input) => {
          return "ok".repeat(input);
        },
      }),
      createApiFunction({
        fullName: ["createGoogleLogInUrl"],
        description: "Google でログインするためのURLを発行し取得する",
        needAuthentication: false,
        isMutation: true,
        input: unit,
        output: string,
        resolve: async (_) => {
          const state = await openConnectStateCreate(faunaClient);
          return googleLogInUrl(state, mode).toString();
        },
      }),
      createApiFunction({
        fullName: ["logInByCodeAndState"],
        description:
          "logInCallback にやってきたときにパラメーターから得ることができる code と state を使ってログインする",
        needAuthentication: false,
        isMutation: true,
        input: product<{ code: string; state: string }>({
          namespace: ["definyApi"],
          name: "CodeAndState",
          description: "ログインコールバック時にURLにつけられる code と state",
          fieldList: {
            code: {
              type: () => string,
              description: "毎回発行されるキー. Google から情報を得るために必要",
            },
            state: {
              type: () => string,
              description: "このサーバーが発行したものか判別するためのキー",
            },
          },
        }),
        output: string,
        resolve: (codeAndState) => {
          console.log(codeAndState);
          return "wip...";
        },
      }),
      createApiFunction({
        fullName: ["getDataFromDatabase"],
        description: "fauna からデータを取得する",
        needAuthentication: false,
        isMutation: false,
        input: unit,
        output: string,
        resolve: async (_) => {
          const result = await faunaClient.query<{
            readonly ref: f.DocumentReference<{
              name: string;
            }>;
            readonly data: {
              name: string;
            };
            readonly ts: string;
          }>(
            f.Get(
              f.Ref(
                f.Collection<{ readonly name: string }>(f.literal("project")),
                f.literal("345288060269756496"),
              ),
            ),
          );
          return result.data.name;
        },
      }),
    ],
    typeList: [],
  };
};
