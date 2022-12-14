import { FunctionNamespace, Namespace } from "../core/coreType.ts";

export type RelativeNamespace = {
  readonly upCount: number;
  readonly path: ReadonlyArray<string>;
};

export const namespaceRelative = (
  from: ReadonlyArray<string>,
  to: ReadonlyArray<string>,
): RelativeNamespace => {
  for (const [index, fromItem] of from.entries()) {
    const toItem = to[index];
    if (toItem !== fromItem) {
      return { upCount: from.length - index, path: to.slice(index) };
    }
  }
  return { upCount: 0, path: to.slice(from.length) };
};

/**
 * @return undefined の場合は同一のモジュールということ
 */
export const namespaceFromAndToToTypeScriptModuleName = (
  from: Namespace,
  to: Namespace,
): string | undefined => {
  switch (to.type) {
    case "coreType":
      return toCoreTypeModuleName(from);

    case "request":
      return toRequest(from);

    case "typedJson":
      return toTypedJson(from);

    case "local":
      return toLocal(from, to.value);

    case "meta":
      return toMeta(from);
  }
};

const toCoreTypeModuleName = (
  from: Namespace,
): string | undefined => {
  switch (from.type) {
    case "coreType":
      return undefined;
    case "request":
    case "typedJson":
      throw new Error("この方向には参照しない!");
    case "local":
    case "meta":
      return "https://raw.githubusercontent.com/narumincho/definy/f9d7aaa5a3f1aba6dc0c478908ab96883eb5fad0/deno-lib/definyRpc/core/coreType.ts";
  }
};

export const toRequest = (
  from: Namespace,
): string => {
  switch (from.type) {
    case "coreType":
      throw new Error("この方向には参照しない!");
    case "typedJson":
    case "request":
      throw new Error("コード生成しない!");
    case "local":
    case "meta":
      return "https://raw.githubusercontent.com/narumincho/definy/f9d7aaa5a3f1aba6dc0c478908ab96883eb5fad0/deno-lib/definyRpc/core/request.ts";
  }
};

const toTypedJson = (from: Namespace): string => {
  switch (from.type) {
    case "typedJson":
    case "request":
      throw new Error("コード生成しない!");
    case "coreType":
      return "../../typedJson.ts";
    case "local":
    case "meta":
      return "https://raw.githubusercontent.com/narumincho/definy/f9d7aaa5a3f1aba6dc0c478908ab96883eb5fad0/deno-lib/typedJson.ts";
  }
};

const toLocal = (
  from: Namespace,
  to: ReadonlyArray<string>,
): string | undefined => {
  switch (from.type) {
    case "request":
    case "typedJson":
    case "coreType":
    case "meta":
      throw new Error("その方向には参照できない!");
    case "local": {
      const relativeNamespace = namespaceRelative(from.value, to);
      if (
        relativeNamespace.path.length === 0 && relativeNamespace.upCount === 0
      ) {
        return undefined;
      }
      const prefix = relativeNamespace.upCount <= 1
        ? "./"
        : "../".repeat(relativeNamespace.upCount - 1);
      return prefix + relativeNamespace.path.join("/") + ".ts";
    }
  }
};

export const toMeta = (from: Namespace) => {
  switch (from.type) {
    case "request":
    case "typedJson":
    case "coreType":
      throw new Error("その方向には参照できない!");
    case "local": {
      const relativeNamespace = namespaceRelative(
        ["serverName", ...from.value],
        [
          "meta.ts",
        ],
      );
      const prefix = relativeNamespace.upCount <= 1
        ? "./"
        : "../".repeat(relativeNamespace.upCount - 1);
      return prefix + relativeNamespace.path.join("/") + ".ts";
    }
  }
};

export const namespaceToString = (namespace: Namespace): string => {
  switch (namespace.type) {
    case "typedJson":
      return "*typedJson";
    case "request":
      return "*request";
    case "coreType":
      return "*coreType";
    case "meta":
      return "*meta";
    case "local":
      return namespace.value.join(".");
  }
};

export const namespaceEqual = (a: Namespace, b: Namespace): boolean => {
  return namespaceToString(a) === namespaceToString(b);
};

export const fromFunctionNamespace = (
  functionNamespace: FunctionNamespace,
): Namespace => {
  if (functionNamespace.type === "meta") {
    return Namespace.meta;
  }
  return Namespace.local(functionNamespace.value);
};

export const functionNamespaceToString = (
  functionNamespace: FunctionNamespace,
): string => {
  if (functionNamespace.type === "meta") {
    return "*meta";
  }
  return functionNamespace.value.join(".");
};
