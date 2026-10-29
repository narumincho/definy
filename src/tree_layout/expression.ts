/**
 * 式のツリーエディタが扱う式 (`core.expression` の値. docs/value-encoding.md の形) を読み書きする小さな関数.
 *
 * `let` は `core.expression` では束縛 1 つずつの入れ子 (`let x = 1 in let y = 2 in body`) だが,
 * エディタでは続けて書いた let をまとめて 1 つのブロック (束縛の並びと本体) として見せる ({@link letChainOf})
 */
import { field, variant, variantOf, variantPayload } from "../definy_value.ts";

/** 未入力 */
export function hole(): unknown {
  return variant("hole", { probe: false });
}

export function isHole(expression: unknown): boolean {
  return variantOf(expression)?.tag === "hole";
}

export function numberExpression(value: number): unknown {
  return variant("number", value);
}

/**
 * 浮動小数のリテラル `mantissa × 10^exponent` (`core.expression` の `float`).
 * 値を 2 進の浮動小数で持たず 10 進で持つので, JSON や CBOR でも整数として正確に保存できる
 */
export function floatExpression(mantissa: number, exponent: number): unknown {
  return variant("float", { mantissa, exponent });
}

/**
 * 有限の数を浮動小数のリテラルにする. JavaScript の最短の 10 進表記 (`String(value)`) の仮数と指数にするので,
 * 打った `1.5` や `0.1` がそのままのリテラルになる. 有限でなければ `null`
 */
export function floatExpressionFromNumber(value: number): unknown {
  if (!Number.isFinite(value)) {
    return null;
  }
  const match = /^(-?)(\d+)(?:\.(\d+))?(?:e([+-]?\d+))?$/.exec(String(value));
  if (match === null) {
    return null;
  }
  const [, sign = "", integer = "", fraction = "", exponent = "0"] = match;
  const digits = `${integer}${fraction}`.replace(/^0+(?=\d)/, "");
  return floatExpression(
    Number(`${sign}${digits}`),
    Number(exponent) - fraction.length,
  );
}

/** 浮動小数のリテラルの表示. 整数でも `2.0` のように小数点を付けて整数のリテラルと見分ける */
export function formatFloatLiteral(payload: unknown): string {
  const mantissa = Number(field(payload, "mantissa") ?? 0);
  const exponent = Number(field(payload, "exponent") ?? 0);
  const text = String(Number(`${mantissa}e${exponent}`));
  return /[.eEN]/.test(text) ? text : `${text}.0`;
}

export function stringExpression(value: string): unknown {
  return variant("string", value);
}

export function booleanExpression(value: boolean): unknown {
  return variant("boolean", value);
}

export function variableExpression(variableId: number): unknown {
  return variant("variable", { variable_id: variableId });
}

export function partReferenceExpression(partId: string): unknown {
  return variant("part_reference", { part_definition_event_hash: partId });
}

export type CallArgument = {
  readonly name: string;
  readonly value: unknown;
};

export function callExpression(
  callee: unknown,
  args: ReadonlyArray<CallArgument>,
): unknown {
  return variant("call", { function: callee, arguments: args });
}

/** 変数の参照 (`variable`) ならその変数 ID */
export function variableIdOf(expression: unknown): number | null {
  const id = field(variantPayload(expression, "variable"), "variable_id");
  return typeof id === "number" && Number.isInteger(id) ? id : null;
}

/** パーツの参照 (`part_reference`) ならそのパーツ ID */
export function partReferenceIdOf(expression: unknown): string | null {
  const id = field(
    variantPayload(expression, "part_reference"),
    "part_definition_event_hash",
  );
  return typeof id === "string" ? id : null;
}

/** 呼び出し (`call`) なら, 呼び出す関数 (`core.callee`) と引数 */
export function callOf(expression: unknown):
  | {
      readonly callee: unknown;
      readonly arguments: ReadonlyArray<CallArgument>;
    }
  | undefined {
  const payload = variantPayload(expression, "call");
  if (payload === undefined) {
    return undefined;
  }
  const args = field(payload, "arguments");
  return {
    callee: field(payload, "function"),
    arguments: Array.isArray(args) ? (args as ReadonlyArray<CallArgument>) : [],
  };
}

