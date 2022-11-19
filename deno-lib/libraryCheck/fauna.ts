import * as faunadb from "https://cdn.skypack.dev/faunadb@4.7.1?dts";
import { faunaServerKey } from "../../databaseMigrationSecret.ts";

const client = new faunadb.Client({
  secret: faunaServerKey,
  domain: "db.us.fauna.com",
});

const result = await client.query(faunadb.Paginate(faunadb.Collections()));

console.log(result);
