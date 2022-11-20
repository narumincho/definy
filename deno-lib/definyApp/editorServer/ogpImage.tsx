import { toBytes } from "https://deno.land/x/fast_base64@v0.1.7/mod.ts";
import { Image } from "https://deno.land/x/imagescript@v1.2.14/mod.ts";
import { timeToDisplayText } from "../editor/logic.ts";
import dist from "./dist.json" assert { type: "json" };

/**
 * 時刻によって生成する画像が変化する
 */
export const createImageFromText = async (parameter: {
  readonly date: Date | undefined;
  readonly message: string | undefined;
}): Promise<Uint8Array> => {
  const fontByte = await toBytes(dist.notoSansContent);
  const backGroundImage = new Image(1200, 630).fill(0x000000ff);

  // 時刻とメッセージ両方指定
  if (parameter.message !== undefined && parameter.date !== undefined) {
    const messageImage = Image.renderText(
      fontByte,
      120,
      parameter.message,
      0xffffffff,
    );
    const dateImage = dateToLimitDateImage(fontByte, parameter.date);

    return backGroundImage.composite(
      messageImage,
      (backGroundImage.width - messageImage.width) / 2,
      (backGroundImage.height / 4) - (messageImage.height / 2),
    ).composite(
      dateImage,
      (backGroundImage.width - dateImage.width) / 2,
      (backGroundImage.height / 4 * 3) - (messageImage.height / 2),
    )
      .encode();
  }

  // 時刻のみ指定
  if (parameter.date !== undefined) {
    const dateImage = dateToLimitDateImage(fontByte, parameter.date);
    const image = backGroundImage.composite(
      dateImage,
      (backGroundImage.width - dateImage.width) / 2,
      (backGroundImage.height - dateImage.height) / 2,
    );
    return image.encode();
  }

  // メッセージのみ指定
  if (parameter.message !== undefined) {
    const textImage = Image.renderText(
      fontByte,
      120,
      parameter.message,
      Image.hslToColor(Math.random(), 0.8, 0.7),
    );
    const image = backGroundImage.composite(
      textImage,
      (backGroundImage.width - textImage.width) / 2,
      (backGroundImage.height - textImage.height) / 2,
    );
    return image.encode();
  }

  return Image.renderText(
    fontByte,
    120,
    "messageとdateを指定してね",
    0xff0000ff,
  ).encode();
};

const dateToLimitDateImage = (fontBytes: Uint8Array, date: Date): Image => {
  const valueAndUnit = timeToDisplayText(date);
  const prefixImage = Image.renderText(
    fontBytes,
    100,
    valueAndUnit.after ? "から" : "まで",
    0xffffffff,
  );
  const valueAndUnitImage = Image.renderText(
    fontBytes,
    150,
    valueAndUnit.value + valueAndUnit.unit,
    0xff0000ff,
  );
  const imageHeight = Math.max(prefixImage.height, valueAndUnitImage.height);
  const gap = 64;
  return new Image(
    prefixImage.width + gap + valueAndUnitImage.width,
    prefixImage.height + valueAndUnitImage.height,
  ).composite(prefixImage, 0, imageHeight - prefixImage.height).composite(
    valueAndUnitImage,
    prefixImage.width + gap,
    0,
  );
};
