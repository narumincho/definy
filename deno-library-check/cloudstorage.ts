import { Storage } from "https://cdn.skypack.dev/@google-cloud/storage@6.5.2?dts";
import { googleCloudStoragePrivateKey } from "../databaseMigrationSecret.ts";

// うまくいかなかった

const storageBucket = new Storage({
  projectId: "definy-lang",
  credentials: {
    client_email:
      "vercel-function-to-cloudstrage@definy-lang.iam.gserviceaccount.com",
    private_key: googleCloudStoragePrivateKey,
  },
}).bucket("definy-lang.appspot.com");

console.log(await storageBucket.getFiles());
