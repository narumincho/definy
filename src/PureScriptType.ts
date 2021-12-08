export type EffectFnAff<T, E> = (
  onError: (e: E) => void,
  onSuccess: (t: T) => void
) => (
  cancelError: unknown,
  cancelerError: unknown,
  cancelerSuccess: () => void
) => void;
