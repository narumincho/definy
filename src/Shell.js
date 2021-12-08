"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.execImpl = exports.spawnImpl = exports.unsafeFromNullable = void 0;
const childProcess = __importStar(require("child_process"));
const unsafeFromNullable = (msg, x) => {
    if (x === null)
        throw new Error(msg);
    return x;
};
exports.unsafeFromNullable = unsafeFromNullable;
const spawnImpl = (command, args, opts) => {
    console.log("spawn を実行する!", command, args, opts);
    try {
        return childProcess.spawn(command, args, opts);
    }
    catch (e) {
        console.error(e);
        throw new Error("PureScript 内の child_process の spawn でエラーが発生した");
    }
};
exports.spawnImpl = spawnImpl;
const execImpl = (command, callback) => {
    return childProcess.exec(command, {}, (err, stdout, stderr) => {
        callback(err)(stdout)(stderr)();
    });
};
exports.execImpl = execImpl;
