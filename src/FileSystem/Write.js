// @ts-check
/* eslint-disable @typescript-eslint/no-require-imports */
/* eslint-disable @typescript-eslint/no-var-requires */

/**
 *
 * @param {string} path
 * @returns
 */
exports.ensureDirAsEffectFnAff = (path) => (onError, onSuccess) => {
  require("fs-extra")
    .ensureDir(path)
    .then(
      () => {
        onSuccess();
      },
      () => {}
    );
  return (cancelError, cancelerError, cancelerSuccess) => {
    cancelerSuccess();
  };
};
