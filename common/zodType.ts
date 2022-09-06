import { z } from "zod";

export const Location = z.union([
  z.object({ type: z.literal("home") }),
  z.object({ type: z.literal("about") }),
  z.object({ type: z.literal("tools") }),
  z.object({
    type: z.literal("tool"),
    value: z.enum(["themeColorRainbow", "soundQuiz"]),
  }),
  z.object({ type: z.literal("create-account") }),
  z.object({ type: z.literal("local-project") }),
  z.object({ type: z.literal("create-project") }),
  z.object({ type: z.literal("setting") }),
  z.object({ type: z.literal("dev") }),
]);

export type Location = Readonly<z.TypeOf<typeof Location>>;

export const Language = z.enum(["japanese", "english", "esperanto"]);

export type Language = z.TypeOf<typeof Language>;

export const defaultLanguage: Language = "english";

export const PreAccountToken = z
  .string()
  .length(64) as unknown as z.Schema<PreAccountToken>;

export type PreAccountToken = string & { _preAccountToken: never };

export const AccountToken = z
  .string()
  .length(64) as unknown as z.Schema<AccountToken>;

export type AccountToken = string & { _accountToken: never };

export const AccountId = z.string().min(1) as unknown as z.Schema<AccountId>;

export type AccountId = string & { _accountId: never };

export const ProjectId = z.string().min(1) as unknown as z.Schema<ProjectId>;

export type ProjectId = string & { _projectId: never };

export const LogInByCodeAndStatePayload = z.union([
  z.object({ type: z.literal("notGeneratedState") }),
  z.object({ type: z.literal("invalidCodeOrProviderResponseError") }),
  z.object({
    type: z.literal("notExistsAccountInDefiny"),
    nameInProvider: z.string(),
    imageUrl: z.string().url(),
    language: Language,
    preAccountToken: PreAccountToken,
  }),
  z.object({
    type: z.literal("logInOk"),
    accountToken: AccountToken,
    language: Language,
    location: Location,
  }),
]);

export type LogInByCodeAndStatePayload = Readonly<
  z.TypeOf<typeof LogInByCodeAndStatePayload>
>;

export const CreateAccountPayload = z.union([
  z.object({ type: z.literal("notGeneratedPreAccountToken") }),
  z.object({
    type: z.literal("ok"),
    accountToken: AccountToken,
    language: Language,
    location: Location,
  }),
]);

export type CreateAccountPayload = Readonly<
  z.TypeOf<typeof CreateAccountPayload>
>;