export type LetBinding = {
  readonly variable_id: number;
  readonly variable_name: string;
  readonly value: unknown;
};

/** 続けて書いた let (`let x = 1 in let y = 2 in body`) の束縛の並びと本体. let でなければ `undefined` */
export function letChainOf(expression: unknown):
  | {
      readonly bindings: ReadonlyArray<LetBinding>;
      readonly body: unknown;
    }
  | undefined {
  const bindings: LetBinding[] = [];
  let current = expression;
  for (;;) {
    const payload = variantPayload(current, "let");
    if (payload === undefined) {
      break;
    }
    bindings.push({
      variable_id: Number(field(payload, "variable_id")),
      variable_name: String(field(payload, "variable_name") ?? ""),
      value: field(payload, "value"),
    });
    current = field(payload, "body");
  }
  return bindings.length === 0 ? undefined : { bindings, body: current };
}

/** 束縛の並びと本体から入れ子の let を作る. 束縛が無ければ本体そのもの */
export function letChain(
  bindings: ReadonlyArray<LetBinding>,
  body: unknown,
): unknown {
  return bindings.reduceRight<unknown>(
    (inner, binding) =>
      variant("let", {
        variable_id: binding.variable_id,
        variable_name: binding.variable_name,
        value: binding.value,
        body: inner,
      }),
    body,
  );
}

/**
 * アームのパターン (`core.pattern`) の種類.
 * `any` は何にでも一致し束縛しない (`_`), `bind` は何にでも一致して値を変数に束縛する,
 * `variant` は直和型のタグに一致し値を束縛するかしない, `string` / `number` / `boolean` はリテラルに一致する.
 * `nested` はタグの値にさらにタグやリテラルのパターンがある直和型のパターンで, エディタではそのまま表示するだけ
 */
export type MatchArmKind =
  "any" | "bind" | "variant" | "string" | "number" | "boolean" | "nested";

/**
 * エディタで扱う match のアーム.
 * データ上のアームは `{pattern, body}` (pattern は `core.pattern` の木) で, それを 1 段のタグと束縛する変数に開いたもの
 * ({@link matchOf} / {@link matchExpression} で変換する)
 */
export type MatchArm = {
  readonly kind: MatchArmKind;
  /** variant / nested はタグ, string / number / boolean はリテラルを文字列にしたもの, any / bind は "" */
  readonly tag: string;
  /** 束縛する変数の ID (bind と, 値を変数に束縛する variant). 束縛しないアームは -1 */
  readonly variable_id: number;
  readonly variable_name: string;
  /** nested のときの元のパターン */
  readonly pattern?: unknown;
  readonly body: unknown;
};

/** 束縛しないアームの変数 ID */
export const NO_VARIABLE = -1;

/** `core.pattern` の `any` (`_`) */
export function anyPattern(): unknown {
  return variant("any");
}

export function bindPattern(variableId: number, variableName: string): unknown {
  return variant("bind", {
    variable_id: variableId,
    variable_name: variableName,
  });
}

/** 何にでも一致し束縛しないアーム (`_ => body`) */
export function wildcardArm(body: unknown): MatchArm {
  return {
    kind: "any",
    tag: "",
    variable_id: NO_VARIABLE,
    variable_name: "",
    body,
  };
}

/** 束縛しないリテラルやタグのアーム */
export function literalArm(
  kind: "variant" | "string" | "number" | "boolean",
  tag: string,
  body: unknown,
): MatchArm {
  return { kind, tag, variable_id: NO_VARIABLE, variable_name: "", body };
}

