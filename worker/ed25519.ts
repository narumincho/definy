/** Ed25519 の署名を確かめる (`verify_ed25519`). 公開鍵として読めなければ `false` */
export async function verifyEd25519(
  publicKey: Uint8Array,
  signature: Uint8Array,
  message: Uint8Array,
): Promise<boolean> {
  try {
    return await crypto.subtle.verify(
      { name: "Ed25519" },
      await crypto.subtle.importKey(
        "raw",
        publicKey as Uint8Array<ArrayBuffer>,
        { name: "Ed25519" },
        false,
        ["verify"],
      ),
      signature as Uint8Array<ArrayBuffer>,
      message as Uint8Array<ArrayBuffer>,
    );
  } catch {
    return false;
  }
}
