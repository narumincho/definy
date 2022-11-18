import { fast_base64, Image } from "../../deps.ts";
import { Hash, hashBinary } from "../../sha256.ts";
import dist from "./dist.json" assert { type: "json" };

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
      await fast_base64.toBytes(dist.notoSansContent),
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
