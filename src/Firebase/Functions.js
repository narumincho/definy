// @ts-check
/* eslint-disable @typescript-eslint/no-require-imports */
/* eslint-disable @typescript-eslint/no-var-requires */

/**
 *
 * @param {(pathAndSearchParams: string) => { body : string, mimeType : string, status: number }} callback
 * @returns {import("firebase-functions").HttpsFunction}
 */
exports.onRequestJs = (callback) => {
  return require("firebase-functions").https.onRequest((request, response) => {
    const res = callback(request.path);
    response.type(res.mimeType);
    response.status(res.status);
    response.send(res.body);
  });
};
