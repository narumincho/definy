import { Event } from "../event/event.ts";
import { SignedEvent } from "../event/signedEvent.ts";

using kv = await Deno.openKv();

export async function saveEvent(
  { eventAsCbor, event }: { eventAsCbor: Uint8Array; event: Event },
) {
  console.log(eventAsCbor.length);
  // event.event;
  // // SHA256
  // await kv.set([body.accountId, body.time], body);
}
