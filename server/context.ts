export type Context = Record<never, unknown>;

export const createContext = (_parameter: {
  readonly authHeaderValue: string | undefined;
}): Context => {
  return {};
};
