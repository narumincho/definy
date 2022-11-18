import { getOrCreateImageFromText } from "./ogpImage.tsx";

Deno.writeFile("./out.png", (await getOrCreateImageFromText("test")).image);
