import { z } from "zod";

export const Location = z.union([
  z.object({ type: z.literal("home") }),
  z.object({ type: z.literal("about") }),
  z.object({ type: z.literal("tools") }),
  z.object({
    type: z.literal("tool"),
    value: z.enum(["themeColorRainbow", "soundQuiz"]),
  }),
  z.object({ type: z.literal("new-account") }),
  z.object({ type: z.literal("local-project") }),
]);

export type Location = Readonly<z.TypeOf<typeof Location>>;

export const Language = z.enum(["japanese", "english", "esperanto"]);

export type Language = z.TypeOf<typeof Language>;

export const defaultLanguage: Language = "english";

export const LogInByCodeAndStatePayload = z.union([
  z.object({ type: z.literal("notGeneratedState") }),
  z.object({ type: z.literal("invalidCodeOrProviderResponseError") }),
  z.object({
    type: z.literal("notExistsAccountInDefiny"),
    nameInProvider: z.string(),
    imageUrl: z.string().url(),
  }),
  z.object({ type: z.literal("logInOk") }),
]);

export type LogInByCodeAndStatePayload = Readonly<
  z.TypeOf<typeof LogInByCodeAndStatePayload>
>;
