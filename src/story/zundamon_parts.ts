/**
 * ずんだもんの立ち絵のパーツ. scripts/export_zundamon.ts が作るので手で直さない.
 * 立ち絵: 坂本アヒル「ずんだもん立ち絵素材 V3.2」(基本版, https://tachie.net/w/sC90rhbReJ) を縮小 (1/2) して書き出したもの.
 * 位置は全体 (541×797) の左上からの画素数
 */

export type ZundamonPart = {
  readonly file: string;
  readonly left: number;
  readonly top: number;
  readonly width: number;
  readonly height: number;
};

export const ZUNDAMON_SIZE = { width: 541, height: 797 } as const;

export const ZUNDAMON_PARTS = {
  body: {
    file: "/story/zundamon/body.png",
    left: 123,
    top: 58,
    width: 359,
    height: 713,
  },
  mouths: {
    closed: {
      file: "/story/zundamon/mouth-closed.png",
      left: 230,
      top: 229,
      width: 30,
      height: 13,
    },
    n: {
      file: "/story/zundamon/mouth-n.png",
      left: 232,
      top: 238,
      width: 31,
      height: 6,
    },
    a: {
      file: "/story/zundamon/mouth-a.png",
      left: 226,
      top: 220,
      width: 36,
      height: 33,
    },
    i: {
      file: "/story/zundamon/mouth-i.png",
      left: 228,
      top: 231,
      width: 38,
      height: 16,
    },
    u: {
      file: "/story/zundamon/mouth-u.png",
      left: 236,
      top: 229,
      width: 18,
      height: 20,
    },
    e: {
      file: "/story/zundamon/mouth-e.png",
      left: 229,
      top: 230,
      width: 37,
      height: 19,
    },
    o: {
      file: "/story/zundamon/mouth-o.png",
      left: 227,
      top: 220,
      width: 36,
      height: 31,
    },
  },
  eyes: {
    normal: {
      file: "/story/zundamon/eyes-normal.png",
      left: 179,
      top: 161,
      width: 136,
      height: 56,
    },
    happy: {
      file: "/story/zundamon/eyes-happy.png",
      left: 184,
      top: 190,
      width: 122,
      height: 21,
    },
    surprised: {
      file: "/story/zundamon/eyes-surprised.png",
      left: 183,
      top: 172,
      width: 123,
      height: 42,
    },
    troubled: {
      file: "/story/zundamon/eyes-troubled.png",
      left: 179,
      top: 161,
      width: 136,
      height: 56,
    },
  },
  brows: {
    normal: {
      file: "/story/zundamon/brows-normal.png",
      left: 184,
      top: 139,
      width: 104,
      height: 12,
    },
    happy: {
      file: "/story/zundamon/brows-happy.png",
      left: 186,
      top: 131,
      width: 106,
      height: 15,
    },
    surprised: {
      file: "/story/zundamon/brows-surprised.png",
      left: 186,
      top: 131,
      width: 106,
      height: 15,
    },
    troubled: {
      file: "/story/zundamon/brows-troubled.png",
      left: 187,
      top: 138,
      width: 106,
      height: 15,
    },
  },
  blink: {
    file: "/story/zundamon/eyes-blink.png",
    left: 183,
    top: 191,
    width: 123,
    height: 22,
  },
} as const;
