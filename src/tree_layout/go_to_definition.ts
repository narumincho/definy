/**
 * 定義への移動 (F12 / Ctrl・Cmd + クリック / 置換メニューの go-to-definition, docs/key.md).
 * ローカル変数なら式の中の定義 (変数名) へ, パーツの参照・呼び出しならそのパーツの詳細ページへ移動する
 */
import {
  findVariableDefinitionPath,
  isVariableNamePath,
} from "./local_variable.ts";
import { isMatchPatternPath } from "./match_pattern.ts";
import { getExpressionAtPath } from "./path.ts";
import { referencedPartIdHash } from "./hover_info.ts";
import type { SelectorOption } from "./selector_options.ts";
import type { PathStep } from "./types.ts";

/** 定義への移動先 */
export type DefinitionTarget =
  /** 同じ式の中の変数の定義 (関数の引数名・let の変数名・match で束縛する変数の名前) のパス */
  | { readonly kind: "variable"; readonly path: ReadonlyArray<PathStep> }
  /** パーツ (型パーツも). パーツ ID (URL-safe Base64) */
  | { readonly kind: "part"; readonly partIdHash: string };

/** その位置の式の定義への移動先. 変数・パーツを参照していない (定義が分からない) なら `null` */
export function findDefinitionTarget(
  expr: unknown,
  path: ReadonlyArray<PathStep>,
): DefinitionTarget | null {
  // 変数の名前・match のパターンは定義そのもの (式ではない)
  if (isVariableNamePath(path) || isMatchPatternPath(path)) {
    return null;
  }
  const variablePath = findVariableDefinitionPath(expr, path);
  if (variablePath !== null) {
    return { kind: "variable", path: variablePath };
  }
  const partIdHash = referencedPartIdHash(getExpressionAtPath(expr, path));
  return partIdHash === null ? null : { kind: "part", partIdHash };
}

/** 置換メニューの「定義へ移動」の選択肢の value */
export const GO_TO_DEFINITION = "action:go-to-definition";

/** 選んだ式が定義の分かる変数・パーツを参照していれば, 置換メニューに出す「定義へ移動」の選択肢 */
export function goToDefinitionOption(
  expr: unknown,
  path: ReadonlyArray<PathStep>,
): ReadonlyArray<SelectorOption> {
  return findDefinitionTarget(expr, path) === null
    ? []
    : [
        {
          value: GO_TO_DEFINITION,
          name: "go-to-definition",
          detail: "F12 / Ctrl+Click",
          category: "Local",
          returnType: "any",
        },
      ];
}
