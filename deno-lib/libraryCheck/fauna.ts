import { faunaServerKey } from "../../databaseMigrationSecret.ts";
import { faunadb } from "../deps.ts";

const client = new faunadb.Client({
  secret: faunaServerKey,
  domain: "db.us.fauna.com",
});

const result = await client.query(faunadb.Paginate(faunadb.Collections()));

console.log(result);
