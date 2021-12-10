import { HttpsFunction, https } from "firebase-functions";

export const onRequestJs = (
  callback: (pathAndSearchParams: string) => {
    body: string;
    mimeType: string;
    status: number;
  }
): HttpsFunction => {
  return https.onRequest((request, response) => {
    const res = callback(request.path);
    response.type(res.mimeType);
    response.status(res.status);
    response.send(res.body);
  });
};
