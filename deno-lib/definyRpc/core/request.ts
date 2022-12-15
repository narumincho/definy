import {
  rawJsonToStructuredJsonValue,
  structuredJsonStringify,
} from "../../typedJson.ts";
import {
  FunctionNamespace,
  Result,
  StructuredJsonValue,
  Type,
} from "./coreType.ts";
import { fromStructuredJsonValue } from "./fromStructuredJson.ts";
import { toStructuredJsonValue } from "./toStructuredJson.ts";
import { CollectedDefinyRpcTypeMap } from "./collectType.ts";

export const requestQuery = async <Input, Output>(parameter: {
  readonly url: URL;
  readonly namespace: FunctionNamespace;
  readonly name: string;
  /**
   * 認証が必要な場合のみ付与して呼ぶ
   */
  readonly accountToken?: string | undefined;
  /**
   * API を提供するサーバーに送るデータ
   */
  readonly input: Input;
  readonly inputType: Type<Input>;
  readonly outputType: Type<Output>;
  readonly typeMap: CollectedDefinyRpcTypeMap;
}): Promise<Result<Output, string>> => {
  const url = new URL(parameter.url.toString());
  url.pathname = url.pathname + "/" +
    (parameter.namespace.type === "meta"
      ? "meta/"
      : "api/" + parameter.namespace.value.join("/") + "/") +
    parameter.name;

  const inputAsStructuredJson = toStructuredJsonValue(
    parameter.inputType,
    parameter.typeMap,
    parameter.input,
  );

  try {
    if (parameter.accountToken === undefined) {
      const search = structuredJsonValueToUrlSearch(
        inputAsStructuredJson,
      );
      if (search !== undefined) {
        for (const [key, value] of search) {
          url.searchParams.set(key, value);
        }
        const response = await fetch(url);
        const jsonValue = await response.json();
        return Result.ok(fromStructuredJsonValue(
          parameter.outputType,
          parameter.typeMap,
          rawJsonToStructuredJsonValue(jsonValue),
        ));
      }
    }
    const response = await fetch(url, {
      method: "POST",
      body: structuredJsonStringify(
        parameter.accountToken === undefined
          ? StructuredJsonValue.object(
            new Map([["input", inputAsStructuredJson]]),
          )
          : StructuredJsonValue.object(
            new Map([[
              "accountToken",
              StructuredJsonValue.string(parameter.accountToken),
            ], [
              "input",
              inputAsStructuredJson,
            ]]),
          ),
      ),
    });
    const jsonValue = await response.json();
    return Result.ok(fromStructuredJsonValue(
      parameter.outputType,
      parameter.typeMap,
      rawJsonToStructuredJsonValue(jsonValue),
    ));
  } catch (e) {
    return Result.error(e.toString());
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

export const requestMutation = async <Input, Output>(parameter: {
  readonly url: URL;
  readonly namespace: FunctionNamespace;
  readonly name: string;
  /**
   * 認証が必要な場合のみ付与して呼ぶ
   */
  readonly accountToken?: string | undefined;
  /**
   * API を提供するサーバーに送るデータ
   */
  readonly input: Input;
  readonly inputType: Type<Input>;
  readonly outputType: Type<Output>;
  readonly typeMap: CollectedDefinyRpcTypeMap;
}): Promise<Result<Output, string>> => {
  const url = new URL(parameter.url.toString());
  url.pathname = url.pathname + "/" +
    (parameter.namespace.type === "meta"
      ? "meta/"
      : "api/" + parameter.namespace.value.join("/") + "/") +
    parameter.name;

  const inputAsStructuredJson = toStructuredJsonValue(
    parameter.inputType,
    parameter.typeMap,
    parameter.input,
  );

  try {
    const response = await fetch(url, {
      method: "POST",
      body: structuredJsonStringify(
        parameter.accountToken === undefined
          ? StructuredJsonValue.object(
            new Map([["input", inputAsStructuredJson]]),
          )
          : StructuredJsonValue.object(
            new Map([[
              "accountToken",
              StructuredJsonValue.string(parameter.accountToken),
            ], [
              "input",
              inputAsStructuredJson,
            ]]),
          ),
      ),
    });
    const jsonValue = await response.json();
    return Result.ok(fromStructuredJsonValue(
      parameter.outputType,
      parameter.typeMap,
      rawJsonToStructuredJsonValue(jsonValue),
    ));
  } catch (e) {
    return Result.error(e.toString());
  }
};
