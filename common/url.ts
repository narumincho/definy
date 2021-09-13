import * as d from "../localData";
import { origin } from "../out";

const languageQueryKey = "hl";
export const defaultLanguage: d.Language = "English";

export const locationAndLanguageToUrl = (
  locationAndLanguage: d.LocationAndLanguage
): URL => {
  const url = new URL(origin);
  url.pathname = createPath(locationToPathList(locationAndLanguage.location));
  url.searchParams.append(
    languageQueryKey,
    languageToIdString(locationAndLanguage.language)
  );
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
    case "Part":
      return [partPath, location.partId];
    case "LocalProject":
      return [localProjectPath];
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
export const urlToUrlData = (url: URL): d.UrlData => {
  const pathList = url.pathname.split("/");
  if (pathList[1] === "logInCallback" && pathList[2] === "Google") {
    const state = url.searchParams.get("state");
    const code = url.searchParams.get("code");
    if (typeof state === "string" && typeof code === "string") {
      return d.UrlData.LogInCallback({
        code,
        state,
        openIdConnectProvider: d.OpenIdConnectProvider.Google,
      });
    }
  }

  const languageId = url.searchParams.get(languageQueryKey);
  const language: d.Language =
    languageId === null ? defaultLanguage : languageFromIdString(languageId);
  return d.UrlData.Normal({
    location: locationFromUrl(url.pathname),
    language,
  });
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
      if (typeof pathList[2] === "string") {
        return d.Location.Project(d.ProjectId.fromString(pathList[2]));
      }
      return d.Location.Home;

    case accountPath:
      if (typeof pathList[2] === "string") {
        return d.Location.Account(d.AccountId.fromString(pathList[2]));
      }
      return d.Location.Home;

    case typePartPath:
      if (typeof pathList[2] === "string") {
        return d.Location.TypePart(d.TypePartId.fromString(pathList[2]));
      }
      return d.Location.Home;

    case partPath:
      if (typeof pathList[2] === "string") {
        return d.Location.Part(d.PartId.fromString(pathList[2]));
      }
      return d.Location.Home;

    case localProjectPath:
      return d.Location.LocalProject;
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
  if (
    matchResult === null ||
    matchResult.groups === undefined ||
    matchResult.groups.token === undefined
  ) {
    return d.Maybe.Nothing();
  }
  return d.Maybe.Just(d.AccountToken.fromString(matchResult.groups.token));
};

export const iconUrl: URL = new URL(`${origin}/icon.png`);
export const scriptUrl: URL = new URL(`${origin}/main.js`);

export const pngFileUrl = (imageHash: d.ImageHash): URL =>
  new URL(`${origin}${pngFilePath(imageHash)}`);

export const pngFilePath = (imageHash: d.ImageHash): string => {
  return `/pngFile/${imageHash}.png`;
};

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
const partPath = "part";
const localProjectPath = "local-project";
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
