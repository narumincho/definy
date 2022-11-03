import { MongoClient, UUID } from "https://deno.land/x/atlas_sdk@v1.0.3/mod.ts";
import { mongodbDataApiKey } from "../../databaseMigrationSecret.ts";

const client = new MongoClient({
  endpoint: "https://data.mongodb-api.com/app/data-cvmsp/endpoint/data/v1",
  dataSource: "definy",
  auth: {
    apiKey: mongodbDataApiKey,
  },
});

console.log("接続出来たっぽいぞ");

await client
  .database("db")
  .collection("sampleCollection")
  .insertOne({ sampleId: new UUID("") });

const result = await client
  .database("db")
  .collection("sampleCollection")
  .aggregate([
    {
      $search: {
        index: "default",
        text: {
          query: "りんご",
          path: {
            wildcard: "*",
          },
        },
      },
    },
  ]);

console.log(result);
