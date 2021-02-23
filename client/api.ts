import * as apiCodec from "../common/apiCodec";
import * as d from "definy-core/source/data";

type ApiCodecType = typeof apiCodec;

/**
 * DefinyのApi. api[api名](リクエストのデータ) で呼べる. 戻り値の Nothing は fetch が失敗した場合に返す.
 * いずれは, Result型を返したい
 */
export const api = Object.fromEntries(
  Object.entries(apiCodec).map(([apiName, codec]) => [
    apiName,
    (
      requestData: apiCodec.GetCodecType<
        ApiCodecType[keyof ApiCodecType]["request"]
      >
    ): Promise<
      d.Maybe<
        apiCodec.GetCodecType<ApiCodecType[keyof ApiCodecType]["response"]>
      >
    > => {
      console.log(apiName, "request", requestData);
      return fetch(`https://definy.app/api/${apiName}`, {
        method: "POST",
        body: new Uint8Array(codec.request.encode(requestData as never)),
        headers: [["content-type", "application/octet-stream"]],
      })
        .then((response) => response.arrayBuffer())
        .then((binaryResponse) => {
          const response = codec.response.decode(
            0,
            new Uint8Array(binaryResponse)
          ).result;
          console.log(apiName, "response", response);
          return d.Maybe.Just(response);
        })
        .catch((reason) => {
          console.error(
            "definy api の " + apiName + " を呼ぶときにエラーが発生した",
            reason
          );
          return d.Maybe.Nothing();
        });
    },
  ])
) as {
  [apiName in keyof ApiCodecType]: (
    requestData: apiCodec.GetCodecType<ApiCodecType[apiName]["request"]>
  ) => Promise<
    d.Maybe<apiCodec.GetCodecType<ApiCodecType[apiName]["response"]>>
  >;
};

export const getImageWithCache = (
  imageToken: d.ImageToken
): Promise<d.Maybe<Uint8Array>> =>
  fetch(
    "https://us-central1-definy-lang.cloudfunctions.net/getFile/" + imageToken,
    { cache: "force-cache" }
  )
    .then((response) => response.arrayBuffer())
    .then((response) => d.Maybe.Just(new Uint8Array(response)))
    .catch((reason) => {
      console.error(
        "imageToken = " + imageToken + " 画像の取得時にエラーが発生した",
        reason
      );
      return d.Maybe.Nothing();
    });
