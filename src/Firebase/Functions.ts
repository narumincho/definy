import { HttpsFunction, https } from "firebase-functions";

export const onRequestJs = (
  callback: (requestData: { readonly nodeHttpUrl: string }) => {
    readonly body: string;
    readonly mimeType: string;
    readonly status: number;
  }
): HttpsFunction => {
  return https.onRequest((request, response) => {
    const res = callback({
      nodeHttpUrl: request.url,
    });
    response.type(res.mimeType);
    response.status(res.status);
    response.send(res.body);
  });
};
