"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.onRequestJs = void 0;
const firebase_functions_1 = require("firebase-functions");
const onRequestJs = (callback) => {
    return firebase_functions_1.https.onRequest((request, response) => {
        const res = callback(request.path);
        response.type(res.mimeType);
        response.status(res.status);
        response.send(res.body);
    });
};
exports.onRequestJs = onRequestJs;
