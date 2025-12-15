import * as v from "@valibot/valibot";
import { AccountId } from "./key.ts";

export const CreateAccountEvent = v.object({
  type: v.literal("create_account"),
  accountId: AccountId,
  name: v.string(),
  time: v.date(),
});

export const Event = v.union([CreateAccountEvent]);

export type CreateAccountEvent = v.InferOutput<
  typeof CreateAccountEvent
>;

export type Event = v.InferOutput<typeof Event>;
