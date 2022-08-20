import type { NextApiRequest, NextApiResponse } from "next";

export default (request: NextApiRequest, response: NextApiResponse): void => {
  response.status(200).json({
    now: new Date().toISOString(),
    requestUrl: request.url,
    headers: request.headers,
    method: request.method,
    httpVersion: request.httpVersion,
  });
};
