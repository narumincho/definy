import { SimpleUrl } from "../../simpleRequestResponse/simpleUrl.ts";
import { stringArrayEqual } from "../../util.ts";
import {
  Clock24Parameter,
  simpleUrlToUrlLocation,
  UrlLocation,
  urlLocationToSimpleUrl,
} from "../editor/url.ts";
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

  const location = simpleUrlToUrlLocation(url);
  if (location === undefined) {
    return undefined;
  }
  return { type: "html", location: location };
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
      return urlLocationToSimpleUrl(origin, urlData.location);
  }
};

const clockOgpPath = "clock-ogp-v2";
