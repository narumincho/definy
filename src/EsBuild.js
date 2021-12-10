"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildAsEffectFnAff = void 0;
const esbuild_1 = require("esbuild");
const buildAsEffectFnAff = (option) => {
    return (onError, onSuccess) => {
        (0, esbuild_1.build)({
            entryPoints: [option.entryPoints],
            bundle: true,
            outdir: option.outDir,
            sourcemap: option.sourcemap,
            minify: true,
            target: option.target,
        }).then(() => {
            onSuccess();
        }, (error) => {
            console.log("esbuild でエラーが発生", error);
            onError(error);
        });
        return (cancelError, cancelerError, cancelerSuccess) => {
            console.log("ESBuild の停止処理は未実装です");
            cancelerSuccess();
        };
    };
};
exports.buildAsEffectFnAff = buildAsEffectFnAff;
