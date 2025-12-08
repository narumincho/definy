import * as v from "valibot";
import { decodeCbor, encodeCbor } from "@std/cbor";

export const CreateAccountEventSchema = v.object({
  name: v.string(),
});

export type CreateAccountEventSchema = v.InferOutput<
  typeof CreateAccountEventSchema
>;

export function encodeCreateAccountEvent(
  event: CreateAccountEventSchema,
): Uint8Array {
  return encodeCbor(event);
}

export function decodeCreateAccountEvent(
  event: Uint8Array,
): CreateAccountEventSchema {
  return v.parse(CreateAccountEventSchema, decodeCbor(event));
}
