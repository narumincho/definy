import * as f from "../../typedFauna.ts";

export const startMigration = async (faunaSecret: string): Promise<void> => {
  const client = f.crateFaunaClient({
    domain: "db.us.fauna.com",
    secret: faunaSecret,
  });
  const result = await client.query(
    f.Get(
      f.Ref(
        f.Collection(f.literal("openConnectState")),
        f.literal("349092231041253456"),
      ),
    ),
  );

  console.log(result);
};
