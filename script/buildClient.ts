import { bundle } from "https://deno.land/x/emit@0.32.0/mod.ts";

const { code } = await bundle(
    new URL("../client/start.tsx", import.meta.url),
);

await Deno.writeTextFile(
    new URL("../dist.json", import.meta.url),
    JSON.stringify({ code }),
);
