import * as React from "react";
import * as d from "../../data";
import { timeFromDate } from "../../core/util";

export type UseResourceStateResult<id extends string, resource> = {
  /** キャッシュからリソースの取得状況と内容を取得する `no effect` */
  get: (id_: id) => d.ResourceState<resource> | undefined;
  /** 指定したリソースの取得状態をリクエスト中にする  */
  setRequesting: (id_: id) => void;
  /** 指定したリソースの取得状態を不明(オフラインで取得不可など)にする  */
  setUnknown: (id_: id) => void;
  /**
   * 指定したリソースの取得状態を削除された, または存在しないにする
   * @param getTime 存在がないことが確認された時刻
   */
  setDeleted: (id_: id, getTime: d.Time) => void;
  /**
   * 指定したリソースの取得状態を取得済みにしてキャッシュに保存する.
   *
   * APIのレスポンスを受け取った後や, storybookで使う
   * @param getTime `undefined` を指定するとクライアントで取得する実行したときの現在時刻を使用する
   */
  setLoaded: (id_: id, resource_: resource, getTime?: d.Time) => void;
  /**
   * 指定したリソースの取得状態を取得済みにしてキャッシュに保存する.
   *
   * APIのレスポンスを受け取った後や, storybookで使う
   */
  setLoadedList: (
    list: ReadonlyArray<d.IdAndData<id, resource>>,
    getTime: d.Time
  ) => void;
};

/**
 * プロジェクトのデータ本体と取得状態をキャッシュに保存, 取得できる Hook
 */
export const useResourceState = <
  key extends string,
  resource
>(): UseResourceStateResult<key, resource> => {
  const [dict, setDict] = React.useState<
    ReadonlyMap<key, d.ResourceState<resource>>
  >(new Map());

  const set = (key_: key, resourceState: d.ResourceState<resource>) => {
    setDict((oldDict) => new Map(oldDict).set(key_, resourceState));
  };

  return {
    get: (projectId) => {
      return dict.get(projectId);
    },
    setRequesting: (key_) => {
      set(key_, d.ResourceState.Requesting());
    },
    setUnknown: (key_) => {
      set(key_, d.ResourceState.Unknown(timeFromDate(new Date())));
    },
    setDeleted: (key_, getTime) => {
      set(key_, d.ResourceState.Deleted(getTime));
    },
    setLoaded: (key_, resource_, getTime) => {
      set(
        key_,
        d.ResourceState.Loaded({
          data: resource_,
          getTime: getTime === undefined ? timeFromDate(new Date()) : getTime,
        })
      );
    },
    setLoadedList: (projectList, getTime) => {
      setDict((oldDict) => {
        const newDict = new Map(oldDict);
        for (const projectIdAndData of projectList) {
          newDict.set(
            projectIdAndData.id,
            d.ResourceState.Loaded({ data: projectIdAndData.data, getTime })
          );
        }
        return newDict;
      });
    },
  };
};
