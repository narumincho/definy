"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.searchParamsToString = void 0;
const searchParamsToString = (queryList) => {
    return new URLSearchParams(queryList.map((e) => [e.key, e.value])).toString();
};
exports.searchParamsToString = searchParamsToString;
