import { stringToValidProjectName, stringToValidUserName } from "../core/main";
import { z } from "zod";

export type Location = Readonly<z.TypeOf<typeof Location>>;

export const Language = z.enum(["japanese", "english", "esperanto"]);

export type Language = z.TypeOf<typeof Language>;

export const defaultLanguage: Language = "english";

export const PreAccountToken = z.string().length(64).brand<"PreAccountToken">();

export type PreAccountToken = z.TypeOf<typeof PreAccountToken>;

export const AccountToken = z.string().length(64).brand<"AccountToken">();

export type AccountToken = z.TypeOf<typeof AccountToken>;

export const AccountId = z.string().min(1).brand<"AccountId">();

export type AccountId = z.TypeOf<typeof AccountId>;

export const accountIdFromString = (v: string): AccountId => AccountId.parse(v);

const isValidAccountName = (v: unknown): v is string =>
  typeof v === "string" && stringToValidUserName(v) === v;

export const AccountName = z
  .string()
  .refine(isValidAccountName)
  .brand<"AccountName">();

export type AccountName = z.TypeOf<typeof AccountName>;

export const ProjectId = z
  .string()
  .regex(/[a-zA-Z0-9_]+/u)
  .min(1)
  .brand<"ProjectId">();

export type ProjectId = z.TypeOf<typeof ProjectId>;

export const projectIdFromString = (v: string): ProjectId => ProjectId.parse(v);

const isValidProjectName = (v: unknown): v is string =>
  typeof v === "string" && stringToValidProjectName(v) === v;

export const ProjectName = z
  .string()
  .refine(isValidProjectName)
  .brand<"ProjectName">();

export type ProjectName = z.TypeOf<typeof ProjectName>;

export const ImageHash = z.string().brand<"ImageHash">();

export type ImageHash = z.TypeOf<typeof ImageHash>;

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
  z.object({ type: z.literal("editor") }),
  z.object({ type: z.literal("project"), id: ProjectId }),
  z.object({ type: z.literal("account"), id: AccountId }),
  z.object({ type: z.literal("create-project") }),
  z.object({ type: z.literal("setting") }),
  z.object({ type: z.literal("dev") }),
]);

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
