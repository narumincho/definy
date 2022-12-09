import { FunctionDetail } from "../../definyRpc/core/coreType.ts";

export type Status = {
  readonly name: string;
  readonly functionList: ReadonlyArray<FunctionDetail>;
};
