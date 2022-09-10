export type Type = "string" | "number" | "unit";

export const string: Type = "string";

export const number: Type = "number";

export type TypeToTsType<T extends Type> = T extends "string"
  ? string
  : T extends "number"
  ? number
  : undefined;
