import * as apiCodec from "definy-core/source/api";
import * as d from "definy-core/source/data";

type ApiCodecType = typeof apiCodec;

type GetCodecType<codec> = codec extends d.Codec<infer t> ? t : never;

/**
 * DefinyのApi. api[api名](リクエストのデータ) で呼べる. 戻り値の Nothing は fetch が失敗した場合に返す.
 * いずれは, Result型を返したい
 */
export const api = Object.fromEntries(
  Object.entries(apiCodec).map(([apiName, codec]) => [
    apiName,
    (
      requestData: GetCodecType<ApiCodecType[keyof ApiCodecType]["request"]>
    ): Promise<
      d.Maybe<GetCodecType<ApiCodecType[keyof ApiCodecType]["response"]>>
    > =>
      fetch(`https://definy.app/api/${apiName}`, {
        method: "POST",
        body: new Uint8Array(codec.request.encode(requestData as never)),
        headers: [["content-type", "application/octet-stream"]],
      })
        .then((response) => response.arrayBuffer())
        .then((response) =>
          d.Maybe.Just(
            codec.response.decode(0, new Uint8Array(response)).result
          )
        )
        .catch((reason) => {
          console.error(
            "definy api の " + apiName + " を呼ぶときにエラーが発生した",
            reason
          );
          return d.Maybe.Nothing();
        }),
  ])
) as {
  [apiName in keyof ApiCodecType]: (
    requestData: GetCodecType<ApiCodecType[apiName]["request"]>
  ) => Promise<d.Maybe<GetCodecType<ApiCodecType[apiName]["response"]>>>;
};
