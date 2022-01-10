import * as commonUrl from "../common/url";
import * as d from "../localData";
import * as lib from "./lib";
import * as pLib from "../output/TypeScriptEntryPoint";
import { html as genHtml } from "../gen/main";
import { globalStyle } from "../common/globalStyle";
import { origin } from "../out";

/**
 * OGP の 情報が含まれている HTML を返す
 */
export const generateHtml = async (
  urlData: d.UrlData
): Promise<{
  readonly htmlAsString: string;
  readonly isNotFound: boolean;
}> => {
  const coverImageUrlAndDescription = await getCoverImageUrlAndDescription(
    urlData
  );
  return {
    htmlAsString: pLib.generateDefinyHtml({
      iconPath: commonUrl.iconUrl,
      coverImagePath: coverImageUrlAndDescription.imageUrl,
      description: coverImageUrlAndDescription.description,
      language:
        urlData._ === "Normal"
          ? pLib.just(
              tsLanguageToPureScriptLanguage(
                urlData.locationAndLanguage.language
              )
            )
          : pLib.nothing(),
      path:
        urlData._ === "Normal"
          ? pLib.just(
              commonUrl.locationAndLanguageToPLibPathAndSearchParams(
                urlData.locationAndLanguage
              )
            )
          : pLib.nothing(),
      origin: origin as pLib.NonEmptyString,
    }),
    isNotFound: false,
  };
};

const tsLanguageToPureScriptLanguage = (language: d.Language) => {
  switch (language) {
    case "Japanese":
      return pLib.japanese;
    case "English":
      return pLib.english;
    case "Esperanto":
      return pLib.esperanto;
  }
};

type ImageUrlAndDescription = {
  readonly imageUrl: pLib.PathAndSearchParams;
  readonly description: string;
  readonly isNotFound: boolean;
};

const getCoverImageUrlAndDescription = (
  urlData: d.UrlData
): Promise<ImageUrlAndDescription> => {
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
}: d.LocationAndLanguage): Promise<ImageUrlAndDescription> => {
  switch (location._) {
    case "Project": {
      const projectResource = await lib.apiFunc.getProject(location.projectId);
      if (projectResource.data._ === "Just") {
        return {
          imageUrl: commonUrl.pngFilePathAsPathAndSearchParams(
            projectResource.data.value.imageHash
          ),
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
          imageUrl: commonUrl.pngFilePathAsPathAndSearchParams(
            user.data.value.imageHash
          ),
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
