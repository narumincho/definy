import * as crypto from "node:crypto";
import {
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { CLOUDFLARE_R2_SECRET_KEY } from "./environmentVariables";
import { Readable } from "node:stream";
import { zodType } from "../deno-lib/npm";

/**
 * https://dash.cloudflare.com/6a8354084cc02bb1c5f9ca1bb3442704/r2/
 */
const storageClient = new S3Client({
  region: "auto",
  endpoint: "https://6a8354084cc02bb1c5f9ca1bb3442704.r2.cloudflarestorage.com",
  credentials: {
    accessKeyId: "1a720ab590dcdc06eb0be70fd690ff39",
    secretAccessKey: CLOUDFLARE_R2_SECRET_KEY,
  },
});

const bucketName = "definy";

/**
 * Cloud Storage に PNGファイルを保存する.
 * ファイル名はファイルの中身のハッシュ値
 */
export const savePngFile = async (
  binary: Uint8Array
): Promise<zodType.ImageHash> => {
  const hash = createImageTokenFromUint8ArrayAndMimeType(binary);
  await storageClient.send(
    new PutObjectCommand({
      Bucket: bucketName,
      Key: hash,
      Body: binary,
      ContentType: "image/png",
    })
  );
  return hash;
};

export const getPngFileReadable = async (
  hash: zodType.ImageHash
): Promise<Readable> => {
  const response = await storageClient.send(
    new GetObjectCommand({ Bucket: "definy", Key: hash })
  );
  return response.Body as Readable;
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
