import { b } from "@zorsh/zorsh";

export const CreateAccountEventSchema = b.struct({
  name: b.string(),
});

export type CreateAccountEventSchema = b.infer<typeof CreateAccountEventSchema>;
