import * as jimp from "jimp";
import { pngMimeType } from "../output/TypeScriptEntryPoint";

export const createProjectIconAndImage = async (): Promise<{
  icon: Buffer;
  image: Buffer;
}> => {
  const imageWidth = 1024;
  const imageHeight = 633;
  const image = await jimp.create(imageWidth, imageHeight);

  const palette = new Array(8).fill(0).map(() => randomColor());

  drawRectRandomImage(
    image,
    12 + Math.floor(Math.random() * 10),
    5 + Math.floor(Math.random() * 10),
    0.0004,
    palette
  );
  const iconWidth = 64;
  const iconHeight = 64;
  const icon = await jimp.create(iconWidth, iconHeight);
  drawPaletteImage(icon, palette);
  return {
    image: await image.getBufferAsync(pngMimeType),
    icon: await icon.getBufferAsync(pngMimeType),
  };
};

const drawRectRandomImage = (
  image: jimp,
  xCount: number,
  yCount: number,
  changeRate: number,
  palette: ReadonlyArray<number>
): void => {
  const xSize = Math.floor(image.getWidth() / xCount + 1);
  const ySize = Math.floor(image.getHeight() / yCount + 1);

  let k = palette[0] as number;
  for (let i = 0; i < xSize * ySize * xCount * yCount; i += 1) {
    if (Math.random() < changeRate) {
      k = palette[Math.floor(Math.random() * palette.length)] as number;
    }
    image.setPixelColor(
      k,
      (Math.floor(i / ySize) + (i % xSize)) % (xSize * xCount),
      Math.floor(i / (xSize * xCount * ySize)) * ySize +
        (Math.floor(i / xSize) % ySize)
    );
  }
};

const randomColor = (): number =>
  jimp.rgbaToInt(
    (2 + Math.floor(Math.random() * 5)) * 32,
    (2 + Math.floor(Math.random() * 5)) * 32,
    (2 + Math.floor(Math.random() * 5)) * 32,
    255
  );

type PalletAndRandomValueWithSum = {
  readonly paletteAndRandomValue: ReadonlyArray<{
    readonly color: number;
    readonly value: number;
  }>;
  readonly sum: number;
};

const drawPaletteImage = (image: jimp, palette: ReadonlyArray<number>) => {
  const width = image.getWidth();
  const height = image.getHeight();

  const randomValueAndSumList = palette.reduce<PalletAndRandomValueWithSum>(
    (
      previousValue: PalletAndRandomValueWithSum,
      currentValue: number
    ): PalletAndRandomValueWithSum => {
      const value = previousValue.sum + Math.random();
      return {
        paletteAndRandomValue: [
          ...previousValue.paletteAndRandomValue,
          {
            color: currentValue,
            value,
          },
        ],
        sum: value,
      };
    },
    {
      paletteAndRandomValue: [],
      sum: 0,
    }
  );

  const paletteOccupation = randomValueAndSumList.paletteAndRandomValue.map(
    (e) => {
      return (e.value / randomValueAndSumList.sum) * height;
    }
  );

  let paletteOffset = 0;
  for (let y = 0; y < height; y += 1) {
    if ((paletteOccupation[paletteOffset] as number) < y) {
      paletteOffset = Math.min(palette.length - 1, paletteOffset + 1);
    }
    for (let x = 0; x < width; x += 1) {
      image.setPixelColor(palette[paletteOffset] as number, x, y);
    }
  }
};
