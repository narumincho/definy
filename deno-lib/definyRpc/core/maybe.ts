/**
 * deno 版 definy ではまだ型パラメータをサポートしてないので, 直接書いたこの型を使う
 *
 * 一時的対処. coreTypeに入れたい
 */

import { Namespace, StructuredJsonValue, Type } from "./coreType.ts";

export type Maybe<T extends unknown> = {
  readonly type: "just";
  readonly value: T;
} | {
  readonly type: "nothing";
};

export const Maybe = {
  fromStructuredJsonValue: <T>(valueFrom: (j: StructuredJsonValue) => T) =>
  (
    v: StructuredJsonValue,
  ): Maybe<T> => {
    if (v.type === "null") {
      return { type: "nothing" };
    }
    if (v.type !== "object") {
      throw new Error("maybe はobjectである必要があります");
    }
    const type: StructuredJsonValue | undefined = v.value.get("type");
    if (type === undefined || type.type !== "string") {
      throw new Error("expected type property type is string");
    }
    switch (type.value) {
      case "just": {
        const value: StructuredJsonValue | undefined = v.value.get(
          "value",
        );
        if (value === undefined) {
          throw new Error("expected value property in sum parameter");
        }
        return { type: "just", value: valueFrom(value) };
      }
      case "nothing": {
        return { type: "nothing" };
      }
    }
    throw new Error("unknown type value");
  },
  type: (p1: Type): Type =>
    Type.from({
      namespace: Namespace.maybe,
      name: "Maybe",
      parameters: [p1],
    }),
};

export type Result<Ok extends unknown, Error extends unknown> = {
  readonly type: "ok";
  readonly value: Ok;
} | {
  readonly type: "error";
  readonly value: Error;
};
