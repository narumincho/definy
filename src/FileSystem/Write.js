/* eslint-disable @typescript-eslint/no-require-imports */
/* eslint-disable @typescript-eslint/no-var-requires */
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
