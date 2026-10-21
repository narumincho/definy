/**
 * stage1 コンパイラおよび self-hosted 型チェッカーで用いる
 * definy self-hosted AST (CBOR 表現) を組み立てる共通ヘルパー。
 */

export function selfHostedVariant(tag: string, payload?: unknown): unknown {
  return payload === undefined
    ? { Variant: { tag } }
    : { Variant: { tag, payload } };
}

export function selfHostedRecord(
  items: ReadonlyArray<readonly [string, unknown]>,
): unknown {
  return {
    TypeLiteral: {
      items: items.map(([key, value]) => ({ key, value })),
    },
  };
}

export function selfHostedList(items: ReadonlyArray<unknown>): unknown {
  return { ListLiteral: { items } };
}

export function selfHostedNumber(value: number): unknown {
  return { Number: { value } };
}

export function selfHostedString(value: string): unknown {
  return { String: { value } };
}

export {
  selfHostedVariant as variant,
  selfHostedRecord as record,
  selfHostedList as list,
  selfHostedNumber as number,
  selfHostedString as string,
};
