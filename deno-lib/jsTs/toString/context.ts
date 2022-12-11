import { CodeType } from "../data.ts";
import { TsIdentifier } from "../identifier.ts";

export type Context = {
  readonly moduleMap: ReadonlyMap<string, TsIdentifier>;
  readonly usedNameSet: ReadonlySet<TsIdentifier>;
  readonly codeType: CodeType;
};
