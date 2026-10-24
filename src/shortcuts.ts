/**
 * ショートカットキー一覧 (Cmd / Ctrl + / で開く, docs/key.md「ショートカットキー一覧」) に出すキーの定義.
 *
 * キーの処理そのものは各コンポーネントにあるので, キー操作を足したり変えたりしたらここも直す.
 */
import { label } from "./language.ts";
import type { LanguageCode } from "./types.ts";

/**
 * キーの組み合わせの 1 つ. `"Mod"` は Mac なら ⌘ (Command), それ以外なら Ctrl として表示する.
 * それ以外の要素はそのままキーの名前として表示する
 */
export type KeyCombo = ReadonlyArray<string>;

export type Shortcut = {
  readonly id: string;
  /** どれを押しても同じ動作になるキーの組み合わせ */
  readonly keys: ReadonlyArray<KeyCombo>;
  readonly description: (language: LanguageCode) => string;
};

export type ShortcutGroup = {
  readonly id: string;
  readonly title: (language: LanguageCode) => string;
  readonly shortcuts: ReadonlyArray<Shortcut>;
};

export const SHORTCUT_GROUPS: ReadonlyArray<ShortcutGroup> = [
  {
    id: "global",
    title: (l) => label(l, "General", "全体", "Ĝenerale"),
    shortcuts: [
      {
        id: "command-palette",
        keys: [
          ["Mod", "P"],
          ["Mod", "K"],
        ],
        description: (l) =>
          label(
            l,
            "Search parts, modules and pages",
            "パーツ・モジュール・ページを検索",
            "Serĉi partojn, modulojn kaj paĝojn",
          ),
      },
      {
        id: "shortcut-list",
        keys: [["Mod", "/"]],
        description: (l) =>
          label(
            l,
            "Show keyboard shortcuts",
            "ショートカットキー一覧を表示",
            "Montri klavkombinojn",
          ),
      },
      {
        id: "run-panel",
        keys: [["Mod", "`"]],
        description: (l) =>
          label(
            l,
            "Toggle Run Panel",
            "実行パネルの表示切替",
            "Baskuligi rul-panelon",
          ),
      },
      {
        id: "undo",
        keys: [["Mod", "Z"]],
        description: (l) =>
          label(
            l,
            "Undo the part edit",
            "パーツの編集を元に戻す",
            "Malfari la redakton de la parto",
          ),
      },
      {
        id: "redo",
        keys: [
          ["Mod", "Shift", "Z"],
          ["Ctrl", "Y"],
        ],
        description: (l) =>
          label(
            l,
            "Redo the part edit",
            "パーツの編集をやり直す",
            "Refari la redakton de la parto",
          ),
      },
      {
        id: "close",
        keys: [["Escape"]],
        description: (l) =>
          label(
            l,
            "Close the palette or dialog",
            "パレット・ダイアログを閉じる",
            "Fermi la paletron aŭ dialogon",
          ),
      },
    ],
  },
  {
    id: "tree",
    title: (l) =>
      label(
        l,
        "Expression tree editor",
        "式のツリーエディタ",
        "Arbo-redaktilo",
      ),
    shortcuts: [
      {
        id: "tree-move",
        keys: [["W A S D"], ["↑ ← ↓ →"]],
        description: (l) =>
          label(
            l,
            "Move to the expression in that direction",
            "画面上でその方向にある式へ移動",
            "Iri al la esprimo en tiu direkto",
          ),
      },
      {
        id: "tree-parent",
        keys: [["Q"]],
        description: (l) =>
          label(l, "Move to the parent", "親の式へ移動", "Iri al la gepatro"),
      },
      {
        id: "tree-root",
        keys: [["Shift", "Q"]],
        description: (l) =>
          label(l, "Move to the root", "ルートの式へ移動", "Iri al la radiko"),
      },
      {
        id: "tree-first-child",
        keys: [["E"]],
        description: (l) =>
          label(
            l,
            "Move to the first child",
            "子の式の先頭へ移動",
            "Iri al la unua ido",
          ),
      },
      {
        id: "tree-last-child",
        keys: [["Shift", "E"]],
        description: (l) =>
          label(
            l,
            "Move to the last child",
            "子の式の末尾へ移動",
            "Iri al la lasta ido",
          ),
      },
      {
        id: "tree-edit",
        keys: [["Enter"]],
        description: (l) =>
          label(
            l,
            "Edit the selected expression",
            "選択中の式を編集",
            "Redakti la elektitan esprimon",
          ),
      },
      {
        id: "tree-deselect",
        keys: [["Escape"]],
        description: (l) =>
          label(
            l,
            "Back to the tree / clear the selection",
            "メニュー・入力欄からツリーに戻る / 選択を解除",
            "Reveni al la arbo / malelekti",
          ),
      },
      {
        id: "tree-clear",
        keys: [["Delete"], ["Backspace"]],
        description: (l) =>
          label(
            l,
            "Clear the selected expression",
            "選択中の式を未入力にする",
            "Malplenigi la elektitan esprimon",
          ),
      },
      {
        id: "tree-copy",
        keys: [["Mod", "C"]],
        description: (l) =>
          label(l, "Copy the expression", "式をコピー", "Kopii la esprimon"),
      },
      {
        id: "tree-cut",
        keys: [["Mod", "X"]],
        description: (l) =>
          label(l, "Cut the expression", "式を切り取り", "Tondi la esprimon"),
      },
      {
        id: "tree-paste",
        keys: [["Mod", "V"]],
        description: (l) =>
          label(
            l,
            "Paste into the selected expression",
            "選んだ式に貼り付け",
            "Alglui en la elektitan esprimon",
          ),
      },
      {
        id: "tree-go-to-definition",
        keys: [["F12"]],
        description: (l) =>
          label(
            l,
            "Go to the variable's definition",
            "変数の定義へ移動",
            "Iri al la difino de la variablo",
          ),
      },
    ],
  },
  {
    id: "run-panel",
    title: (l) => label(l, "Run Panel", "実行パネル", "Rul-panelo"),
    shortcuts: [
      {
        id: "run-panel-run",
        keys: [["Mod", "Enter"]],
        description: (l) =>
          label(
            l,
            "Run the input expression",
            "入力した式を実行",
            "Ruli la enigitan esprimon",
          ),
      },
    ],
  },
  {
    id: "command-palette",
    title: (l) =>
      label(l, "Command Palette", "コマンドパレット", "Komandpaletro"),
    shortcuts: [
      {
        id: "palette-move",
        keys: [["↑"], ["↓"]],
        description: (l) =>
          label(l, "Select a result", "候補を選ぶ", "Elekti rezulton"),
      },
      {
        id: "palette-open",
        keys: [["Enter"]],
        description: (l) =>
          label(
            l,
            "Open the selected result",
            "選んだ候補を開く",
            "Malfermi la elektitan rezulton",
          ),
      },
    ],
  },
];

