"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.readdirWithFileTypesAsEffectFnAff = void 0;
const fs_1 = require("fs");
const readdirWithFileTypesAsEffectFnAff = (path) => (onError, onSuccess) => {
    (0, fs_1.readdir)(path, {
        withFileTypes: true,
    }, (error, direntList) => {
        if (error) {
            onError(error);
            return;
        }
        onSuccess(direntList.map((dirent) => ({
            isFile: dirent.isFile(),
            name: dirent.name,
        })));
    });
    return (cancelError, cancelerError, cancelerSuccess) => {
        cancelerSuccess();
    };
};
exports.readdirWithFileTypesAsEffectFnAff = readdirWithFileTypesAsEffectFnAff;
