import { ServerResponse } from "../nodeType.ts";

export type SimpleResponse = {
  readonly status: 200 | 400 | 401 | 404;
  readonly headers: {
    readonly ContentType: string | undefined;
  };
  readonly body: (() => Promise<Uint8Array>) | undefined;
};

export const simpleResponseToResponse = async (
  simpleResponse: SimpleResponse,
): Promise<Response> => {
  const bodyBinary = await simpleResponse.body?.();
  const headers = new Headers();
  if (simpleResponse.headers.ContentType !== undefined) {
    headers.append("content-type", simpleResponse.headers.ContentType);
  }
  return new Response(bodyBinary, {
    status: simpleResponse.status,
    headers,
  });
};

export const simpleResponseHandleServerResponse = async (
  simpleResponse: SimpleResponse,
  serverResponse: ServerResponse,
): Promise<void> => {
  serverResponse.writeHead(simpleResponse.status, {
    ...(simpleResponse.headers.ContentType === undefined ? {} : {
      "content-type": simpleResponse.headers.ContentType,
    }),
  });
  const bodyBinary = await simpleResponse.body?.();
  serverResponse.end(bodyBinary);
};
