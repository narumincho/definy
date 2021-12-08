"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.bufferAndMimeTypeToSha256HashValueRaw = exports.stringToSha256HashValueRaw = void 0;
const sha256_uint8array_1 = require("sha256-uint8array");
const stringToSha256HashValueRaw = (str) => (0, sha256_uint8array_1.createHash)("sha256").update(str).digest("hex");
exports.stringToSha256HashValueRaw = stringToSha256HashValueRaw;
const bufferAndMimeTypeToSha256HashValueRaw = (option) => (0, sha256_uint8array_1.createHash)("sha256")
    .update(option.buffer)
    .update(option.mimeType)
    .digest("hex");
exports.bufferAndMimeTypeToSha256HashValueRaw = bufferAndMimeTypeToSha256HashValueRaw;
