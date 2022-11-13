import { definyRpc } from "./server/mod.ts";

export const funcList = (): ReadonlyArray<definyRpc.ApiFunction> => {
  return [
    definyRpc.createApiFunction({
      fullName: ["hello"],
      description: "hello と挨拶が返ってくる",
      needAuthentication: false,
      isMutation: false,
      input: definyRpc.unit,
      output: definyRpc.string,
      resolve: () => {
        return "hello";
      },
    }),
    definyRpc.createApiFunction({
      fullName: ["now"],
      description: "現在時刻を文字列で返す",
      needAuthentication: false,
      isMutation: false,
      input: definyRpc.unit,
      output: definyRpc.string,
      resolve: () => {
        return new Date().toISOString();
      },
    }),
    definyRpc.createApiFunction({
      fullName: ["repeat"],
      description: '"ok"を指定した回数分繰り返して返す',
      needAuthentication: false,
      isMutation: false,
      input: definyRpc.number,
      output: definyRpc.string,
      resolve: (input) => {
        return "ok".repeat(input);
      },
    }),
  ];
};
