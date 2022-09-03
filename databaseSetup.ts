import { getFaunaClient, migration } from "./functions/faunadb-interface";
import { faunaServerKey } from "./databaseSetupSecret";

export const main = async (): Promise<void> => {
  await migration(getFaunaClient(faunaServerKey));
};

main();
