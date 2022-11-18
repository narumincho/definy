export type Hash = string & { _hashString: never };

/**
 * バイナリのハッシュ値を生成する
 */
export const hashBinary = async (binary: Uint8Array): Promise<Hash> => {
  return [...new Uint8Array(await crypto.subtle.digest("sha-256", binary))]
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("") as Hash;
};

export const hashFromString = (value: string): Hash | undefined => {
  if (value.match(/^[0-9a-f]{64}$/gu) === null) {
    return undefined;
  }
  return value as Hash;
};
