/**
 * 評価を遅らせる. 循環的構造を表現するのに使う.
 * {@link t} に関数を指定すると思うように動かないので注意.
 */
export type Lazy<t> = t | (() => t);

export const lazyGet = <t>(lazy: Lazy<t>): t => {
  if (lazy instanceof Function) {
    return lazy();
  }
  return lazy;
};
