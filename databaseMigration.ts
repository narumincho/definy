import { getFaunaClient, migration } from "./functions/faunadb-interface";
import { faunaServerKey } from "./databaseMigrationSecret";

/**
 * tsconfig.json の `exclude` から `databaseMigration.ts` を外して実行する必要あり
 */
export const main = async (): Promise<void> => {
  await migration(getFaunaClient(faunaServerKey));
  console.log("マイグレーション完了!");
};

main();
