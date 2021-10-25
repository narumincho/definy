// @ts-check
/* eslint-disable @typescript-eslint/no-require-imports */
/* eslint-disable @typescript-eslint/no-var-requires */

/**
 *
 * @param {() => { body : string, mimeType : string }} callback
 * @returns {import("firebase-functions").HttpsFunction}
 */
exports.onRequestJs = (callback) => {
  return require("firebase-functions").https.onRequest((request, response) => {
    const res = callback();
    response.type(res.mimeType);
    response.send(res.body);
  });
};
