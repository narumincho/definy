export type Context = {};

export const createContext = (parameter: {
  readonly authHeaderValue: string | undefined;
}): Context => {
  return {};
};
