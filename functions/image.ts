import * as jimp from "jimp";

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
    image: await image.getBufferAsync("image/png"),
    icon: await icon.getBufferAsync("image/png"),
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

  let k = palette[0];
  for (let i = 0; i < xSize * ySize * xCount * yCount; i += 1) {
    if (Math.random() < changeRate) {
      k = palette[Math.floor(Math.random() * palette.length)];
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

const drawPaletteImage = (image: jimp, palette: ReadonlyArray<number>) => {
  const width = image.getWidth();
  const height = image.getHeight();

  const paletteOccupation = [];
  let sum = 0;
  for (const color of palette) {
    const value = Math.random();
    paletteOccupation.push(value);
    sum += value;
  }
  let sumOffset = 0;
  for (let i = 0; i < palette.length; i += 1) {
    sumOffset += paletteOccupation[i] / sum;
    paletteOccupation[i] = sumOffset * height;
  }

  let paletteOffset = 0;
  for (let y = 0; y < height; y += 1) {
    if (paletteOccupation[paletteOffset] < y) {
      paletteOffset = Math.min(palette.length - 1, paletteOffset + 1);
    }
    for (let x = 0; x < width; x += 1) {
      image.setPixelColor(palette[paletteOffset], x, y);
    }
  }
};
