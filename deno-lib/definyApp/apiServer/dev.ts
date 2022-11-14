import { main } from "./mod.ts";
import { faunaServerKey } from "../../../databaseMigrationSecret.ts";

main({ isDev: true, faunaSecret: faunaServerKey });
