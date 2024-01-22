import { createRegExpType } from "npm:@narumincho/simple-graphql-server-common@0.1.2";

export type Cursor = string & { readonly Cursor: unique symbol };

export const Cursor = createRegExpType<Cursor>({
  name: "Cursor",
  description: "カーソル",
  regexp: /^.*$/,
});

export const cursorFrom = (cursor: string): Cursor => {
  return cursor as Cursor;
};
