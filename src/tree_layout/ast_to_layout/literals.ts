import type { LayoutNode, PathStep } from "../types.ts";
import { bytesToUrlSafeBase64NoPad, toUint8Array } from "../../cbor.ts";
import type { ScopeContext } from "./types.ts";

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

  if (typeof expr !== "object") {
    // TypeNumber などの型は `number` のように型の名前で出す
    const text = String(expr);
    const typeName = /^Type[A-Z]/.test(text)
      ? text.slice(4).toLowerCase()
      : null;
    return {
      id: idPrefix,
      path: currentPath,
      label: typeName ?? text,
      kind: typeName !== null ? "keyword" : "identifier",
      children: [],
      computedWidth: 32,
      computedHeight: 26,
      layoutMode: "inline",
    };
  }

  const node = expr as Record<string, unknown>;

  if ("Number" in node) {
    const val = (node.Number as { value?: unknown })?.value ?? 0;
    return {
      id: idPrefix,
      path: currentPath,
      label: String(val),
      kind: "literalNumber",
      children: [],
      computedWidth: 0,
      computedHeight: 0,
      layoutMode: "inline",
    };
  }

  if ("String" in node) {
    const val = String((node.String as { value?: unknown })?.value ?? "");
    return {
      id: idPrefix,
      path: currentPath,
      label: `"${val}"`,
      kind: "literalString",
      children: [],
      computedWidth: 0,
      computedHeight: 0,
      layoutMode: "inline",
    };
  }

  if ("Boolean" in node) {
    const val = Boolean((node.Boolean as { value?: unknown })?.value);
    return {
      id: idPrefix,
      path: currentPath,
      label: val ? "true" : "false",
      kind: "literalBoolean",
      children: [],
      computedWidth: 0,
      computedHeight: 0,
      layoutMode: "inline",
    };
  }

  if ("Variable" in node) {
    const raw = node.Variable;
    const varId =
      typeof raw === "number"
        ? raw
        : Number((raw as { variable_id?: unknown })?.variable_id ?? 0);
    const varName = context.scopeVariables?.get(varId);
    const label = varName && varName.length > 0 ? varName : `var_${varId}`;
    return {
      id: idPrefix,
      path: currentPath,
      label,
      kind: "identifier",
      children: [],
      computedWidth: 0,
      computedHeight: 0,
      layoutMode: "inline",
    };
  }

  if ("PartReference" in node) {
    const raw = (node.PartReference as { part_definition_event_hash?: unknown })
      ?.part_definition_event_hash;
    let label: string;
    if (typeof raw === "object" && raw !== null && "$part" in raw) {
      label = String((raw as { $part: unknown }).$part);
    } else {
      const bytes = toUint8Array(raw);
      const b64 = bytes ? bytesToUrlSafeBase64NoPad(bytes) : null;
      const partName =
        (b64 ? context.partNames?.get(b64) : undefined) ??
        (typeof raw === "string" ? context.partNames?.get(raw) : undefined);
      label = partName ?? `@part:${(b64 ?? String(raw ?? "")).slice(0, 6)}`;
    }
    return {
      id: idPrefix,
      path: currentPath,
      label,
      kind: "identifier",
      children: [],
      computedWidth: 0,
      computedHeight: 0,
      layoutMode: "inline",
    };
  }

  // コンパイラ組み込み (`{"Compiler": "string_concat"}`). パーツ名ではなく式の値から `builtin string-concat` と出す
  // (パーツ名を変えても, 中身がどの組み込みかは変わらないため)
  if ("Compiler" in node) {
    return {
      id: idPrefix,
      path: currentPath,
      label: `builtin ${String(node.Compiler).replaceAll("_", "-")}`,
      kind: "keyword",
      children: [],
      computedWidth: 0,
      computedHeight: 0,
      layoutMode: "inline",
    };
  }

  // シークレットリテラル. 値は持たないので名前だけ出す (値・送ってよい宛先はパーツのページで設定する)
  if ("Secret" in node) {
    const secret = node.Secret as { readonly label?: unknown } | null;
    return {
      id: idPrefix,
      path: currentPath,
      label: `secret ${String(secret?.label ?? "")}`,
      kind: "keyword",
      children: [],
      computedWidth: 0,
      computedHeight: 0,
      layoutMode: "inline",
    };
  }

  if ("Hole" in node) {
    return {
      id: idPrefix,
      path: currentPath,
      label: "□",
      kind: "identifier",
      children: [],
      computedWidth: 0,
      computedHeight: 0,
      layoutMode: "inline",
    };
  }

  return null;
}