/** キーの組み合わせを表示する文字列の列にする. Mac では ⌘ や ⇧ の記号を使う */
export function formatKeyCombo(
  combo: KeyCombo,
  isMac: boolean,
): ReadonlyArray<string> {
  return combo.map((key) => {
    if (!isMac) {
      return key === "Mod" ? "Ctrl" : key;
    }
    switch (key) {
      case "Mod":
        return "⌘";
      case "Shift":
        return "⇧";
      case "Ctrl":
        return "⌃";
      case "Alt":
        return "⌥";
      default:
        return key;
    }
  });
}

/** ブラウザが Mac (iPhone / iPad も含む) で動いているか. ⌘ で表示するかどうかに使う */
export function isMacPlatform(): boolean {
  if (typeof navigator === "undefined") {
    return false;
  }
  return /Mac|iPhone|iPad|iPod/.test(navigator.platform || navigator.userAgent);
}

/**
 * ショートカットキー一覧を開閉するキー (Cmd / Ctrl + /) か.
 * JIS 配列などでも同じ位置のキーで開けるように, `key` が `/` でなくても `code` が `Slash` なら受け付ける
 */
export function isShortcutListKey(e: {
  readonly key: string;
  readonly code: string;
  readonly ctrlKey: boolean;
  readonly metaKey: boolean;
  readonly altKey: boolean;
}): boolean {
  return (
    (e.ctrlKey || e.metaKey) &&
    !e.altKey &&
    (e.key === "/" || e.code === "Slash")
  );
}
