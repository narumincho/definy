import * as data from "../data";

export const debugHostingPortNumber = 2520;

export const releaseOrigin = "https://definy.app";
export const debugOrigin = `http://localhost:${debugHostingPortNumber}`;

export const clientModeToOriginUrl = (clientMode: data.ClientMode): URL => {
  switch (clientMode) {
    case "Develop": {
      return new URL(debugOrigin);
    }
    case "Release":
      return new URL(releaseOrigin);
  }
};

const languageQueryKey = "hl";
export const defaultLanguage: data.Language = "English";

export const urlDataAndAccountTokenToUrl = (
  urlData: data.UrlData,
  accountToken: data.Maybe<data.AccountToken>
): URL => {
  const url = clientModeToOriginUrl(urlData.clientMode);
  url.pathname = locationToPath(urlData.location);
  url.searchParams.append(
    languageQueryKey,
    languageToIdString(urlData.language)
  );
  if (accountToken._ === "Just") {
    url.hash = "account-token=" + (accountToken.value as string);
  }
  return url;
};

const locationToPath = (location: data.Location): string => {
  switch (location._) {
    case "Home":
      return "/";
    case "CreateProject":
      return "/create-project";
    case "Account":
      return "/user/" + (location.accountId as string);
    case "Project":
      return "/project/" + (location.projectId as string);
    case "Setting":
      return "/setting/";
    case "About":
      return "/about";
    case "Debug":
      return "/debug";
    case "TypePart":
      return "/type-part/" + location.typePartId;
  }
};

const languageToIdString = (language: data.Language): string => {
  switch (language) {
    case "English":
      return "en";
    case "Japanese":
      return "ja";
    case "Esperanto":
      return "eo";
  }
};

/**
 * URLのパスを場所のデータに変換する
 * @param url `https://definy.app/project/580d8d6a54cf43e4452a0bba6694a4ed?hl=ja` のようなURL
 */
export const urlDataAndAccountTokenFromUrl = (
  url: URL
): { urlData: data.UrlData; accountToken: data.Maybe<data.AccountToken> } => {
  const languageId = url.searchParams.get(languageQueryKey);
  const language: data.Language =
    languageId === null ? defaultLanguage : languageFromIdString(languageId);
  return {
    urlData: {
      clientMode: clientModeFromUrl(url.origin),
      location: locationFromUrl(url.pathname),
      language,
    },
    accountToken: accountTokenFromUrl(url.hash),
  };
};

const clientModeFromUrl = (origin: string): data.ClientMode =>
  origin === releaseOrigin ? data.ClientMode.Release : data.ClientMode.Develop;

const locationFromUrl = (pathName: string): data.Location => {
  if (pathName === "/create-project") {
    return data.Location.CreateProject;
  }
  if (pathName === "/about") {
    return data.Location.About;
  }
  if (pathName === "/debug") {
    return data.Location.Debug;
  }
  if (pathName === "/setting") {
    return data.Location.Setting;
  }
  const projectResult = pathName.match(/^\/project\/(?<id>[0-9a-f]{32})$/u);
  if (projectResult !== null && projectResult.groups !== undefined) {
    return data.Location.Project(projectResult.groups.id as data.ProjectId);
  }
  const userResult = pathName.match(/^\/user\/(?<id>[0-9a-f]{32})$/u);
  if (userResult !== null && userResult.groups !== undefined) {
    return data.Location.Account(userResult.groups.id as data.AccountId);
  }
  const typePartResult = pathName.match(/^\/type-part\/(?<id>[0-9a-f]{32})$/u);
  if (userResult !== null && userResult.groups !== undefined) {
    return data.Location.TypePart(userResult.groups.id as data.TypePartId);
  }
  return data.Location.Home;
};

const languageFromIdString = (languageAsString: string): data.Language => {
  switch (languageAsString) {
    case "ja":
      return "Japanese";
    case "en":
      return "English";
    case "eo":
      return "Esperanto";
  }
  return defaultLanguage;
};

const accountTokenFromUrl = (hash: string): data.Maybe<data.AccountToken> => {
  const matchResult = hash.match(/account-token=(?<token>[0-9a-f]{64})/u);
  if (matchResult === null || matchResult.groups === undefined) {
    return data.Maybe.Nothing();
  }
  return data.Maybe.Just(matchResult.groups.token as data.AccountToken);
};
