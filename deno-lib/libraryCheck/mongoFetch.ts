import { mongodbDataApiKey } from "../../databaseMigrationSecret.ts";
import * as base64 from "https://denopkg.com/chiefbiiko/base64@master/mod.ts";

const crateUUID = () => {
  return {
    $binary: {
      base64: base64.fromUint8Array(crypto.getRandomValues(new Uint8Array(16))),
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
      body: JSON.stringify({
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
          _id: crateUUID(),
        },
      }),
    }
  )
).json();

console.log(result);
