import { Image } from "https://deno.land/x/imagescript@v1.2.14/mod.ts";
import { Hash, hashBinary } from "../../sha256.ts";
import dist from "./dist.json" assert { type: "json" };
import { toUint8Array } from "https://denopkg.com/chiefbiiko/base64@master/mod.ts";

type ImageAndHash = {
  readonly image: Uint8Array;
  readonly hash: string;
};

const cache = new Map<string, ImageAndHash>();

export const getOrCreateImageFromText = async (
  text: string,
): Promise<ImageAndHash> => {
  const imageInCache = cache.get(text);
  if (imageInCache === undefined) {
    const backGroundImage = new Image(1200, 630).fill(0x000000ff);
    const textImage = Image.renderText(
      toUint8Array(dist.notoSansContent),
      120,
      "aaテスト日本語",
      0xff0000ff,
    );
    const image = backGroundImage.composite(textImage, 0, 0);
    const imageAsUint8Array = await image.encode();
    const hash = await hashBinary(imageAsUint8Array);
    const imageAndHash: ImageAndHash = { image: imageAsUint8Array, hash };
    cache.set(text, imageAndHash);
    return imageAndHash;
  }
  return imageInCache;
};

export const getImageFromHash = (hash: Hash): Uint8Array | undefined => {
  for (const [key, imageAndHash] of cache) {
    if (imageAndHash.hash === hash) {
      return imageAndHash.image;
    }
  }
  return undefined;
};
