/**
 * PureScript の キャンセル可能な Promise みたいな Aff を作成するための型
 * https://pursuit.purescript.org/packages/purescript-aff/6.0.0/docs/Effect.Aff.Compat#v:fromEffectFnAff
 */
export type EffectFnAff<T, E> = (
  onError: (e: E) => void,
  onSuccess: (t: T) => void
) => (
  cancelError: unknown,
  cancelerError: unknown,
  cancelerSuccess: () => void
) => void;
