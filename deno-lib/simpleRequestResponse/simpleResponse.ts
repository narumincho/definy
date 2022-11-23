import {
  jsonStringify,
  RawJsonValue,
  structuredJsonStringify,
  StructuredJsonValue,
} from "../typedJson.ts";

/**
 * {@link Response} のサブセット
 */
export type SimpleResponse = {
  readonly status: 200 | 400 | 401 | 404;
  readonly headers: {
    readonly contentType: string | undefined;
  };
  readonly body: Uint8Array | undefined;
} | {
  readonly status: 302;
  readonly headers: {
    readonly location: string | undefined;
  };
  readonly body: undefined;
};

export const simpleResponseOkEmpty: SimpleResponse = {
  status: 200,
  headers: { contentType: undefined },
  body: undefined,
};

export const simpleResponseHtml = (html: string): SimpleResponse => ({
  status: 200,
  headers: { contentType: "text/html; charset=utf-8" },
  body: new TextEncoder().encode(html),
});

export const simpleResponseRedirect = (url: URL): SimpleResponse => {
  return {
    status: 302,
    headers: { location: url.toString() },
    body: undefined,
  };
};

export const simpleResponsePng = (body: Uint8Array): SimpleResponse => ({
  status: 200,
  headers: { contentType: "image/png" },
  body,
});

export const simpleResponseJavaScript = (code: string): SimpleResponse => ({
  status: 200,
  headers: { contentType: "text/javascript; charset=utf-8" },
  body: new TextEncoder().encode(code),
});

export const simpleResponseJson = (
  structuredJsonValue: StructuredJsonValue,
): SimpleResponse => ({
  status: 200,
  headers: {
    contentType: "application/json",
  },
  body: new TextEncoder().encode(
    structuredJsonStringify(structuredJsonValue),
  ),
});

export const unauthorized = (message: string): SimpleResponse => ({
  status: 401,
  headers: {
    contentType: "application/json",
  },
  body: new TextEncoder().encode(
    jsonStringify(message),
  ),
});

export const notFound = (
  message: { specified: RawJsonValue; examples: ReadonlyArray<RawJsonValue> },
): SimpleResponse => ({
  status: 404,
  headers: {
    contentType: "application/json",
  },
  body: new TextEncoder().encode(
    jsonStringify({
      message: "not found",
      specified: message.specified,
      examples: message.examples,
    }),
  ),
});

export const simpleResponseToResponse = (
  simpleResponse: SimpleResponse,
): Response => {
  const headers = new Headers();
  if (
    simpleResponse.status !== 302 &&
    simpleResponse.headers.contentType !== undefined
  ) {
    headers.append("content-type", simpleResponse.headers.contentType);
  }
  if (
    simpleResponse.status === 302 &&
    simpleResponse.headers.location !== undefined
  ) {
    headers.append("location", simpleResponse.headers.location);
  }
  return new Response(
    simpleResponse.body,
    {
      status: simpleResponse.status,
      headers,
    },
  );
};
