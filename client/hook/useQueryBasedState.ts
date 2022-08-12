import { Dispatch, useCallback, useEffect, useRef, useState } from "react";
import { ParsedUrlQuery } from "querystring";
import { useRouter } from "next/router";

/**
 * https://zenn.dev/honey32/articles/0d6a776171874a を参考に改良
 */
export const useQueryBasedState = <StructuredQuery>({
  queryToStructuredQuery,
  structuredQueryToQuery,
  onUpdate,
}: {
  readonly queryToStructuredQuery: (query: ParsedUrlQuery) => StructuredQuery;
  readonly structuredQueryToQuery: (query: StructuredQuery) => ParsedUrlQuery;
  readonly onUpdate?: Dispatch<StructuredQuery> | undefined;
}): StructuredQuery | undefined => {
  const router = useRouter();

  // クエリをオブジェクトにエンコードしたものを保持する
  const [state, _setState] = useState<StructuredQuery | undefined>(undefined);
  const setState = useCallback(
    (newValue: StructuredQuery) => {
      _setState(newValue);
      onUpdate?.(newValue);
    },
    [onUpdate]
  );

  /**
   * クエリが一切ない場合は、最初のrenderの時点で isReady が true になっているので、
   * その時には一回だけ useEffect で遅延させてstateを更新する
   */
  const countRef = useRef(0);
  useEffect(() => {
    if (!router.isReady) return;
    if (countRef.current > 0) return;
    setState(queryToStructuredQuery(router.query));
    countRef.current += 1;
  }, [
    onUpdate,
    router.isReady,
    router.query,
    queryToStructuredQuery,
    setState,
  ]);

  // hydrationが終了してクエリが読み込まれた時にstateを更新し、onUpdateを発火する
  const [prevIsReady, setPrevIsReady] = useState(router.isReady);
  if (!prevIsReady && router.isReady) {
    setPrevIsReady(router.isReady);
    const structuredQuery = queryToStructuredQuery(router.query);
    setState(structuredQuery);
    router.replace(
      { query: structuredQueryToQuery(structuredQuery) },
      undefined,
      { shallow: true }
    );
  }

  // クエリの変化を検知してstateを更新し、onUpdateを発火する
  if (state !== queryToStructuredQuery(router.query)) {
    setState(queryToStructuredQuery(router.query));
  }

  return state;
};
