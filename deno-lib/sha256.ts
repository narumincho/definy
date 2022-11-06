export type Hash = string & { _hashString: never };

const hashFromString = (value: string): Hash => {
  return value as Hash;
};

/**
 * バイナリのハッシュ値を生成する
 */
export const hashBinary = async (binary: Uint8Array): Promise<Hash> => {
  return hashFromString(
    [...new Uint8Array(await crypto.subtle.digest("sha-256", binary))]
      .map((byte) => byte.toString(16).padStart(2, "0"))
      .join("")
  );
};
