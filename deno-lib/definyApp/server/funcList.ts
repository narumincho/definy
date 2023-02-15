import {
  DefinyRpcTypeInfo,
  Field,
  FunctionNamespace,
  Maybe,
  Namespace,
  Number,
  String,
  Type,
  TypeBody,
  Unit,
} from "../../definyRpc/core/coreType.ts";
import {
  createApiFunction,
  FunctionAndTypeList,
} from "../../definyRpc/core/apiFunction.ts";
import * as f from "../../typedFauna.ts";
import { openConnectStateCreate } from "./faunaInterface.ts";
import { googleLogInUrl } from "./logIn.ts";
import { Mode } from "./mode.ts";

const definyAppNamespace = FunctionNamespace.local(["main"]);

export const funcList = (
  faunaClient: f.TypedFaunaClient,
  mode: Mode,
): FunctionAndTypeList => {
  return {
    functionsList: [
      createApiFunction({
        namespace: definyAppNamespace,
        name: "hello",
        description: "hello と挨拶が返ってくる",
        needAuthentication: false,
        isMutation: false,
        input: String.type(),
        output: String.type(),
        resolve: () => {
          return "hello";
        },
      }),
      createApiFunction({
        namespace: definyAppNamespace,
        name: "now",
        description: "現在時刻を文字列で返す",
        needAuthentication: false,
        isMutation: false,
        input: String.type(),
        output: String.type(),
        resolve: () => {
          return new Date().toISOString();
        },
      }),
      createApiFunction({
        namespace: definyAppNamespace,
        name: "createGoogleLogInUrl",
        description: "Google でログインするためのURLを発行し取得する",
        needAuthentication: false,
        isMutation: true,
        input: Unit.type(),
        output: String.type(),
        resolve: async () => {
          const state = await openConnectStateCreate(faunaClient);
          return googleLogInUrl(state, mode).toString();
        },
      }),
      createApiFunction({
        namespace: definyAppNamespace,
        name: "logInByCodeAndState",
        description:
          "logInCallback にやってきたときにパラメーターから得ることができる code と state を使ってログインする",
        needAuthentication: false,
        isMutation: true,
        input: Type.from({
          name: "CodeAndState",
          namespace: Namespace.local(["main"]),
          parameters: [],
        }),
        output: String.type(),
        resolve: (codeAndState) => {
          console.log(codeAndState);
          return "wip...";
        },
      }),
      createApiFunction({
        namespace: definyAppNamespace,
        name: "getDataFromDatabase",
        description: "fauna からデータを取得する",
        needAuthentication: false,
        isMutation: false,
        input: Unit.type(),
        output: String.type(),
        resolve: async () => {
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
    typeList: [
      DefinyRpcTypeInfo.from({
        name: "CodeAndState",
        description: "ログインコールバック時にURLにつけられる code と state",
        namespace: Namespace.local(["main"]),
        parameter: [],
        attribute: Maybe.nothing(),
        body: TypeBody.product([
          Field.from({
            name: "code",
            description: "毎回発行されるキー. Google から情報を得るために必要",
            type: String.type(),
          }),
          Field.from({
            name: "state",
            description: "このサーバーが発行したものか判別するためのキー",
            type: String.type(),
          }),
        ]),
      }),
    ],
  };
};
