import * as d from "../../localData";
import { useCallback, useState } from "react";
import { timeFromDate } from "../../core/util";

export type UseResourceStateResult<id extends string, resource> = {
  /**
   * キャッシュからリソースの取得状況と内容を取得する
   *
   * *no-side-effect*
   */
  get: (id_: id) => d.ResourceState<resource> | undefined;
  /**
   * 指定したリソースの取得状態をリクエスト中にする
   *
   * *side-effect*
   */
  setRequesting: (id_: id) => void;
  /**
   * 指定したリソースの取得状態を不明(オフラインで取得不可など)にする
   *
   * *side-effect*
   */
  setUnknown: (id_: id) => void;
  /**
   * 指定したリソースの取得状態を削除された, または存在しないにする
   * @param getTime 存在がないことが確認された時刻
   *
   * *side-effect*
   */
  setDeleted: (id_: id, getTime: d.Time) => void;
  /**
   * 指定したリソースの取得状態を取得済みにしてキャッシュに保存する.
   *
   * APIのレスポンスを受け取った後や, storybookで使う
   * @param getTime `undefined` を指定するとクライアントで取得する実行したときの現在時刻を使用する
   *
   * *side-effect*
   */
  setLoaded: (resource_: resource, getTime?: d.Time) => void;
  /**
   * 指定したリソースの取得状態を取得済みにしてキャッシュに保存する.
   *
   * APIのレスポンスを受け取った後や, storybookで使う
   *
   * *side-effect*
   */
  setLoadedList: (list: ReadonlyArray<resource>, getTime: d.Time) => void;
};

/**
 * データと取得状態をメモリキャッシュ(Map型の変数)に保存, 取得できる Hook
 */
export const useResourceState = <key extends string, resource>(
  getKeyFunc: (res: resource) => key
): UseResourceStateResult<key, resource> => {
  const [dict, setDict] = useState<ReadonlyMap<key, d.ResourceState<resource>>>(
    new Map()
  );

  const set = useCallback(
    (key_: key, resourceState: d.ResourceState<resource>) => {
      setDict((oldDict) => new Map(oldDict).set(key_, resourceState));
    },
    []
  );

  return {
    get: useCallback(
      (projectId) => {
        return dict.get(projectId);
      },
      [dict]
    ),
    setRequesting: useCallback(
      (key_) => {
        set(key_, d.ResourceState.Requesting());
      },
      [set]
    ),
    setUnknown: useCallback(
      (key_) => {
        set(key_, d.ResourceState.Unknown(timeFromDate(new Date())));
      },
      [set]
    ),
    setDeleted: useCallback(
      (key_, getTime) => {
        set(key_, d.ResourceState.Deleted(getTime));
      },
      [set]
    ),
    setLoaded: useCallback(
      (resource_, getTime) => {
        set(
          getKeyFunc(resource_),
          d.ResourceState.Loaded({
            data: resource_,
            getTime: getTime === undefined ? timeFromDate(new Date()) : getTime,
          })
        );
      },
      [set, getKeyFunc]
    ),
    setLoadedList: useCallback(
      (list, getTime) => {
        setDict((oldDict) => {
          const newDict = new Map(oldDict);
          for (const item of list) {
            newDict.set(
              getKeyFunc(item),
              d.ResourceState.Loaded({ data: item, getTime })
            );
          }
          return newDict;
        });
      },
      [getKeyFunc]
    ),
  };
};
