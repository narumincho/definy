import f from "https://cdn.skypack.dev/faunadb@4.7.1?dts";

export type TypedFaunaClient = f.Client & { _typedFaunaClient: never };

const typedFaunaClientFrom = (client: f.Client): TypedFaunaClient => {
  return client as TypedFaunaClient;
};

export const crateFaunaClient = (parameter: {
  readonly secret: string;
  readonly domain: "db.us.fauna.com";
}): TypedFaunaClient => {
  return typedFaunaClientFrom(new f.Client(parameter));
};

export const executeQuery = <T>(
  client: TypedFaunaClient,
  expr: TypedExpr<T>,
): Promise<T> => {
  return client.query<T>(expr);
};

type FaunaId = string | number;

export const faunaIdToBigint = (faunaId: FaunaId): bigint => BigInt(faunaId);

export type DocumentObject = {
  readonly [key in string]: DocumentValue;
};

export type DocumentValue =
  | Scalar
  | ReadonlyArray<DocumentValue>
  | DocumentObject;

export type Scalar =
  | boolean
  | null
  | number
  | string
  | Uint8Array
  | Date
  | Timestamp;

export type TypedExpr<T> = f.Expr & { _typedFaunaExpr: T };

const typedExprFrom = <T>(expr: f.Expr): TypedExpr<T> => {
  return expr as TypedExpr<T>;
};

export const literal = <T>(expr: T): TypedExpr<T> => {
  return expr as unknown as TypedExpr<T>;
};

export const object = <T extends Record<string, unknown>>(
  expr: {
    readonly [key in keyof T]: TypedExpr<T[key]>;
  },
): TypedExpr<
  {
    readonly [key in keyof T]: T[key];
  }
> => {
  return expr as unknown as TypedExpr<
    {
      readonly [key in keyof T]: T[key];
    }
  >;
};

export type Timestamp = "Timestamp" & { value: string; _timestamp: never };

/**
 * -271821年 以前の日付は変換できないがまあ良いだろう.
 */
export const timestampToDate = (timestamp: Timestamp): Date => {
  return new Date(timestamp.value);
};

export type CollectionReference<data extends DocumentObject> = {
  /** コレクション名 */
  readonly id: string;
  _reference: data;
};

export type Set<T> = { _set: T };

export type DocumentReference<data extends DocumentObject> = {
  readonly id: FaunaId;
  _documentReference: data;
};

export type IndexReference<terms extends ReadonlyArray<Scalar>, value> = {
  _indexReference: value;
  _indexReferenceTerms: terms;
};

export type Page<T> = {
  readonly data: ReadonlyArray<T>;
  readonly after: Cursor | null;
  readonly before: Cursor | null;
};

export type Cursor = "Cursor" & { _cursor: never };

export type Lambda<inputType, outputType> = "Lambda" & {
  _lambda: never;
  inputType: inputType;
  outType: outputType;
};

/**
 * https://docs.fauna.com/fauna/current/api/fql/functions/do?lang=javascript
 */
export const Do = <T>(
  ...expr: [...ReadonlyArray<TypedExpr<unknown>>, TypedExpr<T>]
): TypedExpr<T> => {
  return typedExprFrom(f.Do(...expr));
};

/**
 * https://docs.fauna.com/fauna/current/api/fql/functions/createcollection?lang=javascript
 */
export const CreateCollection = <data extends DocumentObject>(
  expr: TypedExpr<{
    readonly name: string;
    readonly data?: data | undefined | null;
    readonly history_days?: number | undefined | null;
    readonly ttl?: Timestamp | undefined | null;
    readonly ttl_days?: number | undefined | null;
  }>,
): TypedExpr<{
  readonly ref: CollectionReference<data>;
  readonly name: string;
  readonly ts: string;
  readonly history_days: number | null;
}> => {
  return typedExprFrom(f.CreateCollection(expr));
};

/**
 * https://docs.fauna.com/fauna/current/api/fql/functions/collection?lang=javascript
 */
export const Collection = <data extends DocumentObject>(
  name: TypedExpr<string>,
): TypedExpr<CollectionReference<data>> => {
  return typedExprFrom(f.Collection(name));
};

/**
 * https://docs.fauna.com/fauna/current/api/fql/functions/create?lang=javascript
 */
