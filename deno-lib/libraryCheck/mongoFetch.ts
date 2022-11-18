import { mongodbDataApiKey } from "../../databaseMigrationSecret.ts";
import { toBase64 } from "https://deno.land/x/fast_base64@v0.1.7/mod.ts";
import { jsonStringify } from "../typedJson.ts";

const crateUUID = async () => {
  return {
    $binary: {
      base64: await toBase64(crypto.getRandomValues(new Uint8Array(16))),
      subType: "04",
    },
  };
};

console.log("fetch前");

const result = await (
  await fetch(
    "https://data.mongodb-api.com/app/data-cvmsp/endpoint/data/v1/action/insertOne",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/ejson",
        "api-key": mongodbDataApiKey,
        Accept: "application/ejson",
      },
      body: jsonStringify({
        dataSource: "definy-serverless-instance",
        database: "db",
        collection: "sampleCollection",
        document: {
          name: "それな....",
          sampleTimestamp: {
            $timestamp: {
              t: 1565545664,
              i: 1,
            },
          },
          createdAt: { $date: { $numberLong: "1638551310749" } },
          _id: await crateUUID(),
        },
      }),
    },
  )
).json();

console.log(result);
