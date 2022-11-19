export const toOgpImageUrl = (text: string): string => {
  const params = new URLSearchParams();
  params.append("text", text);
  return "/clock-ogp?" + params.toString();
};

export const extractOgpUrl = (url: URL): string | undefined => {
  const text = url.searchParams.get("text");
  if (url.pathname === "/clock-ogp" && typeof text === "string") {
    return text;
  }
  return undefined;
};
