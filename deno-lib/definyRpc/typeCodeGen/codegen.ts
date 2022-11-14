import { JsTsCode } from "../../jsTs/data.ts";
import { collectedTypeToTypeAlias } from "../clientCodeGen/type.ts";
import { collectFromDefinyRpcTypeList } from "../core/collectType.ts";
import { DefinyRpcType } from "../core/type.ts";

export const generateCode = (
  typeList: ReadonlyArray<DefinyRpcType<unknown>>,
): JsTsCode => {
  const map = collectFromDefinyRpcTypeList(typeList, new Set());
  return {
    exportDefinitionList: [...map.values()].flatMap((type) => {
      const typeAlias = collectedTypeToTypeAlias(type, map);
      if (typeAlias === undefined) {
        return [];
      }
      return [{ type: "typeAlias", typeAlias }];
    }),
    statementList: [],
  };
};
