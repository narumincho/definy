/**
 * jest の 使用する js-dom で グローバルに定義された
 *
 * - TextEncoder
 * - TextDecoder
 *
 * がサポートされていないため. この環境設定をする
 */
/* eslint-disable @typescript-eslint/no-require-imports */
/* eslint-disable @typescript-eslint/no-var-requires */
const Environment = require("jest-environment-jsdom");

module.exports = class CustomTestEnvironment extends Environment {
  async setup() {
    await super.setup();
    if (this.global.TextEncoder === undefined) {
      this.global.TextEncoder = require("util").TextEncoder;
    }
    if (this.global.TextDecoder === undefined) {
      this.global.TextDecoder = require("util").TextDecoder;
    }
  }
};
