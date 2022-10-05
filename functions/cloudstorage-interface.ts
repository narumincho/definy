import * as crypto from "node:crypto";
import * as zodType from "../common/zodType";
import { GOOGLE_CLOUD_STORAGE_PRIVATE_KEY } from "./environmentVariables";
import { Readable } from "node:stream";
import { Storage } from "@google-cloud/storage";

const storageBucket = new Storage({
  projectId: "definy-lang",
  credentials: {
    client_email:
      "vercel-function-to-cloudstrage@definy-lang.iam.gserviceaccount.com",
    private_key: GOOGLE_CLOUD_STORAGE_PRIVATE_KEY,
  },
}).bucket("definy-lang.appspot.com");

export const writeSampleFile = (): Promise<void> =>
  new Promise((resolve) => {
    const writableStream = storageBucket
      .file("sample.txt")
      .createWriteStream({});
    writableStream.end(new Date().toISOString(), () => {
      resolve();
    });
  });

/**
 * Cloud Storage に PNGファイルを保存する.
 * ファイル名はファイルの中身のハッシュ値
 */
export const savePngFile = async (
  binary: Uint8Array
): Promise<zodType.ImageHash> => {
  const hash = createImageTokenFromUint8ArrayAndMimeType(binary);
  const file = storageBucket.file(hash);
  await file.save(Buffer.from(binary), {
    contentType: "image/png",
  });
  return hash;
};

export const getPngFileReadable = (hash: zodType.ImageHash): Readable => {
  return storageBucket.file(hash).createReadStream();
};

export const createImageTokenFromUint8ArrayAndMimeType = (
  binary: Uint8Array
): zodType.ImageHash =>
  zodType.ImageHash.parse(
    crypto
      .createHash("sha256")
      .update(binary)
      .update("image/png", "utf8")
      .digest("hex")
  );
