/* eslint-disable */
/* generated by definy. Do not edit! */

import * as a from "https://raw.githubusercontent.com/narumincho/definy/f662850e6a0cb9ec7a69e60f424624c07dd417fa/deno-lib/definyRpc/core/coreType.ts";

/**
 * Dart の演算子
 */
export type Operator =
  | {
      /**
       * ??
       */
      readonly type: "nullishCoalescing";
      readonly [Symbol.toStringTag]: "dart.Operator";
    }
  | {
      /**
       * !=
       */
      readonly type: "notEqual";
      readonly [Symbol.toStringTag]: "dart.Operator";
    }
  | {
      /**
       * ==
       */
      readonly type: "equal";
      readonly [Symbol.toStringTag]: "dart.Operator";
    };

/**
 * Dart の演算子
 */
export const Operator: {
  /**
   * Operator の型
   */
  readonly type: () => a.Type<Operator>;
  /**
   * ??
   */
  readonly nullishCoalescing: Operator;
  /**
   * !=
   */
  readonly notEqual: Operator;
  /**
   * ==
   */
  readonly equal: Operator;
} = {
  type: (): a.Type<Operator> =>
    a.Type.from({
      namespace: a.Namespace.local(["dart"]),
      name: "Operator",
      parameters: [],
    }),
  nullishCoalescing: {
    type: "nullishCoalescing",
    [Symbol.toStringTag]: "dart.Operator",
  },
  notEqual: { type: "notEqual", [Symbol.toStringTag]: "dart.Operator" },
  equal: { type: "equal", [Symbol.toStringTag]: "dart.Operator" },
};