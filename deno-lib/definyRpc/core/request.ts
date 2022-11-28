import {
  rawJsonToStructuredJsonValue,
  structuredJsonStringify,
} from "../../typedJson.ts";
import { Result, StructuredJsonValue } from "../generated/definyRpc.ts";

export const requestQuery = async <T extends unknown>(parameter: {
  readonly url: URL;
  readonly fullName: ReadonlyArray<string>;
  readonly fromStructuredJsonValue: (a: StructuredJsonValue) => T;
  /**
   * 認証が必要な場合のみ付与して呼ぶ
   */
  readonly accountToken?: string | undefined;
  /**
   * StructuredJson にした input
   */
  readonly input: StructuredJsonValue;
}): Promise<Result<T, "error">> => {
  const url = new URL(parameter.url.toString());
  url.pathname = url.pathname + ("/" + parameter.fullName.join("/"));

  try {
    if (parameter.accountToken !== undefined) {
      const search = structuredJsonValueToUrlSearch(parameter.input);
      if (search !== undefined) {
        for (const [key, value] of search) {
          url.searchParams.set(key, value);
        }
        const response = await fetch(url);
        const jsonValue = await response.json();
        return ({
          type: "ok",
          ok: parameter.fromStructuredJsonValue(
            rawJsonToStructuredJsonValue(jsonValue),
          ),
        });
      }
    }
    const response = await fetch(url, {
      method: "POST",
      body: structuredJsonStringify(
        parameter.accountToken === undefined
          ? StructuredJsonValue.object(new Map([["input", parameter.input]]))
          : StructuredJsonValue.object(
            new Map([[
              "accountToken",
              StructuredJsonValue.string(parameter.accountToken),
            ], [
              "input",
              parameter.input,
            ]]),
          ),
      ),
    });
    const jsonValue = await response.json();
    return ({
      type: "ok",
      ok: parameter.fromStructuredJsonValue(
        rawJsonToStructuredJsonValue(jsonValue),
      ),
    });
  } catch {
    return ({ type: "error", error: "error" });
  }
};

const structuredJsonValueToUrlSearch = (
  structuredJsonValue: StructuredJsonValue,
): URLSearchParams | undefined => {
  const search = structuredJsonValueToUrlSearchNoLimit(structuredJsonValue);
  if (2000 < search.toString().length) {
    return undefined;
  }
  return search;
};

const structuredJsonValueToUrlSearchNoLimit = (
  structuredJsonValue: StructuredJsonValue,
): URLSearchParams => {
  switch (structuredJsonValue.type) {
    case "string":
      return new URLSearchParams({ q: structuredJsonValue.value });
    case "number":
      return new URLSearchParams({ q: structuredJsonValue.value.toString() });
    case "boolean":
      return new URLSearchParams({ q: structuredJsonValue.value.toString() });
    case "null":
      return new URLSearchParams({});
    case "array":
      return new URLSearchParams({
        q: structuredJsonStringify(structuredJsonValue),
      });
    case "object": {
      const search = new URLSearchParams(
        [...structuredJsonValue.value].map((
          [key, value],
        ) => [key, structuredJsonStringify(value)]),
      );
      search.sort();
      return search;
    }
  }
};
