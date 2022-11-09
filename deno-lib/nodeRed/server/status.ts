import type { FunctionDetail } from "../../definyRpc/client/generated/definyRpc.ts";

export type Status = {
  readonly name: string;
  readonly functionList: ReadonlyArray<FunctionDetail>;
};
