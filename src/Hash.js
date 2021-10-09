/* eslint-disable @typescript-eslint/no-var-requires */
/* eslint-disable @typescript-eslint/no-require-imports */

exports.stringToSha256HashValue = (str) =>
  require("sha256-uint8array").createHash("sha256").update(str).digest("hex");

exports.bufferAndMimeTypeToSha256HashValue = (option) =>
  require("sha256-uint8array")
    .createHash("sha256")
    .update(option.buffer)
    .update(option.mimeType)
    .digest("hex");
