"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.copyFileAsEffectFnAff = void 0;
const fs_extra_1 = require("fs-extra");
const copyFileAsEffectFnAff = (option) => (onError, onSuccess) => {
    (0, fs_extra_1.copyFile)(option.src, option.dist).then(() => {
        onSuccess();
    }, (error) => {
        onError(error);
    });
    return (cancelError, cancelerError, cancelerSuccess) => {
        cancelerSuccess();
    };
};
exports.copyFileAsEffectFnAff = copyFileAsEffectFnAff;
