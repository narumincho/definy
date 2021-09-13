import * as commonUrl from "../common/url";
import * as d from "../localData";
import * as lib from "./lib";
import { html as genHtml } from "../gen/main";
import { globalStyle } from "../common/globalStyle";

/**
 * OGP の 情報が含まれている HTML を返す
 */
export const generateHtml = async (
  urlData: d.UrlData
): Promise<{
  readonly htmlOption: genHtml.HtmlOption;
  readonly isNotFound: boolean;
}> => {
  const coverImageUrlAndDescription = await getCoverImageUrlAndDescription(
    urlData
  );
  return {
    htmlOption: {
      appName: "definy",
      pageName: "definy",
      iconUrl: commonUrl.iconUrl,
      coverImageUrl: coverImageUrlAndDescription.imageUrl,
      description: coverImageUrlAndDescription.description,
      scriptUrlList: [commonUrl.scriptUrl],
      twitterCard: "SummaryCard",
      language:
        urlData._ === "Normal"
          ? urlData.locationAndLanguage.language
          : d.Language.English,
      url: undefined,
      style: globalStyle,
      themeColor: undefined,
      children: [
        genHtml.div(
          {},
          loadingMessage(
            urlData._ === "Normal"
              ? urlData.locationAndLanguage.language
              : d.Language.English
          )
        ),
      ],
    },
    isNotFound: false,
  };
};

const getCoverImageUrlAndDescription = (
  urlData: d.UrlData
): Promise<{
  readonly imageUrl: URL;
  readonly description: string;
  readonly isNotFound: boolean;
}> => {
  switch (urlData._) {
    case "LogInCallback": {
      return Promise.resolve({
        imageUrl: commonUrl.iconUrl,
        description: "logInCallback...",
        isNotFound: false,
      });
    }
    case "Normal":
      return getCoverImageUrlAndDescriptionNormal(urlData.locationAndLanguage);
  }
};

const getCoverImageUrlAndDescriptionNormal = async ({
  location,
  language,
}: d.LocationAndLanguage): Promise<{
  imageUrl: URL;
  description: string;
  isNotFound: boolean;
}> => {
  switch (location._) {
    case "Project": {
      const projectResource = await lib.apiFunc.getProject(location.projectId);
      if (projectResource.data._ === "Just") {
        return {
          imageUrl: commonUrl.pngFileUrl(projectResource.data.value.imageHash),
          description:
            projectResource.data.value.name +
            " | definy で作られたプロジェクト",
          isNotFound: false,
        };
      }
      return {
        imageUrl: commonUrl.iconUrl,
        description: "不明なプロジェクト | definy",
        isNotFound: true,
      };
    }
    case "Account": {
      const user = await lib.apiFunc.getAccount(location.accountId);
      if (user.data._ === "Just") {
        return {
          imageUrl: commonUrl.pngFileUrl(user.data.value.imageHash),
          description: user.data.value.name + " | definy のアカウント",
          isNotFound: false,
        };
      }
      return {
        imageUrl: commonUrl.iconUrl,
        description: "不明なアカウント | definy",
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
          return "definy is Web App for Web App.";
      }
    })(),
    isNotFound: false,
  };
};

const loadingMessage = (language: d.Language): string => {
  switch (language) {
    case "English":
      return "Loading definy ...";
    case "Japanese":
      return "definyを読込中……";
    case "Esperanto":
      return "Ŝarĝante definy ...";
  }
};
