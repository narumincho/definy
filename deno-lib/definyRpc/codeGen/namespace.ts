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
export const relativeNamespaceToTypeScriptModuleName = (
  relativeNamespace: RelativeNamespace,
): string | undefined => {
  if (relativeNamespace.path.length === 0 && relativeNamespace.upCount === 0) {
    return undefined;
  }
  const prefix = relativeNamespace.upCount === 0
    ? "./"
    : "../".repeat(relativeNamespace.upCount);
  return prefix + relativeNamespace.path.join("/") + ".ts";
};
