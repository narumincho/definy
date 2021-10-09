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

exports.readdirWithFileTypesAsEffectFnAff = (path) => (onError, onSuccess) => {
  require("fs").readdir(
    path,
    {
      withFileTypes: true,
    },
    (err, direntList) => {
      if (err) {
        onError(err);
        return;
      }
      onSuccess(
        direntList.map((dirent) => ({
          isFile: dirent.isFile(),
          name: dirent.name,
        }))
      );
    }
  );
  return (cancelError, cancelerError, cancelerSuccess) => {
    cancelerSuccess();
  };
};
