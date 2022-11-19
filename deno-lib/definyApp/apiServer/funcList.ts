import {
  createApiFunction,
  FunctionAndTypeList,
  number,
  string,
  unit,
} from "../../definyRpc/server/definyRpc.ts";
import * as f from "../../typedFauna.ts";

export const funcList = (
  faunaClient: f.TypedFaunaClient,
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
