import * as d from "../localData";
import {
  english,
  englishId,
  esperanto,
  esperantoId,
  japanese,
  japaneseId,
  languageToIdString,
} from "../output/TypeScriptEntryPoint";
import { structuredUrlToUrl, urlToStructuredUrl } from "../gen/url/main";
import { clientScriptPath } from "../clientScriptHash";
import { origin } from "../out";

const languageQueryKey = "hl";
export const defaultLanguage: d.Language = "English";

export const locationAndLanguageToUrl = (
  locationAndLanguage: d.LocationAndLanguage
): URL => {
  return structuredUrlToUrl(origin, {
    path: locationToPathList(locationAndLanguage.location),
    searchParams: new Map<string, string>([
      [
        languageQueryKey,
        languageToIdString(
          dataLanguageToPureLanguage(locationAndLanguage.language)
        ),
      ],
    ]),
  });
};

const dataLanguageToPureLanguage = (language: d.Language) => {
  switch (language) {
    case "English":
      return english;
    case "Japanese":
      return japanese;
    case "Esperanto":
      return esperanto;
  }
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
    case "ToolList":
      return [toolPath];
    case "Tool":
      return [toolPath, toolToPath(location.toolName)];
  }
};

const toolToPath = (toolName: d.ToolName): string => {
  switch (toolName) {
    case "ThemeColorRainbow":
      return toolThemeColorRainbow;
    case "SoundQuiz":
      return toolSoundQuiz;
  }
};

/**
 * URLのパスを場所のデータに変換する
 * @param url `https://definy.app/project/580d8d6a54cf43e4452a0bba6694a4ed?hl=ja` のようなURL
 */
export const urlToUrlData = (url: URL): d.UrlData => {
  const structuredUrl = urlToStructuredUrl(url.pathname, url.search);
  if (
    structuredUrl.path[0] === "logInCallback" &&
    structuredUrl.path[1] === "Google"
  ) {
    const state = structuredUrl.searchParams.get("state");
    const code = structuredUrl.searchParams.get("code");
    if (typeof state === "string" && typeof code === "string") {
      return d.UrlData.LogInCallback({
        code,
        state,
        openIdConnectProvider: d.OpenIdConnectProvider.Google,
      });
    }
  }

  const languageId = structuredUrl.searchParams.get(languageQueryKey);

  return d.UrlData.Normal({
    location: locationFromUrl(structuredUrl.path),
    language:
      languageId === undefined
        ? defaultLanguage
        : languageFromIdString(languageId),
  });
};

const locationFromUrl = (path: ReadonlyArray<string>): d.Location => {
  switch (path[0]) {
    case createProjectPath:
      return d.Location.CreateProject;
    case aboutPath:
      return d.Location.About;
    case settingPath:
      return d.Location.Setting;
    case projectPath:
      if (typeof path[1] === "string") {
        return d.Location.Project(d.ProjectId.fromString(path[1]));
      }
      return d.Location.Home;

    case accountPath:
      if (typeof path[1] === "string") {
        return d.Location.Account(d.AccountId.fromString(path[1]));
      }
      return d.Location.Home;

    case typePartPath:
      if (typeof path[1] === "string") {
        return d.Location.TypePart(d.TypePartId.fromString(path[1]));
      }
      return d.Location.Home;

    case partPath:
      if (typeof path[1] === "string") {
        return d.Location.Part(d.PartId.fromString(path[1]));
      }
      return d.Location.Home;

    case localProjectPath:
      return d.Location.LocalProject;

    case toolPath:
      switch (path[1]) {
        case toolThemeColorRainbow:
          return d.Location.Tool(d.ToolName.ThemeColorRainbow);
        case toolSoundQuiz:
          return d.Location.Tool(d.ToolName.SoundQuiz);
      }
      return d.Location.ToolList;
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

export const iconUrl: URL = new URL(`${origin}/icon.png`);
export const scriptUrl: URL = new URL(`${origin}/${clientScriptPath}`);

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
const toolPath = "tool";
const toolThemeColorRainbow = "theme-color-rainbow";
const toolSoundQuiz = "sound-quiz";
