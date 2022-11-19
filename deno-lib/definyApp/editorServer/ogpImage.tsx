import { toBytes } from "https://deno.land/x/fast_base64@v0.1.7/mod.ts";
import { Image } from "https://deno.land/x/imagescript@v1.2.14/mod.ts";
import dist from "./dist.json" assert { type: "json" };

export const createImageFromText = async (
  text: string,
): Promise<Uint8Array> => {
  const backGroundImage = new Image(1200, 630).fill(0x000000ff);
  const textImage = Image.renderText(
    await toBytes(dist.notoSansContent),
    120,
    text,
    0xff0000ff,
  );
  const image = backGroundImage.composite(textImage, 0, 0);
  return image.encode();
};
