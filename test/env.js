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
