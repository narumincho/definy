import { requestObjectToSimpleRequest } from "../../simpleRequestResponse/simpleRequest.ts";
import { stringArrayEqual, stringArrayMatchPrefix } from "../../util.ts";
import { UntypedRequestExpr } from "../core/requestExpr.ts";
import { SchemaType } from "../core/schemaType.ts";

export const requestParse = async <T>(
  request: Request,
  option: {
    readonly schema: SchemaType<T>;
    readonly pathPrefix: ReadonlyArray<string>;
  },
): Promise<ParsedRequest> => {
  const simpleRequest = await requestObjectToSimpleRequest(request);
  if (simpleRequest === undefined) {
    return { type: "skip" };
  }

  const pathListRemovePrefix = stringArrayMatchPrefix(
    simpleRequest.url.path,
    option.pathPrefix,
  );
  // /
  if (pathListRemovePrefix === undefined) {
    return { type: "skip" };
  }
  // /{prefix}
  if (pathListRemovePrefix.length === 0) {
    return { type: "editorHtml", functionOrType: undefined };
  }

  // /{prefix}/editor/{"function" | "type"}/{name?}/{arguments}?{argumentsKey=argumentsValue}
  const editorSuffix = stringArrayMatchPrefix(pathListRemovePrefix, [
    "editor",
    "function",
  ]);
  if (editorSuffix !== undefined) {
    return {
      type: "editorHtml",
      functionOrType: getFunctionOrTypeFromSubPath(editorSuffix),
    };
  }

  // /{prefix}/editor-assets
  const editorAssetsSuffix = stringArrayMatchPrefix(pathListRemovePrefix, [
    "editor-assets",
  ]);
  if (editorAssetsSuffix !== undefined) {
    // /{prefix}/editor-assets/icon-hash.png
    if (stringArrayEqual(editorAssetsSuffix, ["icon-hash.png"])) {
      return { type: "editorIcon" };
    }
    // /{prefix}/editor-assets/script-hash.js
    if (stringArrayEqual(editorAssetsSuffix, ["script-hash.js"])) {
      return { type: "editorScript" };
    }
    // /{prefix}/editor-assets/ogp/
    const ogpSuffix = stringArrayMatchPrefix(editorAssetsSuffix, [
      "ogp",
    ]);
    if (ogpSuffix !== undefined) {
      return {
        type: "editorOgpImage",
        functionOrType: getFunctionOrTypeFromSubPath(ogpSuffix),
      };
    }
    return { type: "editorAssetNotFound" };
  }

  // /{prefix}/api/{functionName}
  const apiSuffix = stringArrayMatchPrefix(pathListRemovePrefix, [
    "api",
  ]);
  if (apiSuffix !== undefined) {
    return {
      type: "apiRequest",
      expr: { type: "call", functionName: "", arguments: [] },
    };
  }

  return { type: "skip" };
};

const getFunctionOrTypeFromSubPath = (
  subPath: ReadonlyArray<string>,
): FunctionOrType | undefined => {
  // ./function/{functionName}/{arguments}?{argumentsKey=argumentsValue}
  const functionSuffix = stringArrayMatchPrefix(subPath, [
    "function",
  ]);
  if (functionSuffix) {
    const functionName = functionSuffix[0];
    return functionName === undefined
      ? undefined
      : { type: "function", functionName, arguments: [] };
  }
  // ./type/{typeName}/{arguments}?{argumentsKey=argumentsValue}
  const typeSuffix = stringArrayMatchPrefix(subPath, [
    "type",
  ]);
  if (typeSuffix) {
    const typeName = typeSuffix[0];
    return typeName === undefined
      ? undefined
      : { type: "type", typeName, arguments: [] };
  }
};

export type ParsedRequest = {
  readonly type: "editorHtml";
  readonly functionOrType: FunctionOrType | undefined;
} | {
  readonly type: "editorOgpImage";
  readonly functionOrType: FunctionOrType | undefined;
} | {
  readonly type: "editorIcon";
} | {
  readonly type: "editorScript";
} | {
  readonly type: "editorAssetNotFound";
} | {
  readonly type: "apiRequest";
  readonly expr: UntypedRequestExpr;
} | {
  readonly type: "error";
} | {
  readonly type: "skip";
};

export type FunctionOrType = Function | Type;

export type Function = {
  readonly type: "function";
  readonly functionName: string;
  readonly arguments: ReadonlyArray<Function>;
};
export type Type = {
  readonly type: "type";
  readonly typeName: string;
  readonly arguments: ReadonlyArray<Type>;
};
