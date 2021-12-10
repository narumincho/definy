"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ensureDirAsEffectFnAff = void 0;
const fs_extra_1 = require("fs-extra");
const ensureDirAsEffectFnAff = (path) => (onError, onSuccess) => {
    (0, fs_extra_1.ensureDir)(path).then(() => {
        onSuccess();
    }, (error) => {
        onError(error);
    });
    return (cancelError, cancelerError, cancelerSuccess) => {
        cancelerSuccess();
    };
};
exports.ensureDirAsEffectFnAff = ensureDirAsEffectFnAff;
