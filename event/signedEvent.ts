import { decodeCbor, encodeCbor } from "@std/cbor";
import { SecretKey, sign, verify } from "./key.ts";
import * as v from "@valibot/valibot";
import { Event, EventSchema } from "./event.ts";

const EventAsCborSchema = v.pipe(
  v.instance(Uint8Array),
  v.brand("EventAsCbor"),
);

type EventAsCbor = v.InferOutput<typeof EventAsCborSchema>;

const SignatureSchema = v.pipe(v.instance(Uint8Array), v.brand("Signature"));

const SignedEventShema = v.object({
  event: EventAsCborSchema,
  signature: SignatureSchema,
});

type SignedEvent = v.InferOutput<typeof SignedEventShema>;

export async function signEvent(
  event: Event,
  secretKey: SecretKey,
): Promise<Uint8Array> {
  const eventAsCbor = encodeCbor(v.parse(EventSchema, event));
  const signature = v.parse(
    SignatureSchema,
    await sign(eventAsCbor, secretKey),
  );

  const signedEvent: SignedEvent = {
    event: eventAsCbor,
    signature,
  };

  return encodeCbor(signedEvent);
}

export async function verifyAndParseEvent(
  cborData: Uint8Array,
): Promise<Event> {
  const { event: eventAsCbor, signature } = v.parse(
    SignedEventShema,
    decodeCbor(cborData),
  );
  const event = v.parse(EventSchema, decodeCbor(eventAsCbor));

  const isValid = await verify(signature, eventAsCbor, event.accountId);

  if (!isValid) {
    throw new Error("Invalid signature");
  }

  return event;
}
