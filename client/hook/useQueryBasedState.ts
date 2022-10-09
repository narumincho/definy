import { Dispatch, useEffect, useState } from "react";
import { ParsedUrlQuery } from "node:querystring";
import { useRouter } from "next/router";

type useQueryBasedStateResult<StructuredQuery> =
  | { readonly type: "loaded"; readonly value: StructuredQuery }
  | { readonly type: "loading" };

/**
 * URLに含まれるクエリをもとにした処理をしたいときに使う
 */
export const useQueryBasedState = <StructuredQuery>({
  queryToStructuredQuery,
  structuredQueryToQuery,
  onUpdate,
  isEqual,
}: {
  /** クエリから使う情報(`StructuredQuery`)を取り出す */
  readonly queryToStructuredQuery: (
    query: ReadonlyMap<string, string>
  ) => StructuredQuery;
  /** `StructuredQuery`をもとにしてクエリを正規化する */
  readonly structuredQueryToQuery: (
    query: StructuredQuery
  ) => ReadonlyMap<string, string>;
  /** `StructuredQuery`が変更されたときに呼ばれる */
  readonly onUpdate?: Dispatch<StructuredQuery> | undefined;
  /** `StructuredQuery` の比較関数 */
  readonly isEqual: (
    oldStructuredQuery: StructuredQuery,
    newStructuredQuery: StructuredQuery
  ) => boolean;
}): useQueryBasedStateResult<StructuredQuery> => {
  const router = useRouter();

  // クエリをオブジェクトにエンコードしたものを保持する
  const [state, setState] = useState<useQueryBasedStateResult<StructuredQuery>>(
    {
      type: "loading",
    }
  );

  const [isReplacingQuery, setIsReplacingQuery] = useState<boolean>(false);

  useEffect(() => {
    if (!router.isReady || isReplacingQuery) {
      return;
    }
    const nowQueryMap = parsedUrlQueryToMap(router.query);
    const structuredQuery = queryToStructuredQuery(nowQueryMap);
    const reFormattedQueryMap = structuredQueryToQuery(structuredQuery);
    if (!isEqualMap(nowQueryMap, reFormattedQueryMap)) {
      console.log("正規化したい...", nowQueryMap, reFormattedQueryMap);
      return;
      const replace = router.replace;
      setIsReplacingQuery(true);
      replace(
        { query: Object.fromEntries([...reFormattedQueryMap]) },
        undefined,
        {
          shallow: true,
        }
      ).then(() => {
        setIsReplacingQuery(false);
      });
    }
  }, [
    isReplacingQuery,
    queryToStructuredQuery,
    router.isReady,
    router.query,
    router.replace,
    structuredQueryToQuery,
  ]);

  useEffect(() => {
    if (!router.isReady) {
      return;
    }
    const structuredQuery = queryToStructuredQuery(
      parsedUrlQueryToMap(router.query)
    );
    if (state.type === "loading" || !isEqual(state.value, structuredQuery)) {
      setState({ type: "loaded", value: structuredQuery });
      onUpdate?.(structuredQuery);
    }
  }, [
    isEqual,
    onUpdate,
    queryToStructuredQuery,
    router.isReady,
    router.query,
    state,
  ]);

  return state;
};

const parsedUrlQueryToMap = (
  parsedUrlQuery: ParsedUrlQuery
): ReadonlyMap<string, string> => {
  return new Map(
    Object.entries(parsedUrlQuery).flatMap(([key, value]) => {
      if (typeof value === "string") {
        return [[key, value]];
      }
      if (value === undefined) {
        return [[key, ""]];
      }
      const firstItem = value[0];
      if (typeof firstItem === "string") {
        return [[key, firstItem]];
      }
      return [];
    })
  );
};

const isEqualMap = (
  a: ReadonlyMap<string, string>,
  b: ReadonlyMap<string, string>
): boolean => {
  if (a.size !== b.size) {
    return false;
  }
  for (const [aKey, aValue] of a) {
    const bValue = b.get(aKey);
    if (bValue === undefined || bValue !== aValue) {
      return false;
    }
  }
  return true;
};