export const Create = <data extends DocumentObject>(
  collection: TypedExpr<CollectionReference<data> | DocumentReference<data>>,
  param_object: TypedExpr<{
    readonly data: data;
    readonly ttl?: Timestamp | undefined | null;
  }>,
): TypedExpr<{
  readonly ref: DocumentReference<data>;
  readonly data: data;
  readonly ts: string;
}> => {
  return typedExprFrom(f.Create(collection, param_object));
};

/**
 * https://docs.fauna.com/fauna/current/api/fql/functions/ref?lang=javascript
 */
export const Ref = <data extends DocumentObject>(
  schema_ref: TypedExpr<CollectionReference<data>>,
  document_id: TypedExpr<FaunaId>,
): TypedExpr<DocumentReference<data>> => {
  return typedExprFrom(f.Ref(schema_ref, document_id));
};

/**
 * https://docs.fauna.com/fauna/current/api/fql/functions/newid?lang=javascript
 */
export const NewId = (): TypedExpr<FaunaId> => {
  return typedExprFrom(f.NewId());
};

/**
 * https://docs.fauna.com/fauna/current/api/fql/functions/let?lang=javascript
 */
export const Let = <T>(
  bindings: TypedExpr<Record<string, unknown>>,
  inExpr: TypedExpr<T>,
): TypedExpr<T> => {
  return typedExprFrom(f.Let(bindings, inExpr));
};

/**
 * {@link Let} の型付き版
 */
export const letUtil = <varType, T>(
  variableName: string,
  variableExpr: TypedExpr<varType>,
  inExpression: (variable: TypedExpr<varType>) => TypedExpr<T>,
): TypedExpr<T> => {
  return typedExprFrom(
    f.Let(
      { [variableName]: variableExpr },
      inExpression(Var(literal(variableName))),
    ),
  );
};

/**
 * https://docs.fauna.com/fauna/current/api/fql/functions/if?lang=javascript
 */
export const If = <T>(
  cond_expr: TypedExpr<boolean>,
  true_expr: TypedExpr<T>,
  false_expr: TypedExpr<T>,
): TypedExpr<T> => {
  return typedExprFrom(f.If(cond_expr, true_expr, false_expr));
};

export const ifIsBooleanGuarded = <T, R>(
  expr: TypedExpr<T>,
  resultExpr: (notBooleanExpr: TypedExpr<Exclude<T, boolean>>) => TypedExpr<R>,
): TypedExpr<R | false> => {
  return If<R | false>(
    IsBoolean(expr),
    literal<false>(false),
    resultExpr(typedExprFrom(expr)),
  );
};

/**
 * https://docs.fauna.com/fauna/current/api/fql/functions/exists?lang=javascript
 */
export const Exists = <data extends DocumentObject>(
  ref: TypedExpr<DocumentReference<data>>,
  ts?: TypedExpr<string | Timestamp>,
): TypedExpr<boolean> => {
  return typedExprFrom(f.Exists(ref, ts));
};

/**
 * https://docs.fauna.com/fauna/current/api/fql/functions/var?lang=javascript
 */
export const Var = <T>(name: TypedExpr<string>): TypedExpr<T> => {
  return typedExprFrom(f.Var(name));
};

/**
 * https://docs.fauna.com/fauna/current/api/fql/functions/get?lang=javascript
 */
export const Get = <data extends DocumentObject>(
  ref: TypedExpr<DocumentReference<data>>,
  ts?: TypedExpr<string | Timestamp>,
): TypedExpr<{
  readonly ref: DocumentReference<data>;
  readonly data: data;
  readonly ts: string;
}> => {
  return typedExprFrom(f.Get(ref, ts));
};

/**
 * https://docs.fauna.com/fauna/current/api/fql/functions/delete?lang=javascript
 */
export const Delete = <data extends DocumentObject>(
  ref: TypedExpr<DocumentReference<data>>,
): TypedExpr<{
  readonly ref: DocumentReference<data>;
  readonly ts: string;
}> => {
  return typedExprFrom(f.Delete(ref));
};

/**
 * https://docs.fauna.com/fauna/current/api/fql/functions/select?lang=javascript
 */
export const Select = <T, key extends keyof T>(
  key: TypedExpr<key>,
  from: TypedExpr<T>,
  defaultExpr?: TypedExpr<T[key]>,
): TypedExpr<T[key]> => {
  return typedExprFrom(f.Select(key, from, defaultExpr));
};

