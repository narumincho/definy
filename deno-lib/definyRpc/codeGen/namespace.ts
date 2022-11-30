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
      return namespaceFromAndToCoreFuncToTypeScriptModuleName(from);

    case "local":
      return namespaceFromAndToLocalToTypeScriptModuleName(from, to.path);
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
      return "./coreType.ts";
    case "local":
      return "https://coreFuncまだ作成中";
  }
};

const namespaceFromAndToCoreTypeToTypeScriptModuleName = (
  from: Namespace,
): string | undefined => {
  switch (from.type) {
    case "coreFunc":
      return "./coreType.ts";
    case "coreType":
      return undefined;
    case "local":
      return "https://coreTypeまだ作成中";
  }
};

const namespaceFromAndToLocalToTypeScriptModuleName = (
  from: Namespace,
  to: ReadonlyArray<string>,
): string | undefined => {
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

export const namespaceToString = (namespace: Namespace) => {
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

export const namespaceEqual = (a: Namespace, b: Namespace) => {
  return namespaceToString(a) === namespaceToString(b);
};
