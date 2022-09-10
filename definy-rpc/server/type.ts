export type DefinyRpcType<in out t> = { dummy: t };

export const string: DefinyRpcType<string> = { dummy: "" };

export const number: DefinyRpcType<number> = { dummy: 0 };
