/**
 * 坂本アヒルさんの「ずんだもん立ち絵素材」(https://tachie.net/w/sC90rhbReJ) の PSD から, 紹介スライド (/about の上) で使うパーツを PNG に書き出す.
 *
 *   node scripts/export_zundamon.ts <基本版.psd>              パーツを書き出す
 *   node scripts/export_zundamon.ts <基本版.psd> --preview <dir> 口・目・眉を並べた確認用の画像を書き出す
 *
 * - PSD は配布物そのものなのでリポジトリに入れない. 書き出した PNG だけを public/story/zundamon/ に置く
 * - 出力: public/story/zundamon/*.png と src/story/zundamon_parts.ts (各パーツの位置)
 * - レイヤーの名前は PSDTool の書き方 (`!` は常に表示するグループ, `*` はその中から 1 つ選ぶ)
 */
import { mkdir, readdir, readFile, rm, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { deflateSync } from "node:zlib";
import {
  getLayerImageData,
  initializeCanvas,
  readPsd,
  type Layer,
  type Psd,
} from "ag-psd";

type Image = { width: number; height: number; data: Uint8ClampedArray };

initializeCanvas(
  () => {
    throw new Error("canvas は使わない");
  },
  (width: number, height: number) =>
    ({
      width,
      height,
      data: new Uint8ClampedArray(width * height * 4),
      colorSpace: "srgb",
    }) as ImageData,
);

/** 書き出すときの縮小率 (PSD は 1082×1594 で大きいので半分にする) */
const SCALE = 2;

/** 体として 1 枚にまとめるレイヤー ([グループ, レイヤー]. レイヤーが無いものはグループそのもの) */
const BODY_LAYERS: ReadonlyArray<readonly [string, string | undefined]> = [
  ["!体", undefined],
  ["!右腕", "*腰"],
  ["!左腕", "*腰"],
  ["!枝豆", "*枝豆通常"],
  ["!顔色", "*ほっぺ基本"],
];

/** 口の形 (src/story/voice_manifest.ts の MouthShape) ごとのレイヤー */
const MOUTHS: Readonly<Record<string, string>> = {
  closed: "*ほほえみ",
  n: "*んー",
  a: "*ほあー",
  i: "*にやり",
  u: "*お",
  e: "*んえー",
  o: "*ほう",
};

/** 表情 (src/story/narration.ts の Face) ごとの目と眉. 閉じた目はまばたき用 */
const FACES: Readonly<
  Record<string, { readonly eyes: string; readonly brows: string }>
> = {
  normal: { eyes: "*基本目", brows: "*基本眉" },
  happy: { eyes: "*にっこり", brows: "*上がり眉" },
  surprised: { eyes: "*〇〇", brows: "*上がり眉" },
  troubled: { eyes: "*基本目", brows: "*困り眉" },
};
const BLINK_EYES = "*閉じ目";

const ROOT = resolve(import.meta.dirname, "..");
const OUTPUT_DIR = join(ROOT, "public", "story", "zundamon");
const MANIFEST_PATH = join(ROOT, "src", "story", "zundamon_parts.ts");

function blank(width: number, height: number): Image {
  return { width, height, data: new Uint8ClampedArray(width * height * 4) };
}

function layerImage(layer: Layer): Image | undefined {
  // useImageData では読み込んだときに imageData に入る. useRawData のときだけ後から変換する
  const data = layer.imageData ?? getLayerImageData(layer);
  return data === undefined
    ? undefined
    : { width: data.width, height: data.height, data: data.data };
}

/** `layer` を `target` の (originX, originY) を原点として重ねる */
function drawOver(
  target: Image,
  image: Image,
  left: number,
  top: number,
  opacity = 1,
): void {
  for (let y = 0; y < image.height; y++) {
    const ty = top + y;
    if (ty < 0 || ty >= target.height) {
      continue;
    }
    for (let x = 0; x < image.width; x++) {
      const tx = left + x;
      if (tx < 0 || tx >= target.width) {
        continue;
      }
      const s = (y * image.width + x) * 4;
      const t = (ty * target.width + tx) * 4;
      const sa = ((image.data[s + 3] ?? 0) / 255) * opacity;
      if (sa === 0) {
        continue;
      }
      const ta = (target.data[t + 3] ?? 0) / 255;
      const oa = sa + ta * (1 - sa);
      for (let c = 0; c < 3; c++) {
        target.data[t + c] =
          ((image.data[s + c] ?? 0) * sa +
            (target.data[t + c] ?? 0) * ta * (1 - sa)) /
          oa;
      }
      target.data[t + 3] = oa * 255;
    }
  }
}

function drawLayer(
  target: Image,
  layer: Layer,
  originX: number,
  originY: number,
): void {
  const image = layerImage(layer);
  if (image !== undefined) {
    drawOver(
      target,
      image,
      (layer.left ?? 0) - originX,
      (layer.top ?? 0) - originY,
      layer.opacity ?? 1,
    );
  }
}

/** 透明でない部分を囲む矩形. 縮小で割り切れるよう SCALE の倍数に広げる */
function opaqueBounds(
  image: Image,
): { left: number; top: number; right: number; bottom: number } | undefined {
  let left = image.width;
  let top = image.height;
  let right = 0;
  let bottom = 0;
  for (let y = 0; y < image.height; y++) {
    for (let x = 0; x < image.width; x++) {
      if ((image.data[(y * image.width + x) * 4 + 3] ?? 0) > 0) {
        left = Math.min(left, x);
        top = Math.min(top, y);
        right = Math.max(right, x + 1);
        bottom = Math.max(bottom, y + 1);
      }
    }
  }
  if (right <= left) {
    return undefined;
  }
  const floor = (v: number): number => Math.floor(v / SCALE) * SCALE;
  const ceil = (v: number): number => Math.ceil(v / SCALE) * SCALE;
  return {
    left: floor(left),
    top: floor(top),
    right: ceil(right),
    bottom: ceil(bottom),
  };
}

function crop(
  image: Image,
  bounds: { left: number; top: number; right: number; bottom: number },
): Image {
  const result = blank(bounds.right - bounds.left, bounds.bottom - bounds.top);
  for (let y = 0; y < result.height; y++) {
    const sy = bounds.top + y;
    if (sy >= image.height) {
      continue;
    }
    const start = (sy * image.width + bounds.left) * 4;
    const end = start + Math.min(result.width, image.width - bounds.left) * 4;
    result.data.set(image.data.subarray(start, end), y * result.width * 4);
  }
  return result;
}

/** SCALE × SCALE の画素を, 不透明度で重み付けして 1 画素にまとめる */
function downscale(image: Image): Image {
  const result = blank(
    Math.ceil(image.width / SCALE),
    Math.ceil(image.height / SCALE),
  );
  for (let y = 0; y < result.height; y++) {
    for (let x = 0; x < result.width; x++) {
      let alpha = 0;
      const color = [0, 0, 0];
      let count = 0;
      for (let dy = 0; dy < SCALE; dy++) {
        for (let dx = 0; dx < SCALE; dx++) {
          const sx = x * SCALE + dx;
          const sy = y * SCALE + dy;
          if (sx >= image.width || sy >= image.height) {
            continue;
          }
          const i = (sy * image.width + sx) * 4;
          const a = image.data[i + 3] ?? 0;
          alpha += a;
          for (let c = 0; c < 3; c++) {
            color[c] = (color[c] ?? 0) + (image.data[i + c] ?? 0) * a;
          }
          count += 1;
        }
      }
      const o = (y * result.width + x) * 4;
      if (alpha > 0) {
        for (let c = 0; c < 3; c++) {
          result.data[o + c] = (color[c] ?? 0) / alpha;
        }
      }
      result.data[o + 3] = alpha / count;
    }
  }
  return result;
}

const CRC_TABLE = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) {
    c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  }
  return c >>> 0;
});

