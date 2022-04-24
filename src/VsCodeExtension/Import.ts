import { EffectFnAff } from "../PureScriptType";

// eslint-disable-next-line init-declarations
declare const JavaScriptDynamicImport: (
  url: string
) => Promise<{ readonly [k in string]: unknown }>;

export const callJavaScriptCode = (
  code: string
): EffectFnAff<{ readonly [k in string]: unknown }, Error> => {
  return (onError, onSuccess) => {
    const scriptBlobUrl = URL.createObjectURL(
      new Blob([code], { type: "text/javascript" })
    );
    JavaScriptDynamicImport(scriptBlobUrl)
      .then((mod) => {
        onSuccess(mod);
      })
      .catch((e) => {
        onError(e);
      });
    return (cancelError, cancelerError, cancelerSuccess) => {
      cancelerSuccess();
    };
  };
};
