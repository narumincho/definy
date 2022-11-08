import type { FunctionDetail } from "../../definyRpc/client/definyRpc.ts";

export type Status = {
  readonly name: string;
  readonly functionList: ReadonlyArray<FunctionDetail>;
};
