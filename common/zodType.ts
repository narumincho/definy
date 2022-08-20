import { z } from "zod";

export const Location = z.union([
  z.object({ type: z.literal("home") }),
  z.object({ type: z.literal("tools") }),
]);

export type Location = Readonly<z.TypeOf<typeof Location>>;

export const Language = z.enum(["japanese", "english", "esperanto"]);

export type Language = z.TypeOf<typeof Language>;
