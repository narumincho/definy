import * as commonUrl from "../common/url";
import * as functions from "firebase-functions";
import * as lib from "./lib";
import * as mimeType from "../definy-output/typescript/mimeType";
import { ApiCodec, apiCodec } from "../common/apiCodec";
import { html as genHtml } from "../gen/main";
import { generateHtml } from "./html";

console.log("versions", JSON.stringify(process.versions));
/*
 * =====================================================================
 *                  html ブラウザが最初にリクエストするところ
 *
 *                       https://definy.app/
 *    https://definy.app/project/077bc302f933bd78e20efd6fd3fa657e
 *                             など
 *            ↓ Firebase Hosting firebase.json rewrite
 *                Cloud Functions for Firebase / html
 * =====================================================================
 */

export const html = functions.https.onRequest(async (request, response) => {
  const requestUrl = new URL("https://" + request.hostname + request.url);
  console.log("protocol を表示!", request.protocol);
  console.log(request.headers.host, request.url, request.originalUrl);
  const urlData = commonUrl.urlToUrlData(requestUrl);
  console.log("requestUrl", requestUrl.toString());
  const htmlAndIsNotFound = await generateHtml(urlData);

  response.status(htmlAndIsNotFound.isNotFound ? 404 : 200);
  response.setHeader("content-type", mimeType.html);
  response.send(genHtml.htmlOptionToString(htmlAndIsNotFound.htmlOption));
});

/*
 * =====================================================================
 *               api データを取得したり変更したりする
 *              https://definy.app/api/getProject
 *                            など
 *            ↓ Firebase Hosting firebase.json rewrite
 *                Cloud Functions for Firebase / api
 * =====================================================================
 */
export const api = functions
  .runWith({ memory: "512MB" })
  .https.onRequest(async (request, response) => {
    const path = request.path.split("/")[2];
    if (path === undefined) {
      response.status(400);
      response.send("パスにAPI名が含まれていない request.path=" + request.path);
      return;
    }
    console.log("call api function!", request.socket.remoteAddress, path);
    const result = await callApiFunction(path, request.body as Buffer);
    if (result === undefined) {
      response.status(400);
      response.send("想定外のパスを受けとった request.path=" + request.path);
      return;
    }
    response.send(Buffer.from(result));
  });

const callApiFromCodecAndFunction = async <Request, Response>(
  apiName: string,
  binary: Uint8Array,
  codec: ApiCodec<Request, Response>,
  func: (request: Request) => Promise<Response>
): Promise<ReadonlyArray<number>> => {
  const request: Request = codec.request.decode(0, binary).result;
  const response: Response = await func(codec.request.decode(0, binary).result);
  console.log(
    "call api",
    apiName,
    JSON.stringify(request),
    JSON.stringify(response)
  );
  return codec.response.encode(response);
};

const callApiFunction = (
  apiName: string,
  binary: Uint8Array
): Promise<ReadonlyArray<number> | undefined> => {
  // apiCodec[apiName] でも良い気がするが prototype 汚染が怖いのでループして一致するものを探す
  for (const [selectedApiName, selectedApiCodec] of Object.entries(apiCodec)) {
    if (apiName === selectedApiName) {
      return callApiFromCodecAndFunction(
        selectedApiName,
        binary,
        selectedApiCodec as ApiCodec<unknown, unknown>,
        lib.apiFunc[selectedApiName as keyof typeof apiCodec] as (
          request: unknown
        ) => Promise<unknown>
      );
    }
  }
  return Promise.resolve(undefined);
};

/*
 * =====================================================================
 *          pngFile Cloud Storage に 保存された PNG ファイルを取得する
 *  https://definy.app/pngFile/08bb4f91242e1ce96da5ee69909d0ccfe530c155bedff462d049683becc3cb20
 *                            など
 *            ↓ Firebase Hosting firebase.json rewrite
 *                Cloud Functions for Firebase / pngFile
 * =====================================================================
 */
export const pngFile = functions.https.onRequest((request, response): void => {
  const matchResult = request.path.match(/(?<hash>.{64})\.png/u);
  if (matchResult === null || matchResult.groups === undefined) {
    response.send(400);
    return;
  }
  const fileHash = matchResult.groups.hash;
  if (fileHash === undefined) {
    response.send(400);
    return;
  }
  const readableStream = lib.readPngFile(fileHash);
  response.contentType(mimeType.png);
  response.header("cache-control", "max-age=31536000");
  readableStream.pipe(response);
});
