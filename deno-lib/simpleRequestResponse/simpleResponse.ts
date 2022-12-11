import { StructuredJsonValue } from "../definyRpc/core/coreType.ts";
import {
  jsonStringify,
  RawJsonValue,
  structuredJsonStringify,
} from "../typedJson.ts";

/**
 * {@link Response} のサブセット
 */
export type SimpleResponse = {
  readonly status: 200 | 400 | 401 | 404;
  readonly headers: {
    readonly contentType: string | undefined;
    readonly cacheControl:
      | "public, max-age=604800, immutable"
      | "public, max-age=5"
      | "private"
      | undefined;
  };
  readonly body: Uint8Array | undefined;
} | {
  readonly status: 301;
  readonly headers: {
    readonly location: string | undefined;
  };
  readonly body: undefined;
};

export const simpleResponseOkEmpty: SimpleResponse = {
  status: 200,
  headers: { contentType: undefined, cacheControl: undefined },
  body: undefined,
};

export const simpleResponseHtml = (html: string): SimpleResponse => ({
  status: 200,
  headers: {
    contentType: "text/html; charset=utf-8",
    cacheControl: "public, max-age=5",
  },
  body: new TextEncoder().encode(html),
});

export const simpleResponseNotFoundHtml = (html: string): SimpleResponse => ({
  status: 404,
  headers: {
    contentType: "text/html; charset=utf-8",
    cacheControl: "public, max-age=5",
  },
  body: new TextEncoder().encode(html),
});

export const simpleResponseRedirect = (url: URL): SimpleResponse => {
  return {
    status: 301,
    headers: { location: url.toString() },
    body: undefined,
  };
};

export const simpleResponseImmutablePng = (
  body: Uint8Array,
): SimpleResponse => ({
  status: 200,
  headers: {
    contentType: "image/png",
    cacheControl: "public, max-age=604800, immutable",
  },
  body,
});

export const simpleResponseImmutableJavaScript = (
  code: string,
): SimpleResponse => ({
  status: 200,
  headers: {
    contentType: "text/javascript; charset=utf-8",
    cacheControl: "public, max-age=604800, immutable",
  },
  body: new TextEncoder().encode(code),
});

export const simpleResponseImmutableWoff2Font = (
  body: Uint8Array,
): SimpleResponse => {
  return {
    status: 200,
    headers: {
      contentType: "font/woff2",
      cacheControl: "public, max-age=604800, immutable",
    },
    body,
  };
};

export const simpleResponseCache5SecJson = (
  structuredJsonValue: StructuredJsonValue,
): SimpleResponse => ({
  status: 200,
  headers: {
    contentType: "application/json",
    cacheControl: "public, max-age=5",
  },
  body: new TextEncoder().encode(
    structuredJsonStringify(structuredJsonValue),
  ),
});

export const simpleResponsePrivateJson = (
  structuredJsonValue: StructuredJsonValue,
): SimpleResponse => ({
  status: 200,
  headers: {
    contentType: "application/json",
    cacheControl: "private",
  },
  body: new TextEncoder().encode(
    structuredJsonStringify(structuredJsonValue),
  ),
});

export const unauthorized = (message: string): SimpleResponse => ({
  status: 401,
  headers: {
    contentType: "application/json",
    cacheControl: undefined,
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
    cacheControl: "public, max-age=5",
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
    simpleResponse.status !== 301 &&
    simpleResponse.headers.contentType !== undefined
  ) {
    headers.append("content-type", simpleResponse.headers.contentType);
  }
  if (
    simpleResponse.status !== 301 &&
    simpleResponse.headers.cacheControl !== undefined
  ) {
    headers.append("cache-control", simpleResponse.headers.cacheControl);
  }
  if (
    simpleResponse.status === 301 &&
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
