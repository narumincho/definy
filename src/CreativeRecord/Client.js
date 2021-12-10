"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getLocation = void 0;
const getLocation = () => {
    return window.location.pathname + window.location.search;
};
exports.getLocation = getLocation;
