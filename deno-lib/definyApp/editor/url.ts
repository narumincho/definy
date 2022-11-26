import { SimpleUrl } from "../../simpleRequestResponse/simpleUrl.ts";
import { stringArrayEqual } from "../../util.ts";

export type UrlLocation = {
  readonly type: "top";
} | {
  readonly type: "clock24";
  readonly parameter: Clock24Parameter;
};

export type Clock24Parameter = {
  readonly message: string;
  readonly deadline:
    | Deadline
    | undefined;
};

export type Deadline = {
  readonly date: Date;
  readonly timezoneOffset: number;
  readonly at: Date;
};

const clock24Path = "clock24";

export const simpleUrlToUrlLocation = (
  url: SimpleUrl,
): UrlLocation | undefined => {
  if (stringArrayEqual(url.path, [])) {
    return { type: "top" };
  }
  if (stringArrayEqual(url.path, [clock24Path])) {
    const date = new Date(url.query.get("date") ?? "");
    const timezoneOffset = Number.parseInt(
      url.query.get("timezoneOffset") ?? "",
      10,
    );
    const at = new Date(url.query.get("at") ?? "");
    return {
      type: "clock24",
      parameter: {
        message: url.query.get("message") ?? "",
        deadline:
          Number.isNaN(date.getTime()) || Number.isNaN(timezoneOffset) ||
            Number.isNaN(at.getTime())
            ? undefined
            : {
              date,
              timezoneOffset,
              at,
            },
      },
    };
  }
};

export const urlLocationToSimpleUrl = (
  origin: string,
  urlLocation: UrlLocation,
): SimpleUrl => {
  switch (urlLocation.type) {
    case "top":
      return {
        origin,
        path: [],
        query: new Map(),
      };
    case "clock24":
      return {
        origin,
        path: [clock24Path],
        query: new Map([
          ["message", urlLocation.parameter.message],
          ...(urlLocation.parameter.deadline === undefined ? [] : [
            ["date", urlLocation.parameter.deadline.date.toISOString()],
            [
              "timezoneOffset",
              urlLocation.parameter.deadline.timezoneOffset.toString(),
            ],
            ["at", urlLocation.parameter.deadline.at.toISOString()],
          ] as const),
        ]),
      };
  }
};
