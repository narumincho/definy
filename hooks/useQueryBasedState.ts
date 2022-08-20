import { Dispatch, useEffect, useRef, useState } from "react";
import { ParsedUrlQuery } from "node:querystring";
import { useRouter } from "next/router";

type useQueryBasedStateResult<StructuredQuery> =
  | { readonly type: "loaded"; readonly value: StructuredQuery }
  | { readonly type: "loading" };

/**
 * https://zenn.dev/honey32/articles/0d6a776171874a を参考に改良
 */
export const useQueryBasedState = <StructuredQuery>({
  queryToStructuredQuery,
  structuredQueryToQuery,
  onUpdate,
  isEqual,
}: {
  readonly queryToStructuredQuery: (query: ParsedUrlQuery) => StructuredQuery;
  readonly structuredQueryToQuery: (query: StructuredQuery) => ParsedUrlQuery;
  readonly onUpdate?: Dispatch<StructuredQuery> | undefined;
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

  /**
   * クエリが一切ない場合は、最初のrenderの時点で isReady が true になっているので、
   * その時には一回だけ useEffect で遅延させてstateを更新する
   */
  const countRef = useRef(0);
  useEffect(() => {
    if (!router.isReady) return;
    if (countRef.current > 0) return;
    const structuredQuery = queryToStructuredQuery(router.query);
    setState({ type: "loaded", value: structuredQuery });
    onUpdate?.(structuredQuery);
    countRef.current += 1;
  }, [
    onUpdate,
    router.isReady,
    router.query,
    queryToStructuredQuery,
    setState,
  ]);

  // hydrationが終了してクエリが読み込まれた時にstateを更新し、onUpdateを発火する
  const [prevIsReady, setPrevIsReady] = useState<boolean>(router.isReady);

  if (!prevIsReady && router.isReady) {
    setPrevIsReady(router.isReady);
    const structuredQuery = queryToStructuredQuery(router.query);
    setState({ type: "loaded", value: structuredQuery });
    onUpdate?.(structuredQuery);
    router.replace(
      { query: structuredQueryToQuery(structuredQuery) },
      undefined,
      { shallow: true }
    );
  }

  // クエリの変化を検知してstateを更新し、onUpdateを発火する
  if (
    state.type === "loading" ||
    !isEqual(state.value, queryToStructuredQuery(router.query))
  ) {
    const structuredQuery = queryToStructuredQuery(router.query);
    setState({ type: "loaded", value: structuredQuery });
    onUpdate?.(structuredQuery);
  }

  return state;
};
