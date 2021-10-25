// @ts-check
/* eslint-disable @typescript-eslint/no-require-imports */
/* eslint-disable @typescript-eslint/no-var-requires */

/**
 *
 * @param {{src: string, dist: string}} option
 * @returns
 */
exports.copyFileAsEffectFnAff = (option) => (onError, onSuccess) => {
  require("fs-extra")
    .copyFile(option.src, option.dist)
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
