import * as d from "../../data";
import { useCallback, useState } from "react";
import { timeFromDate } from "../../core/util";

export type UseTypePartIdListInProjectResult = {
  /**
   * キャッシュからリソースの取得状況と内容を取得する
   *
   * *no-side-effect*
   */
  get: (
    id_: d.ProjectId
  ) => d.ResourceState<ReadonlyArray<d.TypePartId>> | undefined;
  /**
   * 指定したリソースの取得状態をリクエスト中にする
   *
   * *side-effect*
   */
  setRequesting: (id_: d.ProjectId) => void;
  /**
   * 指定したリソースの取得状態を不明(オフラインで取得不可など)にする
   *
   * *side-effect*
   */
  setUnknown: (id_: d.ProjectId) => void;
  /**
   * 指定したリソースの取得状態を削除された, または存在しないにする
   * @param getTime 存在がないことが確認された時刻
   *
   * *side-effect*
   */
  setDeleted: (id_: d.ProjectId, getTime: d.Time) => void;
  /**
   * 指定したリソースの取得状態を取得済みにしてキャッシュに保存する.
   *
   * APIのレスポンスを受け取った後や, storybookで使う
   * @param getTime `undefined` を指定するとクライアントで取得する実行したときの現在時刻を使用する
   *
   * *side-effect*
   */
  setLoaded: (
    id_: d.ProjectId,
    resource_: ReadonlyArray<d.TypePartId>,
    getTime?: d.Time
  ) => void;
};

/**
 * プロジェクトに属する型パーツのIDのリストを保存, 取得できる Hook
 */
export const useTypePartIdListInProject =
  (): UseTypePartIdListInProjectResult => {
    const [dict, setDict] = useState<
      ReadonlyMap<d.ProjectId, d.ResourceState<ReadonlyArray<d.TypePartId>>>
    >(new Map());

    const set = useCallback(
      (
        key_: d.ProjectId,
        resourceState: d.ResourceState<ReadonlyArray<d.TypePartId>>
      ) => {
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
        (key_, resource_, getTime) => {
          set(
            key_,
            d.ResourceState.Loaded({
              data: resource_,
              getTime:
                getTime === undefined ? timeFromDate(new Date()) : getTime,
            })
          );
        },
        [set]
      ),
    };
  };
