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

export type MatchArm = {
  readonly tag: string;
  /** 束縛する変数の ID. 束縛しないアームは -1 */
  readonly variable_id: number;
  readonly variable_name: string;
  readonly body: unknown;
};

/** 束縛しないアームの変数 ID */
export const NO_VARIABLE = -1;

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
    arms: Array.isArray(arms) ? (arms as ReadonlyArray<MatchArm>) : [],
  };
}

export function matchExpression(
  target: unknown,
  arms: ReadonlyArray<MatchArm>,
): unknown {
  return variant("match", { target, arms });
}

/** アームが変数に束縛するか */
export function armBindsVariable(arm: MatchArm): boolean {
  return arm.variable_id !== NO_VARIABLE;
}
