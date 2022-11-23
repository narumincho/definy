import { ServerResponse } from "../nodeType.ts";

export type SimpleResponse = {
  readonly status: 200 | 400 | 401 | 404;
  readonly headers: {
    readonly ContentType: string | undefined;
  };
  readonly body: Uint8Array | undefined;
};

export const simpleResponseToResponse = (
  simpleResponse: SimpleResponse,
): Response => {
  const headers = new Headers();
  if (simpleResponse.headers.ContentType !== undefined) {
    headers.append("content-type", simpleResponse.headers.ContentType);
  }
  return new Response(simpleResponse.body, {
    status: simpleResponse.status,
    headers,
  });
};

export const simpleResponseHandleServerResponse = (
  simpleResponse: SimpleResponse,
  serverResponse: ServerResponse,
): void => {
  serverResponse.writeHead(simpleResponse.status, {
    ...(simpleResponse.headers.ContentType === undefined ? {} : {
      "content-type": simpleResponse.headers.ContentType,
    }),
  });
  serverResponse.end(simpleResponse.body);
};
