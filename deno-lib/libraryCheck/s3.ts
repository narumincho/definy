import { r2Secret } from "../../databaseMigrationSecret.ts";
import { S3Bucket } from "../deps.ts";

const bucket = new S3Bucket({
  region: "auto",
  bucket: "definy",
  endpointURL:
    "https://6a8354084cc02bb1c5f9ca1bb3442704.r2.cloudflarestorage.com",
  accessKeyID: "1a720ab590dcdc06eb0be70fd690ff39",
  secretKey: r2Secret,
});

await bucket.putObject("test", new TextEncoder().encode("Test1"), {
  contentType: "text/plain",
});

const list = bucket.listAllObjects({ batchSize: 5 });

for await (const obj of list) {
  console.log("Item in bucket:", obj.key);
}
