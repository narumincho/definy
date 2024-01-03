export type PathAndQuery = {
  readonly pathSegments: ReadonlyArray<string>;
  readonly query: ReadonlyMap<string, string>;
};

export const pathAndQueryFromUrl = (url: URL): PathAndQuery => {
  return {
    pathSegments: url.pathname.split("/").filter((segment) =>
      segment.length > 0
    ),
    query: new Map([...url.searchParams]),
  };
};

export const pathAndQueryToPathAndQueryString = (
  pathAndQuery: PathAndQuery,
): string => {
  return "/" + pathAndQuery.pathSegments.join("/") +
    (pathAndQuery.query.size > 0
      ? "?" + new URLSearchParams([...pathAndQuery.query])
      : "");
};

export type Location = { readonly type: "top"; readonly hl: Language } | {
  readonly type: "about";
  readonly hl: Language;
} | {
  readonly type: "file";
  readonly hash: string;
};

export type Language = "en" | "eo" | "ja";

export const locationFromPathAndQuery = (
  pathAndQuery: PathAndQuery,
): Location | undefined => {
  if (pathAndQuery.pathSegments.length === 0) {
    return {
      type: "top",
      hl: searchQueryValueToLanguage(pathAndQuery.query.get("hl")),
    };
  }
  if (pathAndQuery.pathSegments[0] === "about") {
    return {
      type: "about",
      hl: searchQueryValueToLanguage(pathAndQuery.query.get("hl")),
    };
  }
  if (pathAndQuery.pathSegments[0] === "file") {
    return {
      type: "file",
      hash: pathAndQuery.pathSegments?.[1],
    };
  }
  return {
    type: "top",
    hl: searchQueryValueToLanguage(pathAndQuery.query.get("hl")),
  };
};

const searchQueryValueToLanguage = (hlValue: string | undefined): Language => {
  switch (hlValue) {
    case "en":
      return "en";
    case "eo":
      return "eo";
    case "ja":
      return "ja";
    default:
      return "en";
  }
};

export const locationToPathAndQuery = (location: Location): PathAndQuery => {
  switch (location.type) {
    case "top":
      return {
        pathSegments: ["top"],
        query: new Map([["hl", location.hl]]),
      };
    case "about":
      return {
        pathSegments: ["about"],
        query: new Map([["hl", location.hl]]),
      };
    case "file":
      return {
        pathSegments: ["file", location.hash],
        query: new Map(),
      };
  }
};
