import { SimpleUrl } from "../../simpleRequestResponse/simpleUrl.ts";
import { stringArrayEqual } from "../../util.ts";
import dist from "./dist.json" assert { type: "json" };

export type UrlData = {
  readonly type: "script";
} | {
  readonly type: "icon";
} | {
  readonly type: "font";
} | {
  readonly type: "clock24OgpImage";
  readonly parameter: Clock24Parameter;
} | {
  readonly type: "html";
  readonly location: UrlLocation;
};

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

export const simpleUrlToUrlData = (
  url: SimpleUrl,
): UrlData | undefined => {
  if (stringArrayEqual(url.path, [dist.scriptHash])) {
    return { type: "script" };
  }
  if (stringArrayEqual(url.path, [dist.iconHash])) {
    return { type: "icon" };
  }
  if (stringArrayEqual(url.path, [dist.fontHash])) {
    return { type: "font" };
  }
  if (stringArrayEqual(url.path, [clockOgpPath])) {
    const date = new Date(url.query.get("date") ?? "");
    const timezoneOffset = Number.parseInt(
      url.query.get("timezoneOffset") ?? "",
      10,
    );
    const at = new Date(url.query.get("at") ?? "");

    return {
      type: "clock24OgpImage",
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
  if (stringArrayEqual(url.path, [])) {
    return { type: "html", location: { type: "top" } };
  }
  if (stringArrayEqual(url.path, [clock24Path])) {
    const date = new Date(url.query.get("date") ?? "");
    const timezoneOffset = Number.parseInt(
      url.query.get("timezoneOffset") ?? "",
      10,
    );
    const at = new Date(url.query.get("at") ?? "");
    return {
      type: "html",
      location: {
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
      },
    };
  }
};

export const urlDataToSimpleUrl = (
  origin: string,
  urlData: UrlData,
): SimpleUrl => {
  switch (urlData.type) {
    case "script":
      return {
        origin,
        path: [dist.scriptHash],
        query: new Map(),
      };

    case "icon":
      return {
        origin,
        path: [dist.iconHash],
        query: new Map(),
      };

    case "font":
      return {
        origin,
        path: [dist.fontHash],
        query: new Map(),
      };

    case "clock24OgpImage":
      return {
        origin,
        path: [clockOgpPath],
        query: new Map([
          ["message", urlData.parameter.message],
          ...(urlData.parameter.deadline === undefined ? [] : [
            ["date", urlData.parameter.deadline.date.toISOString()],
            [
              "timezoneOffset",
              urlData.parameter.deadline.timezoneOffset.toString(),
            ],
            ["at", urlData.parameter.deadline.at.toISOString()],
          ] as const),
        ]),
      };

    case "html":
      return urlLocationToUrl(origin, urlData.location);
  }
};

const urlLocationToUrl = (
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

const clockOgpPath = "clock-ogp-v2";

const clock24Path = "clock24";
