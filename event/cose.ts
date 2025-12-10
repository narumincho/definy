import { decodeCbor, encodeCbor } from "@std/cbor";
import { signAsync, verifyAsync } from "@noble/ed25519";
import { PublicKey, SecretKey, secretKeyToPublicKey } from "./key.ts";

const COSE_ALG_EDDSA = -8;
const COSE_HEADER_ALG = 1;

/**
 * COSE_Sign1 structure:
 * [
 *   protected: bstr,
 *   unprotected: map,
 *   payload: bstr,
 *   signature: bstr
 * ]
 */
export async function signCose(
  payload: Uint8Array,
  secretKey: SecretKey,
): Promise<Uint8Array> {
  // 1. Protected Header
  // { 1 (alg): -8 (EdDSA) }
  const protectedHeaderMap = new Map([
    [COSE_HEADER_ALG, COSE_ALG_EDDSA],
  ]);
  const protectedHeaderBytes = encodeCbor(protectedHeaderMap);

  // 2. Sig_structure (for signing)
  // [
  //   context: "Signature1",
  //   body_protected: bstr,
  //   external_aad: bstr,
  //   payload: bstr
  // ]
  const sigStructure = [
    "Signature1",
    protectedHeaderBytes,
    new Uint8Array(0), // external_aad
    payload,
  ];
  const toBeSigned = encodeCbor(sigStructure);

  // 3. Sign
  const signature = await signAsync(toBeSigned, secretKey);

  // 4. Construct COSE_Sign1
  // [protected, unprotected, payload, signature]
  const coseSign1 = [
    protectedHeaderBytes,
    { 4: await secretKeyToPublicKey(secretKey) }, // unprotected header (kid: public key)
    payload,
    signature,
  ];

  return encodeCbor(coseSign1);
}

export async function verifyCose(
  coseData: Uint8Array,
): Promise<Uint8Array> {
  const decoded = decodeCbor(coseData);

  if (!Array.isArray(decoded) || decoded.length !== 4) {
    throw new Error("Invalid COSE_Sign1 structure");
  }

  const [protectedHeaderBytes, unprotectedHeader, payload, signature] =
    decoded as [
      Uint8Array,
      { 4?: Uint8Array } | Map<number, Uint8Array>,
      Uint8Array,
      Uint8Array,
    ];

  // Verify Protected Header contains EdDSA alg
  const protectedHeaderMap = decodeCbor(protectedHeaderBytes);
  if (
    !(protectedHeaderMap instanceof Map) ||
    protectedHeaderMap.get(COSE_HEADER_ALG) !== COSE_ALG_EDDSA
  ) {
    throw new Error("Unsupported algorithm or invalid protected header");
  }

  // Extract Public Key from Unprotected Header
  let publicKey: PublicKey | undefined;
  if (unprotectedHeader instanceof Map) {
    const key = unprotectedHeader.get(4);
    if (key instanceof Uint8Array) {
      publicKey = key as PublicKey;
    }
  } else if (
    typeof unprotectedHeader === "object" && ui8a(unprotectedHeader[4])
  ) {
    publicKey = unprotectedHeader[4] as PublicKey;
  } else if (
    typeof unprotectedHeader === "object" &&
    isIndex4Uint8Array(unprotectedHeader)
  ) {
    // CBOR decoding of map with int keys might result in object with string keys "4"
    publicKey = unprotectedHeader["4"] as PublicKey;
  }

  if (!publicKey) {
    throw new Error("Public key not found in COSE header");
  }

  // Reconstruct Sig_structure
  const sigStructure = [
    "Signature1",
    protectedHeaderBytes,
    new Uint8Array(0),
    payload,
  ];
  const toBeVerified = encodeCbor(sigStructure);

  const isValid = await verifyAsync(signature, toBeVerified, publicKey);

  if (!isValid) {
    throw new Error("Invalid signature");
  }

  return payload;
}

function ui8a(v: unknown): v is Uint8Array {
  return v instanceof Uint8Array;
}

function isIndex4Uint8Array(v: object): v is { "4": Uint8Array } {
  return "4" in v && ui8a((v as Record<string, unknown>)["4"]);
}
