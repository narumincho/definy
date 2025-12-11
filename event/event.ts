import * as v from "@valibot/valibot";

export const Uint8ArraySchema = v.instance(Uint8Array);

export const CreateAccountEventSchema = v.object({
  type: v.literal("create_account"),
  accountId: Uint8ArraySchema,
  name: v.string(),
  time: v.date(),
});

export const EventSchema = v.union([CreateAccountEventSchema]);

export type CreateAccountEvent = v.InferOutput<
  typeof CreateAccountEventSchema
>;

export type Event = v.InferOutput<typeof EventSchema>;
