import { UntypedRequestExpr } from "../requestExpr.ts";
import { SchemaType } from "./schemaType.ts";

export const requestParse = <T>(
  request: Request,
  option: {
    readonly schema: SchemaType<T>;
    readonly pathPefix: ReadonlyArray<string>;
  },
): ParsedRequest => {
};

export type ParsedRequest = {
  readonly type: "editorHtml";
  readonly documentId?: string;
} | {
  readonly type: "editorOgpImage";
  readonly documentId?: string;
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
