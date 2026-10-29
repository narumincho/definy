import type { LayoutNode, PathStep } from "../types.ts";
import { field, variantOf } from "../../definy_value.ts";
import type { ScopeContext } from "./types.ts";
import { formatFloatLiteral } from "../expression.ts";

export function tryBuildLiteralNode(
  expr: unknown,
  idPrefix: string,
  currentPath: ReadonlyArray<PathStep>,
  context: ScopeContext,
): LayoutNode | null {
  if (expr === null || expr === undefined) {
    return {
      id: idPrefix,
      path: currentPath,
      label: "none",
      kind: "delimiter",
      children: [],
      computedWidth: 32,
      computedHeight: 26,
      layoutMode: "inline",
    };
  }

  const tagged = variantOf(expr);
  if (tagged === undefined) {
    return {
      id: idPrefix,
      path: currentPath,
      label: String(expr),
      kind: "identifier",
      children: [],
      computedWidth: 32,
      computedHeight: 26,
      layoutMode: "inline",
    };
  }
  const { tag, payload } = tagged;
  const leaf = (label: string, kind: LayoutNode["kind"]): LayoutNode => ({
    id: idPrefix,
    path: currentPath,
    label,
    kind,
    children: [],
    computedWidth: 0,
    computedHeight: 0,
    layoutMode: "inline",
  });

  switch (tag) {
    case "number":
      return leaf(String(payload ?? 0), "literalNumber");
    case "float":
      return leaf(formatFloatLiteral(payload), "literalNumber");
    case "string":
      return leaf(`"${String(payload ?? "")}"`, "literalString");
    case "boolean":
      return leaf(payload === true ? "true" : "false", "literalBoolean");
    case "variable": {
      const varId = Number(field(payload, "variable_id") ?? 0);
      const varName = context.scopeVariables?.get(varId);
      return leaf(
        varName && varName.length > 0 ? varName : `var_${varId}`,
        "identifier",
      );
    }
    case "part_reference": {
      const raw = field(payload, "part_definition_event_hash");
      // seeds の JSON のまま (`{"$part": "module.name"}`) ならその名前を出す
      const seedName = field(raw, "$part");
      if (typeof seedName === "string") {
        return leaf(seedName, "identifier");
      }
      const id = typeof raw === "string" ? raw : "";
      return leaf(
        context.partNames?.get(id) ?? `@part:${id.slice(0, 6)}`,
        "identifier",
      );
    }
    // コンパイラ組み込み (`{"#builtin": "string_concat"}`). パーツ名ではなく式の値から `builtin string-concat` と出す
    // (パーツ名を変えても, 中身がどの組み込みかは変わらないため)
    case "builtin":
      return leaf(`builtin ${String(payload).replaceAll("_", "-")}`, "keyword");
    // シークレットリテラル. 値は持たないので名前だけ出す (値・送ってよい宛先はパーツのページで設定する)
    case "secret":
      return leaf(`secret ${String(field(payload, "label") ?? "")}`, "keyword");
    case "hole":
      return leaf("□", "identifier");
  }
  // 型の式 (`type_number` など, 子を持たないもの) は `number` のように型の名前で出す
  if (tag.startsWith("type_") && payload === null) {
    return leaf(tag.slice("type_".length), "keyword");
  }
  return null;
}
