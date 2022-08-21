import * as d from "../localData";
import * as s from "../staticResource";
import * as zodType from "./zodType";
import {
  StructuredUrl,
  structuredUrlToNodeUrlObject,
  structuredUrlToUrl,
  urlToStructuredUrl,
} from "../gen/url/main";
import type { UrlObject } from "url";
import { clientScriptPath } from "../clientScriptHash";

export const languageQueryKey = "hl";
export const defaultLanguage: d.Language = "English";

const origin =
  process.env.NODE_ENV === "development"
    ? "http://localhost:2520"
    : "https://definy.app";

export const locationAndLanguageToUrl = (
  locationAndLanguage: d.LocationAndLanguage
): URL => {
  return structuredUrlToUrl(origin, {
    path: locationToPathList(locationAndLanguage.location),
    searchParams: new Map<string, string>([
      [
        languageQueryKey,
        dataLanguageToQueryValue(locationAndLanguage.language),
      ],
    ]),
  });
};

export const zodTypeLocationAndLanguageToUrl = (
  location: zodType.Location,
  language: zodType.Language
): UrlObject => {
  return {
    pathname: zodTypeLocationToPathList(location),
    query: {
      [languageQueryKey]: zodLanguageToQueryValue(language),
    },
  };
};

const zodTypeLocationToPathList = (location: zodType.Location): string => {
  switch (location.type) {
    case "home":
      return "/";
    case "tools":
      return "/tool";
    case "tool":
      if (location.value === "themeColorRainbow") {
        return "/tool/theme-color-rainbow";
      }
      return "/tool/sound-quiz";
    case "about":
      return "/about";
    case "new-account":
      return "/new-account";
    case "local-project":
      return "/local-project";
  }
};

export const locationAndLanguageToStructuredUrl = (
  locationAndLanguage: d.LocationAndLanguage
): StructuredUrl => {
  return {
    path: locationToPathList(locationAndLanguage.location),
    searchParams: new Map<string, string>([
      [
        languageQueryKey,
        dataLanguageToQueryValue(locationAndLanguage.language),
      ],
    ]),
  };
};

export const locationAndLanguageToNodeUrlObject = (
  locationAndLanguage: d.LocationAndLanguage
): UrlObject => {
  return structuredUrlToNodeUrlObject(
    locationAndLanguageToStructuredUrl(locationAndLanguage)
  );
};

export const dataLanguageToQueryValue = (language: d.Language): string => {
  switch (language) {
    case "English":
      return englishId;
    case "Japanese":
      return japaneseId;
    case "Esperanto":
      return esperantoId;
  }
};

export const zodLanguageToQueryValue = (language: zodType.Language): string => {
  switch (language) {
    case "english":
      return englishId;
    case "japanese":
      return japaneseId;
    case "esperanto":
      return esperantoId;
  }
};

export const queryValueToDataLanguage = (language: string): d.Language => {
  switch (language) {
    case englishId:
      return "English";
    case japaneseId:
      return "Japanese";
    case esperantoId:
      return "Esperanto";
  }
  return defaultLanguage;
};

export const queryValueToZodLanguage = (
  language: string | ReadonlyArray<string> | undefined
): zodType.Language => {
  switch (language) {
    case englishId:
      return "english";
    case japaneseId:
      return "japanese";
    case esperantoId:
      return "esperanto";
  }
  return zodType.defaultLanguage;
};

export const isValidLanguageQueryValue = (value: unknown): boolean => {
  if (typeof value !== "string") {
    return false;
  }
  return new Set([englishId, japaneseId, esperantoId]).has(value);
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
export const urlToUrlData = (
  url: Readonly<Pick<URL, "pathname" | "search">>
): d.UrlData => {
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

export const iconUrl: URL = new URL(`${origin}/${s.iconPng}`);
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

const englishId = "en";
const esperantoId = "eo";
const japaneseId = "ja";
