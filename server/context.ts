export type Context = {
  readonly denoKv: Deno.Kv;
};

export const createContext = async (_parameter: {
  readonly authHeaderValue: string | undefined;
}): Promise<Context> => {
  return { denoKv: await Deno.openKv() };
};
