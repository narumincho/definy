/* @ts-check */
/* eslint-disable @typescript-eslint/no-require-imports */
/* eslint-disable @typescript-eslint/no-var-requires */

/**
 *
 * @param {() => string} callback
 * @returns {import("firebase-functions").HttpsFunction}
 */
exports.onRequestJs = (callback) => {
  return require("firebase-functions").https.onRequest((request, response) => {
    response.send(callback());
  });
};