function crc32(bytes: Uint8Array): number {
  let crc = 0xffffffff;
  for (const byte of bytes) {
    crc = (CRC_TABLE[(crc ^ byte) & 0xff] ?? 0) ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function encodePng(image: Image): Uint8Array {
  const chunk = (type: string, data: Uint8Array): Buffer => {
    const length = Buffer.alloc(4);
    length.writeUInt32BE(data.length);
    const body = Buffer.concat([Buffer.from(type, "ascii"), data]);
    const crc = Buffer.alloc(4);
    crc.writeUInt32BE(crc32(body));
    return Buffer.concat([length, body, crc]);
  };
  const header = Buffer.alloc(13);
  header.writeUInt32BE(image.width, 0);
  header.writeUInt32BE(image.height, 4);
  header[8] = 8; // ビット深度
  header[9] = 6; // RGBA
  const stride = image.width * 4 + 1;
  const raw = Buffer.alloc(stride * image.height);
  for (let y = 0; y < image.height; y++) {
    raw[y * stride] = 0;
    raw.set(
      image.data.subarray(y * image.width * 4, (y + 1) * image.width * 4),
      y * stride + 1,
    );
  }
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk("IHDR", header),
    chunk("IDAT", deflateSync(raw, { level: 9 })),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

function findGroup(psd: Psd, name: string): Layer {
  const group = psd.children?.find((layer) => layer.name === name);
  if (group === undefined) {
    throw new Error(`PSD に「${name}」がありません`);
  }
  return group;
}

function findLayer(psd: Psd, groupName: string, name: string): Layer {
  const layer = findGroup(psd, groupName).children?.find(
    (child) => child.name === name,
  );
  if (layer === undefined) {
    throw new Error(`PSD の「${groupName}」に「${name}」がありません`);
  }
  return layer;
}

type PartPosition = {
  readonly file: string;
  readonly left: number;
  readonly top: number;
  readonly width: number;
  readonly height: number;
};

/** レイヤーを PSD と同じ大きさの画像に描き, 透明でない部分だけを縮小して書き出す */
async function exportPart(
  psd: Psd,
  name: string,
  layers: readonly Layer[],
): Promise<PartPosition> {
  const canvas = blank(psd.width, psd.height);
  for (const layer of layers) {
    drawLayer(canvas, layer, 0, 0);
  }
  const bounds = opaqueBounds(canvas);
  if (bounds === undefined) {
    throw new Error(`${name} が空です`);
  }
  const image = downscale(crop(canvas, bounds));
  const file = `${name}.png`;
  await writeFile(join(OUTPUT_DIR, file), encodePng(image));
  return {
    file: `/story/zundamon/${file}`,
    left: bounds.left / SCALE,
    top: bounds.top / SCALE,
    width: image.width,
    height: image.height,
  };
}

/** 口・目・眉のレイヤーを, 顔の周りを切り出して並べた確認用の画像 */
async function writePreview(psd: Psd, dir: string): Promise<void> {
  const region = { left: 330, top: 230, width: 320, height: 300 };
  const face = (groupName: string, pick: Layer): Image => {
    const image = blank(region.width, region.height);
    image.data.fill(255);
    for (const group of psd.children ?? []) {
      if (group.name === "!記号など") {
        continue;
      }
      const layers =
        group.name === groupName
          ? [pick]
          : group.children === undefined
            ? [group]
            : group.children.filter((child) => child.hidden !== true);
      for (const layer of layers) {
        drawLayer(image, layer, region.left, region.top);
      }
    }
    return image;
  };
  await mkdir(dir, { recursive: true });
  for (const [groupName, file] of [
    ["!口", "mouth"],
    ["!目", "eyes"],
    ["!眉", "brows"],
  ] as const) {
    const layers = findGroup(psd, groupName).children ?? [];
    const columns = 6;
    const sheet = blank(
      columns * region.width,
      Math.ceil(layers.length / columns) * region.height,
    );
    layers.forEach((layer, index) => {
      drawOver(
        sheet,
        face(groupName, layer),
        (index % columns) * region.width,
        Math.floor(index / columns) * region.height,
      );
    });
    await writeFile(join(dir, `${file}.png`), encodePng(sheet));
    console.log(
      `${file}.png: ${layers.map((l, i) => `${i}:${l.name ?? ""}`).join(" ")}`,
    );
  }
}

async function main(): Promise<void> {
  const [psdPath, flag, previewDir] = process.argv.slice(2);
  if (psdPath === undefined) {
    throw new Error(
      "使い方: node scripts/export_zundamon.ts <ずんだもん立ち絵素材V3.2_基本版.psd> [--preview <dir>]",
    );
  }
  const psd = readPsd(await readFile(psdPath), {
    useImageData: true,
    skipCompositeImageData: true,
    skipThumbnail: true,
  });
  if (flag === "--preview" && previewDir !== undefined) {
    await writePreview(psd, previewDir);
    return;
  }

  await rm(OUTPUT_DIR, { recursive: true, force: true });
  await mkdir(OUTPUT_DIR, { recursive: true });
  const body = await exportPart(
    psd,
    "body",
    BODY_LAYERS.map(([group, layer]) =>
      layer === undefined
        ? findGroup(psd, group)
        : findLayer(psd, group, layer),
    ),
  );
  const mouths: Record<string, PartPosition> = {};
  for (const [shape, layer] of Object.entries(MOUTHS)) {
    mouths[shape] = await exportPart(psd, `mouth-${shape}`, [
      findLayer(psd, "!口", layer),
    ]);
  }
  const eyes: Record<string, PartPosition> = {};
  const brows: Record<string, PartPosition> = {};
  for (const [face, { eyes: eyeLayer, brows: browLayer }] of Object.entries(
    FACES,
  )) {
    eyes[face] = await exportPart(psd, `eyes-${face}`, [
      findLayer(psd, "!目", eyeLayer),
    ]);
    brows[face] = await exportPart(psd, `brows-${face}`, [
      findLayer(psd, "!眉", browLayer),
    ]);
  }
  const blink = await exportPart(psd, "eyes-blink", [
    findLayer(psd, "!目", BLINK_EYES),
  ]);

  await writeFile(
    MANIFEST_PATH,
    `/**
 * ずんだもんの立ち絵のパーツ. scripts/export_zundamon.ts が作るので手で直さない.
 * 立ち絵: 坂本アヒル「ずんだもん立ち絵素材 V3.2」(基本版, https://tachie.net/w/sC90rhbReJ) を縮小 (1/${SCALE}) して書き出したもの.
 * 位置は全体 (${psd.width / SCALE}×${psd.height / SCALE}) の左上からの画素数
 */

export type ZundamonPart = {
  readonly file: string;
  readonly left: number;
  readonly top: number;
  readonly width: number;
  readonly height: number;
};

export const ZUNDAMON_SIZE = { width: ${psd.width / SCALE}, height: ${psd.height / SCALE} } as const;

export const ZUNDAMON_PARTS = ${JSON.stringify({ body, mouths, eyes, brows, blink }, null, 2)} as const;
`,
  );
  const files = await readdir(OUTPUT_DIR);
  console.log(`${files.length} 個のパーツ → ${OUTPUT_DIR}`);
}

await main();
