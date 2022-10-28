declare global {
  // eslint-disable-next-line @typescript-eslint/consistent-type-definitions
  interface Window {
    readonly definyRpcServerPathPrefix: ReadonlyArray<string>;
  }
}

const definyRpcServerPathPrefix = window.definyRpcServerPathPrefix;

export const definyRpcServerPathPrefixAsString =
  definyRpcServerPathPrefix.length === 0
    ? ""
    : "/" + definyRpcServerPathPrefix.join("/");