/**
 * `Select の デフォルト値付ける版
 * https://docs.fauna.com/fauna/current/api/fql/functions/select?lang=javascript
 */
export const selectWithDefault = <T, key extends keyof T, R>(
  key: TypedExpr<key>,
  from: TypedExpr<T>,
  defaultExpr: TypedExpr<R>,
): TypedExpr<T[key] | R> => {
  return typedExprFrom(f.Select(key, from, defaultExpr));
};

/**
 * `Select の 型がオブジェクトでない版
 * https://docs.fauna.com/fauna/current/api/fql/functions/select?lang=javascript
 */
export const selectWithFalse = <T, key extends keyof Exclude<T, false>, R>(
  key: TypedExpr<key>,
  from: TypedExpr<T>,
  defaultExpr: TypedExpr<R>,
): TypedExpr<Exclude<T, false>[key] | R> => {
  return typedExprFrom(f.Select(key, from, defaultExpr));
};

/**
 * https://docs.fauna.com/fauna/current/api/fql/functions/isboolean?lang=javascript
 */
export const IsBoolean = (expr: TypedExpr<unknown>): TypedExpr<boolean> => {
  return typedExprFrom(f.IsBoolean(expr));
};

/**
 * `Filter` の `Page` 向けの型付け版
 * https://docs.fauna.com/fauna/current/api/fql/functions/filter?lang=javascript
 */
export const pageFilter = <T>(
  arrayOrSet: TypedExpr<Page<T>>,
  lambda: TypedExpr<Lambda<T, boolean>>,
): TypedExpr<Page<T>> => {
  return typedExprFrom(f.Filter(arrayOrSet, lambda));
};

/**
 * `Map` の `Page` 向けの型付け版
 * https://docs.fauna.com/fauna/current/api/fql/functions/map?lang=javascript
 */
export const pageMap = <elementInput, elementOutput>(
  array: TypedExpr<Page<elementInput>>,
  lambda: TypedExpr<Lambda<elementInput, elementOutput>>,
): TypedExpr<Page<elementOutput>> => {
  return typedExprFrom(f.Map(array, lambda));
};

/**
 * `Paginate` の `Set` 向け型付け版
 * https://docs.fauna.com/fauna/current/api/fql/functions/paginate?lang=javascript
 * @param input
 * @param parameter パラメーター自体に Expr を使用することはできない
 * @returns
 */
export const paginateSet = <data>(
  input: TypedExpr<Set<data>>,
  /** オブジェクトを直接式として指定することはできないようだ */
  parameter: {
    readonly ts?: TypedExpr<string> | undefined;
    readonly before?: TypedExpr<Cursor> | undefined;
    readonly after?: TypedExpr<Cursor> | undefined;
    readonly size?: TypedExpr<number> | undefined;
    readonly events?: TypedExpr<boolean> | undefined;
    readonly sources?: TypedExpr<boolean> | undefined;
  },
): TypedExpr<Page<data>> => {
  return typedExprFrom(f.Paginate(input, parameter));
};

/**
 * https://docs.fauna.com/fauna/current/api/fql/functions/documents?lang=javascript
 */
export const Documents = <data extends DocumentObject>(
  collection: TypedExpr<CollectionReference<data>>,
): TypedExpr<Set<DocumentReference<data>>> => {
  return typedExprFrom(f.Documents(collection));
};

/**
 * https://docs.fauna.com/fauna/current/api/fql/functions/lambda?lang=javascript
 */
export const Lambda = <inputType, outputType>(
  params: ReadonlyArray<string> | string,
  expression: TypedExpr<outputType>,
): TypedExpr<Lambda<inputType, outputType>> => {
  return typedExprFrom(f.Lambda(params, expression));
};

export const lambdaUtil = <inputType, outputType>(
  paramName: string,
  expressionFunc: (param: TypedExpr<inputType>) => TypedExpr<outputType>,
): TypedExpr<Lambda<inputType, outputType>> => {
  return typedExprFrom(
    f.Lambda(paramName, expressionFunc(Var<inputType>(literal(paramName)))),
  );
};

/*
 * https://docs.fauna.com/fauna/current/api/fql/functions/update?lang=javascript
 */
export const Update = <data extends DocumentObject>(
  ref: TypedExpr<DocumentReference<data>>,
  param_object: TypedExpr<{
    readonly data: { readonly [P in keyof data]?: data[P] };
    readonly ttl?: string | undefined;
  }>,
): TypedExpr<{
  readonly ref: DocumentReference<data>;
  readonly data: data;
  readonly ts: string;
}> => {
  return typedExprFrom(f.Update(ref, param_object));
};

