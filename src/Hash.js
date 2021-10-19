// @ts-check
/* eslint-disable @typescript-eslint/no-var-requires */
/* eslint-disable @typescript-eslint/no-require-imports */

/**
 * @param {string} str
 * @returns {string}
 */
exports.stringToSha256HashValue = (str) =>
  require("sha256-uint8array").createHash("sha256").update(str).digest("hex");

/**
 * @param {{buffer: Buffer, mimeType: string}} option
 * @returns {string}
 */
exports.bufferAndMimeTypeToSha256HashValue = (option) =>
  require("sha256-uint8array")
    .createHash("sha256")
    .update(option.buffer)
    .update(option.mimeType)
    .digest("hex");
