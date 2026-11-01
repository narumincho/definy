/**
 * ツリーエディタのキーボードによる選択移動 (docs/key.md).
 *
 * - WASD / 矢印キー: 画面上の配置の方向にある式へ移動
 * - Q: 親の式へ, Shift+Q: ルートの式へ
 * - E: 子の式の先頭へ, Shift+E: 子の式の末尾へ
 *
 * 移動先の決定は DOM に依存しない純粋な関数にしてテストできるようにしている.
 */
import { isSamePath, isSamePathStep, type PathStep } from "./types.ts";

export type NavKey =
  | "up"
  | "down"
  | "left"
  | "right"
  | "parent"
  | "root"
  | "firstChild"
  | "lastChild";

type KeyInput = {
  readonly key: string;
  readonly shiftKey: boolean;
  readonly ctrlKey: boolean;
  readonly metaKey: boolean;
  readonly altKey: boolean;
};

/**
 * キー入力を移動の種類に変換する. Ctrl / Meta / Alt 付き (ブラウザのショートカット) は対象外
 */
export function navKeyFromEvent(e: KeyInput): NavKey | null {
  if (e.ctrlKey || e.metaKey || e.altKey) {
    return null;
  }
  switch (e.key) {
    case "ArrowUp":
    case "w":
    case "W":
      return "up";
    case "ArrowDown":
    case "s":
    case "S":
      return "down";
    case "ArrowLeft":
    case "a":
    case "A":
      return "left";
    case "ArrowRight":
    case "d":
    case "D":
      return "right";
    case "q":
    case "Q":
      return e.shiftKey ? "root" : "parent";
    case "e":
    case "E":
      return e.shiftKey ? "lastChild" : "firstChild";
    default:
      return null;
  }
}

/** 画面上の矩形 (getBoundingClientRect の値) */
export type Rect = {
  readonly left: number;
  readonly top: number;
  readonly right: number;
  readonly bottom: number;
};

export type NavNode = {
  readonly path: ReadonlyArray<PathStep>;
  readonly rect: Rect;
};

function startsWith(
  path: ReadonlyArray<PathStep>,
  prefix: ReadonlyArray<PathStep>,
): boolean {
  return (
    path.length >= prefix.length &&
    prefix.every((step, i) => {
      const target = path[i];
      return target !== undefined && isSamePathStep(step, target);
    })
  );
}

/**
 * 選択できる式の一覧 (表示順) から, `current` を `key` の方向に動かした先の式のパスを返す.
 *
 * `nodes` は式のパスごとに 1 つ (その式全体を囲む要素の矩形) で, 画面上の表示順 (行きがけ順) に並んでいること.
 * 未選択のときはルート (先頭) を選ぶ. 移動先がなければ `null`
 */
export function navigate(
  nodes: ReadonlyArray<NavNode>,
  current: ReadonlyArray<PathStep> | null,
  key: NavKey,
): ReadonlyArray<PathStep> | null {
  const root = nodes[0]?.path ?? null;
  if (current === null || !nodes.some((n) => isSamePath(n.path, current))) {
    return root;
  }
  switch (key) {
    case "root":
      return root !== null && !isSamePath(root, current) ? root : null;
    case "parent": {
      // 中間のパス (例えば let の束縛) が画面上の式に対応しないこともあるので, 見つかるまで上る
      for (let len = current.length - 1; len >= 0; len--) {
        const path = current.slice(0, len);
        if (nodes.some((n) => isSamePath(n.path, path))) {
          return path;
        }
      }
      return null;
    }
    case "firstChild":
    case "lastChild": {
      const descendants = nodes
        .map((n) => n.path)
        .filter((p) => p.length > current.length && startsWith(p, current));
      if (descendants.length === 0) {
        return null;
      }
      // 直下の子が表示されていなければ, 最も浅い子孫を子とみなす
      const minDepth = Math.min(...descendants.map((p) => p.length));
      const children = descendants.filter((p) => p.length === minDepth);
      return (
        (key === "firstChild" ? children[0] : children[children.length - 1]) ??
        null
      );
    }
    case "up":
    case "down":
    case "left":
    case "right":
      return findSpatialNeighbor(nodes, current, key);
  }
}

function findSpatialNeighbor(
  nodes: ReadonlyArray<NavNode>,
  current: ReadonlyArray<PathStep>,
  key: "up" | "down" | "left" | "right",
): ReadonlyArray<PathStep> | null {
  const found = nodes.find((n) => isSamePath(n.path, current));
  if (found === undefined) {
    return null;
  }
  const c: Rect = found.rect;
  const cx = (c.left + c.right) / 2;
  const cy = (c.top + c.bottom) / 2;

  // 祖先・子孫は Q / E で移動するので, 方向移動の候補からは外す
  const candidates = nodes.filter(
    (n) => !startsWith(n.path, current) && !startsWith(current, n.path),
  );

  function bestIn(
    list: ReadonlyArray<NavNode>,
  ): ReadonlyArray<PathStep> | null {
    let best: {
      readonly score: number;
      readonly path: ReadonlyArray<PathStep>;
    } | null = null;
    for (const { path, rect: r } of list) {
      const rx = (r.left + r.right) / 2;
      const ry = (r.top + r.bottom) / 2;
      let axial: number;
      let orthogonal: number;
      if (key === "up" && (r.bottom <= cy || ry < cy)) {
        axial = Math.max(c.top - r.bottom, cy - ry);
        orthogonal = Math.abs(cx - rx);
      } else if (key === "down" && (r.top >= cy || ry > cy)) {
        axial = Math.max(r.top - c.bottom, ry - cy);
        orthogonal = Math.abs(cx - rx);
      } else if (key === "left" && (r.right <= cx || rx < cx)) {
        axial = Math.max(c.left - r.right, cx - rx);
        orthogonal = Math.abs(cy - ry);
      } else if (key === "right" && (r.left >= cx || rx > cx)) {
        axial = Math.max(r.left - c.right, rx - cx);
        orthogonal = Math.abs(cy - ry);
      } else {
        continue;
      }
      // 進行方向の距離を重く見て, 横ずれの小さいものを優先する
      const score = Math.max(axial, 0) * 10 + orthogonal;
      if (best === null || score < best.score) {
        best = { score, path };
      }
    }
    return best?.path ?? null;
  }

  // 1. 同じ親を持つ兄弟を優先し, 2. なければ画面上のほかの式から探す
  if (current.length > 0) {
    const parent = current.slice(0, -1);
    const siblings = candidates.filter(
      (n) => n.path.length === current.length && startsWith(n.path, parent),
    );
    const target = bestIn(siblings);
    if (target !== null) {
      return target;
    }
  }
  return bestIn(candidates);
}

export const TREE_INTERCEPT_KEYS: ReadonlySet<string> = new Set([
  "Enter",
  "Escape",
  "Delete",
  "Backspace",
  "F12",
]);

export function isTextInput(target: EventTarget | null): boolean {
  return (
    typeof HTMLElement !== "undefined" &&
    (target instanceof HTMLInputElement ||
      target instanceof HTMLTextAreaElement ||
      target instanceof HTMLSelectElement)
  );
}
