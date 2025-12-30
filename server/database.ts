import { SignedEvent } from "../event/signedEvent.ts";

using kv = await Deno.openKv();

export async function saveEvent(
  { signedEvent }: {
    signedEvent: SignedEvent;
  },
) {
  const hash = await crypto.subtle.digest(
    "SHA-256",
    signedEvent.eventAsCbor,
  );
  await kv.set(["eventById", new Uint8Array(hash)], signedEvent);
}

export async function getEvents() {
  return Array.fromAsync(kv.list<SignedEvent>({ prefix: ["eventById"] }));
}
