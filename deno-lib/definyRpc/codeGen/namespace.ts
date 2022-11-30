export type Namespace = {
  readonly type: "local";
  readonly path: ReadonlyArray<string>;
} | {
  readonly type: "coreType";
} | {
  readonly type: "typedJson";
} | {
  readonly type: "request";
};

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
      return toLocal(from, to.path);
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
      return "https://raw.githubusercontent.com/narumincho/definy/cc9b0e4b75583067ce72c7d75b393118d21e5f72/deno-lib/definyRpc/core/coreType.ts";
  }
};

const toRequest = (
  from: Namespace,
): string => {
  switch (from.type) {
    case "coreType":
      throw new Error("この方向には参照しない!");
    case "typedJson":
    case "request":
      throw new Error("コード生成しない!");
    case "local":
      return "https://raw.githubusercontent.com/narumincho/definy/cc9b0e4b75583067ce72c7d75b393118d21e5f72/deno-lib/definyRpc/core/request.ts";
  }
};

const toTypedJson = (from: Namespace): string => {
  switch (from.type) {
    case "typedJson":
    case "request":
      throw new Error("コード生成しない!");
    case "coreType":
      throw new Error("この方向には参照しない!");
    case "local":
      return "https://raw.githubusercontent.com/narumincho/definy/cc9b0e4b75583067ce72c7d75b393118d21e5f72/deno-lib/definyRpc/core/request.ts";
  }
};

const toLocal = (
  from: Namespace,
  to: ReadonlyArray<string>,
): string => {
  switch (from.type) {
    case "request":
    case "typedJson":
    case "coreType":
      throw new Error("その方向には参照できない!");
    case "local": {
      const relativeNamespace = namespaceRelative(from.path, to);
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
    case "local":
      return namespace.path.join(".");
  }
};

export const namespaceEqual = (a: Namespace, b: Namespace): boolean => {
  return namespaceToString(a) === namespaceToString(b);
};
