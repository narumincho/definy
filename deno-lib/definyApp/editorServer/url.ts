export const toOgpImageUrl = (query: ReadonlyMap<string, string>): string => {
  const params = new URLSearchParams();
  params.append("message", query.get("message") ?? "");
  const date = query.get("date");
  if (date !== undefined) {
    params.append("date", date);
  }
  params.append("random", query.get("random") ?? crypto.randomUUID());
  return "/clock-ogp-v2?" + params.toString();
};

export const extractOgpUrl = (
  url: URL,
): {
  readonly date: Date | undefined;
  readonly message: string | undefined;
} | undefined => {
  if (url.pathname !== "/clock-ogp-v2") {
    return undefined;
  }
  const date = new Date(url.searchParams.get("date") ?? "");
  return {
    message: url.searchParams.get("message") ?? undefined,
    date: Number.isNaN(date.getTime()) ? undefined : date,
  };
};
