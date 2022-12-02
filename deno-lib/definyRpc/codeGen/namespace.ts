export type Namespace = {
  readonly type: "local";
  readonly path: ReadonlyArray<string>;
} | {
  readonly type: "coreType";
} | {
  readonly type: "typedJson";
} | {
  readonly type: "request";
} | {
  readonly type: "maybe";
} | {
  readonly type: "meta";
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

    case "maybe":
      return toMaybe(from);

    case "local":
      return toLocal(from, to.path);

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
      return "https://raw.githubusercontent.com/narumincho/definy/537111446ec5de593b974ba48b00b99448422839/deno-lib/definyRpc/core/coreType.ts";
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
    case "maybe":
      throw new Error("コード生成しない!");
    case "local":
    case "meta":
      return "https://raw.githubusercontent.com/narumincho/definy/537111446ec5de593b974ba48b00b99448422839/deno-lib/definyRpc/core/request.ts";
  }
};

const toTypedJson = (from: Namespace): string => {
  switch (from.type) {
    case "typedJson":
    case "request":
    case "maybe":
      throw new Error("コード生成しない!");
    case "coreType":
      return "../../typedJson.ts";
    case "local":
    case "meta":
      return "https://raw.githubusercontent.com/narumincho/definy/537111446ec5de593b974ba48b00b99448422839/deno-lib/typedJson.ts";
  }
};

const toMaybe = (from: Namespace): string => {
  switch (from.type) {
    case "typedJson":
    case "request":
    case "maybe":
      throw new Error("コード生成しない!");
    case "coreType":
      return "./maybe.ts";
    case "local":
    case "meta":
      return "https://raw.githubusercontent.com/narumincho/definy/537111446ec5de593b974ba48b00b99448422839/deno-lib/maybe.ts";
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
    case "maybe":
    case "meta":
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

export const toMeta = (from: Namespace) => {
  switch (from.type) {
    case "request":
    case "typedJson":
    case "coreType":
    case "maybe":
      throw new Error("その方向には参照できない!");
    case "local": {
      const relativeNamespace = namespaceRelative(
        ["serverName", ...from.path],
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
    case "maybe":
      return "*maybe";
    case "meta":
      return "*meta";
    case "local":
      return namespace.path.join(".");
  }
};

export const namespaceEqual = (a: Namespace, b: Namespace): boolean => {
  return namespaceToString(a) === namespaceToString(b);
};
