import * as commonUrl from "../common/url";
import * as d from "../data";
import * as lib from "./lib";
import * as nHtml from "@narumincho/html";
import { globalStyle } from "../common/globalStyle";

/**
 * OGP の 情報が含まれている HTML を返す
 */
export const html = async (
  urlData: d.UrlData,
  normalizedUrl: URL
): Promise<{ view: nHtml.view.View<never>; isNotFound: boolean }> => {
  const coverImageUrlAndDescription = await getCoverImageUrlAndDescription(
    urlData.location,
    urlData.language
  );
  return {
    view: {
      appName: "Definy",
      pageName: "Definy",
      iconPath: commonUrl.iconPath,
      coverImageUrl: coverImageUrlAndDescription.imageUrl,
      description: coverImageUrlAndDescription.description,
      scriptPath: "/main.js",
      styleUrlList: [],
      twitterCard: "SummaryCard",
      language: urlData.language,
      url: normalizedUrl,
      style: globalStyle,
      bodyClass: "dummy",
      themeColor: undefined,
      children: nHtml.view.childrenText(loadingMessage(urlData.language)),
    },
    isNotFound: false,
  };
};

const getCoverImageUrlAndDescription = async (
  location: d.Location,
  language: d.Language
): Promise<{ imageUrl: URL; description: string; isNotFound: boolean }> => {
  switch (location._) {
    case "Project": {
      const projectResource = await lib.apiFunc.getProject(location.projectId);
      if (projectResource.data._ === "Just") {
        return {
          imageUrl: commonUrl.pngFileUrl(projectResource.data.value.imageHash),
          description:
            projectResource.data.value.name +
            " | Definy で作られたプロジェクト",
          isNotFound: false,
        };
      }
      return {
        imageUrl: commonUrl.iconUrl,
        description: "不明なプロジェクト | Definy",
        isNotFound: true,
      };
    }
    case "Account": {
      const user = await lib.apiFunc.getAccount(location.accountId);
      if (user.data._ === "Just") {
        return {
          imageUrl: commonUrl.pngFileUrl(user.data.value.imageHash),
          description: user.data.value.name + " | Definy のアカウント",
          isNotFound: false,
        };
      }
      return {
        imageUrl: commonUrl.iconUrl,
        description: "不明なアカウント | Definy",
        isNotFound: true,
      };
    }
  }
  return {
    imageUrl: commonUrl.iconUrl,
    description: ((): string => {
      switch (language) {
        case "Japanese":
          return "ブラウザで動作する革新的なプログラミング言語!";
        case "Esperanto":
          return "Noviga programlingvo, kiu funkcias en la retumilo";
        case "English":
          return "Definy is Web App for Web App.";
      }
    })(),
    isNotFound: false,
  };
};

const loadingMessage = (language: d.Language): string => {
  switch (language) {
    case "English":
      return "Loading Definy ...";
    case "Japanese":
      return "Definyを読込中……";
    case "Esperanto":
      return "Ŝarĝante Definy ...";
  }
};
