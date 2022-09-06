import { GOOGLE_CLOUD_STORAGE_PRIVATE_KEY } from "./environmentVariables";
import { Storage } from "@google-cloud/storage";

const storage = new Storage({
  projectId: "definy-lang",
  credentials: {
    client_email:
      "vercel-function-to-cloudstrage@definy-lang.iam.gserviceaccount.com",
    private_key: GOOGLE_CLOUD_STORAGE_PRIVATE_KEY,
  },
});

export const writeSampleFile = (): Promise<void> =>
  new Promise((resolve) => {
    const bucket = storage.bucket("definy-lang.appspot.com");
    const writableStream = bucket.file("sample.txt").createWriteStream({});
    writableStream.end(new Date().toISOString(), () => {
      resolve();
    });
  });
