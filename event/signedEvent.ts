import { decodeCbor, encodeCbor } from "@std/cbor";
import { SecretKey, sign, verify } from "./key.ts";
import * as v from "@valibot/valibot";
import { Event } from "./event.ts";

const EventAsCborSchema = v.pipe(
  v.instance(Uint8Array),
  v.brand("EventAsCbor"),
);

const SignatureSchema = v.pipe(v.instance(Uint8Array), v.brand("Signature"));

const SignedEventSchema = v.object({
  eventAsCbor: EventAsCborSchema,
  signature: SignatureSchema,
});

export type SignedEvent = v.InferOutput<typeof SignedEventSchema>;

export async function signEvent(
  event: Event,
  secretKey: SecretKey,
): Promise<Uint8Array> {
  const eventAsCbor = v.parse(
    EventAsCborSchema,
    encodeCbor(v.parse(Event, event)),
  );
  const signature = v.parse(
    SignatureSchema,
    await sign(eventAsCbor, secretKey),
  );

  const signedEvent: SignedEvent = {
    eventAsCbor,
    signature,
  };

  return encodeCbor(signedEvent);
}

export async function verifyAndParseEvent(
  cborData: Uint8Array,
): Promise<{ signedEvent: SignedEvent; event: Event }> {
  const signedEvent = v.parse(
    SignedEventSchema,
    decodeCbor(cborData),
  );
  const { eventAsCbor, signature } = signedEvent;

  const event = v.parse(Event, decodeCbor(eventAsCbor));

  const isValid = await verify(eventAsCbor, signature, event.accountId);

  if (!isValid) {
    throw new Error("Invalid signature");
  }

  return { signedEvent, event };
}
