/* eslint-disable init-declarations */
/**
 * The Maybe type is used to represent optional values and can be seen as something like a type-safe null, where Nothing is null and Just x is the non-null value x.
 * https://pursuit.purescript.org/packages/purescript-maybe/5.0.0/docs/Data.Maybe#t:Maybe
 */
export type Maybe<T> = { _maybe: T };

export declare const Just: { readonly create: <T>(value: T) => Maybe<T> };
export declare const Nothing: { readonly value: Maybe<T> };
