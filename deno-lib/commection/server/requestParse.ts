import { requestObjectToSimpleRequest } from "../../simpleRequestResponse/simpleRequest.ts";
import { urlToSimpleUrl } from "../../simpleRequestResponse/simpleUrl.ts";
import { stringArrayEqual, stringArrayMatchPrefix } from "../../util.ts";
import { UntypedRequestExpr } from "../requestExpr.ts";
import { SchemaType } from "./schemaType.ts";

export const requestParse = async <T>(
  request: Request,
  option: {
    readonly schema: SchemaType<T>;
    readonly pathPrefix: ReadonlyArray<string>;
  },
): Promise<ParsedRequest> => {
  const simpleRequest = await requestObjectToSimpleRequest(request);
  if (simpleRequest === undefined) {
    return { type: "skip" };
  }

  const pathListRemovePrefix = stringArrayMatchPrefix(
    simpleRequest.url.path,
    option.pathPrefix,
  );
  if (pathListRemovePrefix === undefined) {
    return { type: "skip" };
  }
  if (
    pathListRemovePrefix.length === 0 ||
    stringArrayEqual(pathListRemovePrefix, ["editor"])
  ) {
    return { type: "editorHtml", documentId: undefined };
  }
  if (
    stringArrayEqual(pathListRemovePrefix, ["editor-assets/ogp"])
  ) {
    return { type: "editorHtml", documentId: undefined };
  }

  return { type: "editorHtml", documentId: undefined };
};

export type ParsedRequest = {
  readonly type: "editorHtml";
  readonly documentId: string | undefined;
} | {
  readonly type: "editorOgpImage";
  readonly documentId: string | undefined;
} | {
  readonly type: "editorIcon";
} | {
  readonly type: "apiRequest";
  readonly expr: UntypedRequestExpr;
} | {
  readonly type: "error";
} | {
  readonly type: "skip";
};
