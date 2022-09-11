export type DefinyRpcType<in out t> = { dummy: t };

export const string: DefinyRpcType<string> = { dummy: "" };

export const number: DefinyRpcType<number> = { dummy: 0 };

export const unit: DefinyRpcType<undefined> = { dummy: undefined };

export const set = <element>(
  _element: DefinyRpcType<element>
): DefinyRpcType<ReadonlySet<element>> => ({ dummy: new Set() });

export const list = <element>(
  _element: DefinyRpcType<element>
): DefinyRpcType<ReadonlyArray<element>> => ({ dummy: [] });
