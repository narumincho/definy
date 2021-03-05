import * as d from "../data";
import { nowMode } from "../out";

export const origin =
  nowMode === d.Mode.Develop ? `http://localhost:2520` : "https://definy.app";

const languageQueryKey = "hl";
export const defaultLanguage: d.Language = "English";

export const urlDataAndAccountTokenToUrl = (
  urlData: d.UrlData,
  accountToken: d.Maybe<d.AccountToken>
): URL => {
  const url = new URL(origin);
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

const locationToPath = (location: d.Location): string => {
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

const languageToIdString = (language: d.Language): string => {
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
): { urlData: d.UrlData; accountToken: d.Maybe<d.AccountToken> } => {
  const languageId = url.searchParams.get(languageQueryKey);
  const language: d.Language =
    languageId === null ? defaultLanguage : languageFromIdString(languageId);
  return {
    urlData: {
      location: locationFromUrl(url.pathname),
      language,
    },
    accountToken: accountTokenFromUrl(url.hash),
  };
};

const locationFromUrl = (pathName: string): d.Location => {
  if (pathName === "/create-project") {
    return d.Location.CreateProject;
  }
  if (pathName === "/about") {
    return d.Location.About;
  }
  if (pathName === "/debug") {
    return d.Location.Debug;
  }
  if (pathName === "/setting") {
    return d.Location.Setting;
  }
  const projectResult = pathName.match(/^\/project\/(?<id>[0-9a-f]{32})$/u);
  if (projectResult !== null && projectResult.groups !== undefined) {
    return d.Location.Project(projectResult.groups.id as d.ProjectId);
  }
  const userResult = pathName.match(/^\/user\/(?<id>[0-9a-f]{32})$/u);
  if (userResult !== null && userResult.groups !== undefined) {
    return d.Location.Account(userResult.groups.id as d.AccountId);
  }
  const typePartResult = pathName.match(/^\/type-part\/(?<id>[0-9a-f]{32})$/u);
  if (typePartResult !== null && typePartResult.groups !== undefined) {
    return d.Location.TypePart(typePartResult.groups.id as d.TypePartId);
  }
  return d.Location.Home;
};

const languageFromIdString = (languageAsString: string): d.Language => {
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

const accountTokenFromUrl = (hash: string): d.Maybe<d.AccountToken> => {
  const matchResult = hash.match(/account-token=(?<token>[0-9a-f]{64})/u);
  if (matchResult === null || matchResult.groups === undefined) {
    return d.Maybe.Nothing();
  }
  return d.Maybe.Just(matchResult.groups.token as d.AccountToken);
};

export const iconUrl: URL = new URL(`${origin}/icon`);

export const pngFileUrl = (fileHash: d.ImageHash): URL =>
  new URL(`${origin}/pngFile/${fileHash}`);

export const apiUrl = (apiName: string): URL =>
  new URL(`${origin}/api/${apiName}`);

export const logInRedirectUri = (
  openIdConnectProvider: d.OpenIdConnectProvider
): string => `${origin}/logInCallback/${openIdConnectProvider}`;
