import type { NextApiRequest, NextApiResponse } from "next";
import { ImageHash } from "../../../common/zodType";
import { getPngFileReadable } from "../../../functions/cloudstorage-interface";

/**
 * Cloud Storage に保存された PNG 画像を取得する
 * (definy Next 版 の API が definy RPC になるまでのため)
 */
const handler = (request: NextApiRequest, response: NextApiResponse) => {
  const hash = request.query.hash;
  if (typeof hash === "string") {
    const imageHashParseResult = ImageHash.safeParse(hash);
    if (imageHashParseResult.success) {
      response.setHeader("content-type", "image/png");
      response.setHeader("cache-control", "public, max-age=604800, immutable");
      getPngFileReadable(ImageHash.parse(imageHashParseResult.data)).pipe(
        response
      );
      return;
    }
    response.status(400).json({
      errorMessage: "invalid image hash value",
      current: hash,
      example:
        "53d097c886df08c6f9ca2154f2d94ed998232546ee9b3e427cdd33a08de1cc24",
    });
    return;
  }
  response
    .status(400)
    .json(
      "require image hash value. example: /image/53d097c886df08c6f9ca2154f2d94ed998232546ee9b3e427cdd33a08de1cc24"
    );
};

export default handler;
