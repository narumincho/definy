import { decodeCreateAccountEvent, encodeCreateAccountEvent } from "./main.ts";
import { decodeCbor, encodeCbor } from "@std/cbor";
import { assertEquals } from "@std/assert";

Deno.test("encode decode test", () => {
  const event = encodeCreateAccountEvent({
    name: "test",
  });

  const decodedEvent = decodeCreateAccountEvent(event);

  assertEquals(decodedEvent, {
    name: "test",
  });
});

Deno.test("object in array test", () => {
  const event = encodeCbor([
    {
      name: "test",
    },
    {
      name: "test2",
      logLongKey: "長いキーだ",
    },
  ]);

  const decodedEvent = decodeCbor(event);

  assertEquals(decodedEvent, [
    {
      name: "test",
    },
    {
      name: "test2",
      logLongKey: "長いキーだ",
    },
  ]);
});

Deno.test("extra key test", () => {
  const event = encodeCbor({
    name: "test",
    extra: "extra",
  });

  const decodedEvent = decodeCreateAccountEvent(event);

  // valibot.object strips unknown keys by default, making it safe for forward compatibility
  assertEquals(decodedEvent, {
    name: "test",
  });
});
