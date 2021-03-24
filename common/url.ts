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
  url.pathname = createPath(locationToPathList(urlData.location));
  url.searchParams.append(
    languageQueryKey,
    languageToIdString(urlData.language)
  );
  if (accountToken._ === "Just") {
    url.hash = "account-token=" + (accountToken.value as string);
  }
  return url;
};

const locationToPathList = (location: d.Location): ReadonlyArray<string> => {
  switch (location._) {
    case "Home":
      return [];
    case "CreateProject":
      return [createProjectPath];
    case "Account":
      return [accountPath, location.accountId];
    case "Project":
      return [projectPath, location.projectId];
    case "Setting":
      return [settingPath];
    case "About":
      return [aboutPath];
    case "TypePart":
      return [typePartPath, location.typePartId];
  }
};

const languageToIdString = (language: d.Language): string => {
  switch (language) {
    case "English":
      return englishId;
    case "Japanese":
      return japaneseId;
    case "Esperanto":
      return esperantoId;
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
  const pathList = pathName.split("/");
  switch (pathList[1]) {
    case createProjectPath:
      return d.Location.CreateProject;
    case aboutPath:
      return d.Location.About;
    case settingPath:
      return d.Location.Setting;
    case projectPath:
      if (typeof pathName[2] === "string") {
        return d.Location.Project(pathName[2] as d.ProjectId);
      }
      return d.Location.Home;

    case accountPath:
      if (typeof pathName[2] === "string") {
        return d.Location.Account(pathName[2] as d.AccountId);
      }
      return d.Location.Home;

    case typePartPath:
      if (typeof pathName[2] === "string") {
        return d.Location.TypePart(pathName[2] as d.TypePartId);
      }
      return d.Location.Home;
  }
  return d.Location.Home;
};

const languageFromIdString = (languageAsString: string): d.Language => {
  switch (languageAsString) {
    case japaneseId:
      return "Japanese";
    case englishId:
      return "English";
    case esperantoId:
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

const createProjectPath = "create-project";
const aboutPath = "about";
const settingPath = "setting";
const projectPath = "project";
const accountPath = "account";
const typePartPath = "type-part";
const japaneseId = "ja";
const englishId = "en";
const esperantoId = "eo";

/**
 * パスを宣言的に作成する
 * @param path パス
 */
const createPath = (pathList: ReadonlyArray<string>): string => {
  return "/" + pathList.join("/");
};