/** データ上のアーム `{pattern, body}` をエディタのアームにする */
export function armFromData(arm: unknown): MatchArm {
  const body = field(arm, "body");
  const pattern = variantOf(field(arm, "pattern"));
  const bound = (payload: unknown) => ({
    variable_id: Number(field(payload, "variable_id")),
    variable_name: String(field(payload, "variable_name") ?? ""),
  });
  switch (pattern?.tag) {
    case "bind":
      return { kind: "bind", tag: "", ...bound(pattern.payload), body };
    case "variant": {
      const tag = String(field(pattern.payload, "tag") ?? "");
      const payload = variantOf(field(pattern.payload, "payload"));
      if (payload?.tag === "bind") {
        return { kind: "variant", tag, ...bound(payload.payload), body };
      }
      if (payload?.tag === "any") {
        return literalArm("variant", tag, body);
      }
      return {
        kind: "nested",
        tag,
        variable_id: NO_VARIABLE,
        variable_name: "",
        pattern: field(arm, "pattern"),
        body,
      };
    }
    case "string":
    case "number":
    case "boolean":
      return literalArm(pattern.tag, String(pattern.payload), body);
    default:
      return wildcardArm(body);
  }
}

/** エディタのアームのパターン (`core.pattern` の値) */
export function patternOfArm(arm: MatchArm): unknown {
  const binding = armBindsVariable(arm)
    ? bindPattern(arm.variable_id, arm.variable_name)
    : anyPattern();
  switch (arm.kind) {
    case "any":
    case "bind":
      return binding;
    case "variant":
      return variant("variant", { tag: arm.tag, payload: binding });
    case "nested":
      return arm.pattern;
    case "string":
      return variant("string", arm.tag);
    case "number":
      return variant("number", Number(arm.tag));
    case "boolean":
      return variant("boolean", arm.tag === "true");
  }
}

/** エディタのアームをデータ上のアーム `{pattern, body}` にする */
export function armToData(arm: MatchArm): unknown {
  return { pattern: patternOfArm(arm), body: arm.body };
}

/** match なら対象とアーム */
export function matchOf(expression: unknown):
  | {
      readonly target: unknown;
      readonly arms: ReadonlyArray<MatchArm>;
    }
  | undefined {
  const payload = variantPayload(expression, "match");
  if (payload === undefined) {
    return undefined;
  }
  const arms = field(payload, "arms");
  return {
    target: field(payload, "target"),
    arms: Array.isArray(arms) ? arms.map(armFromData) : [],
  };
}

export function matchExpression(
  target: unknown,
  arms: ReadonlyArray<MatchArm>,
): unknown {
  return variant("match", { target, arms: arms.map(armToData) });
}

/** どの値にも一致するアーム (`_` か変数への束縛) か. これより後のアームには一致しない */
export function isWildcardArm(arm: MatchArm): boolean {
  return arm.kind === "any" || arm.kind === "bind";
}

/** アームが (1 段目で) 変数に束縛するか */
export function armBindsVariable(arm: MatchArm): boolean {
  return arm.variable_id !== NO_VARIABLE;
}

/** パターンが束縛する変数 (ネストしたものも含む, 出てくる順) */
export function patternBoundVariables(
  pattern: unknown,
): ReadonlyArray<{ readonly id: number; readonly name: string }> {
  const tagged = variantOf(pattern);
  if (tagged?.tag === "bind") {
    return [
      {
        id: Number(field(tagged.payload, "variable_id")),
        name: String(field(tagged.payload, "variable_name") ?? ""),
      },
    ];
  }
  if (tagged?.tag === "variant") {
    return patternBoundVariables(field(tagged.payload, "payload"));
  }
  return [];
}

/**
 * パターンの表示. `_`, 変数名, `tag`, `tag(x)`, `"文字列"`, 数値, `true` / `false`.
 * 文字列リテラルは引用符で囲むので, `_` (どれにでも一致) と `"_"` (文字列 `_`) は見分けられる
 */
export function patternLabel(pattern: unknown): string {
  const tagged = variantOf(pattern);
  switch (tagged?.tag) {
    case "bind": {
      const name = String(field(tagged.payload, "variable_name") ?? "");
      return name.length > 0
        ? name
        : `v${String(field(tagged.payload, "variable_id"))}`;
    }
    case "variant": {
      const tag = String(field(tagged.payload, "tag") ?? "");
      const payload = field(tagged.payload, "payload");
      return variantOf(payload)?.tag === "any"
        ? tag
        : `${tag}(${patternLabel(payload)})`;
    }
    case "string":
      return JSON.stringify(String(tagged.payload));
    case "number":
    case "boolean":
      return String(tagged.payload);
    default:
      return "_";
  }
}
