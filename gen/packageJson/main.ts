export type PackageJsonOutput = {
  readonly dependencies: ReadonlyMap<string, string>;
  readonly devDependencies: ReadonlyMap<string, string>;
};

export type PackageJsonRaw = {
  name: string;
  version: string;
  description: string;
  repository: {
    type: "git";
    url: string;
  };
  license: "MIT";
  main: string;
  homepage: string;
  author: string;
  engines: {
    node: string;
  };
  dependencies: Record<string, string>;
  types: string | undefined;
};

export const fromString = (text: string): PackageJsonOutput => {
  return fromJson(JSON.parse(text));
};

export const fromJson = (json: {
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
}): PackageJsonOutput => {
  return {
    dependencies: new Map(
      json.dependencies === undefined ? [] : Object.entries(json.dependencies)
    ),
    devDependencies: new Map(
      json.devDependencies === undefined
        ? []
        : Object.entries(json.devDependencies)
    ),
  };
};