/*
 * https://docs.fauna.com/fauna/current/api/fql/functions/equals?lang=javascript
 */
export const Equals = <T>(
  ...params: ReadonlyArray<TypedExpr<T>>
): TypedExpr<boolean> => {
  return typedExprFrom(f.Equals(...params));
};

/**
 * https://docs.fauna.com/fauna/current/api/fql/functions/createindex?lang=javascript
 */
export const CreateIndex = <data extends DocumentObject>(
  param_object: TypedExpr<{
    readonly name: string;
    readonly source:
      | CollectionReference<data>
      | ReadonlyArray<CollectionReference<data>>;
    readonly terms?: ReadonlyArray<{
      readonly field: AllTuplePattern<{
        readonly ref: DocumentReference<data>;
        readonly data: data;
        readonly ts: string;
      }>;
      readonly binding?: string;
    }>;
    readonly values?: ReadonlyArray<{
      readonly field: AllTuplePattern<{
        readonly ref: DocumentReference<data>;
        readonly data: data;
        readonly ts: string;
      }>;
      readonly binding?: string;
      readonly reverse?: boolean;
    }>;
    readonly unique?: boolean;
    readonly serialized?: boolean;
    readonly data?: DocumentObject;
    readonly ttl?: Timestamp;
  }>,
): TypedExpr<{
  readonly ref: IndexReference<ReadonlyArray<Scalar>, data>;
  readonly name: string;
  readonly source:
    | CollectionReference<data>
    | ReadonlyArray<CollectionReference<data>>;
  readonly ts: string;
  readonly active: boolean;
  readonly partitions: number;
}> => {
  return typedExprFrom(f.CreateIndex(param_object));
};

/**
 * https://docs.fauna.com/fauna/current/api/fql/functions/match?lang=javascript
 */
export const Match = <terms extends ReadonlyArray<Scalar>, value>(
  index: TypedExpr<IndexReference<terms, value>>,
  terms: TypedExpr<terms>,
): TypedExpr<Set<value>> => {
  return typedExprFrom(f.Match(index, terms));
};

/**
 * https://docs.fauna.com/fauna/current/api/fql/functions/iindex?lang=javascript
 */
export const Index = <terms extends ReadonlyArray<Scalar>, data>(
  name: TypedExpr<string>,
): TypedExpr<IndexReference<terms, data>> => {
  return typedExprFrom(f.Index(name));
};

type PickDeep<T, k> = T extends Record<string, unknown>
  ? k extends [infer head extends keyof T, ...infer tail]
    ? PickDeep<T[head], tail>
  : never
  : T;

type AllTuplePattern<T> =
  | keyof T
  | ValueOf<{ [k in keyof T]: readonly [k, ...AllTuplePatternLoop<T[k]>] }>;

type AllTuplePatternLoop<T> = T extends Record<string, unknown>
  ? ValueOf<{ [k in keyof T]: [k, ...AllTuplePatternLoop<T[k]>] }>
  : [];

type ValueOf<V> = V[keyof V];

type ExpectTrue<T extends true> = T;

type Equal<X, Y> = (<T>() => T extends X ? 1 : 2) extends
  <T>() => T extends Y ? 1
    : 2 ? true
  : false;

/** 型のテストケース */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
type cases = [
  ExpectTrue<
    Equal<
      AllTuplePattern<{ a: "aValue"; b: "bValue" }>,
      "a" | "b" | readonly ["a"] | readonly ["b"]
    >
  >,
  ExpectTrue<
    Equal<
      AllTuplePattern<{ a: { aA: 32; aB: 34 }; b: { bA: ""; bB: 38 } }>,
      | "a"
      | "b"
      | readonly ["a", "aA"]
      | readonly ["a", "aB"]
      | readonly ["b", "bA"]
      | readonly ["b", "bB"]
    >
  >,
  ExpectTrue<
    Equal<
      AllTuplePattern<{ a0: { a1: { a2: { a3: "" } } } }>,
      "a0" | readonly ["a0", "a1", "a2", "a3"]
    >
  >,
];

export const time = (dateTime: Date): TypedExpr<Timestamp> => {
  return typedExprFrom(f.Time(dateTime.toISOString()));
};
