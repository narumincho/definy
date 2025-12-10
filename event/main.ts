import * as v from "valibot";
import { decodeCbor, encodeCbor } from "@std/cbor";
import { PublicKey, SecretKey } from "./key.ts";
import { signCose, verifyCose } from "./cose.ts";

export const CreateAccountEventSchema = v.object({
  name: v.string(),
});

export type CreateAccountEvent = v.InferOutput<
  typeof CreateAccountEventSchema
>;

export function encodeCreateAccountEvent(
  event: CreateAccountEvent,
): Uint8Array {
  return encodeCbor(event);
}

export async function encodeCreateAccountEventWithSignature(
  event: CreateAccountEvent,
  secretKey: SecretKey,
): Promise<Uint8Array> {
  return await signCose(encodeCbor(event), secretKey);
}

export async function verifyCreateAccountEvent(
  event: Uint8Array,
  publicKey: PublicKey,
): Promise<CreateAccountEvent> {
  const payload = await verifyCose(event, publicKey);
  return v.parse(CreateAccountEventSchema, decodeCbor(payload));
}

export function decodeCreateAccountEvent(
  event: Uint8Array,
): CreateAccountEvent {
  return v.parse(CreateAccountEventSchema, decodeCbor(event));
}
