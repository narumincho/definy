import * as commonUrl from "./common/url";
import * as data from "./data";
import { strict as strictAssert } from "assert";

commonUrl.urlDataAndAccountTokenFromUrl(new URL("https://definy.app/")).urlData,
  {
    clientMode: "Release",
    location: data.Location.Home,
    language: "English",
  },
  "https://definy.app/ is Home in English";

strictAssert.deepEqual(
  commonUrl.urlDataAndAccountTokenFromUrl(
    new URL("https://definy.app/project/580d8d6a54cf43e4452a0bba6694a4ed?hl=ja")
  ).urlData,
  {
    clientMode: "Release",
    location: data.Location.Project(
      "580d8d6a54cf43e4452a0bba6694a4ed" as data.ProjectId
    ),
    language: "Japanese",
  }
);
{
  const url = new URL(
    "http://localhost:2520/user/580d8d6a54cf43e4452a0bba6694a4ed?hl=eo#account-token=f81919b78537257302b50f776b77a90b984cc3d75fa899f9f460ff972dcc8cb0"
  );
  strictAssert.deepEqual(
    commonUrl.urlDataAndAccountTokenFromUrl(url).urlData,
    {
      clientMode: "DebugMode",
      location: data.Location.Account(
        "580d8d6a54cf43e4452a0bba6694a4ed" as data.AccountId
      ),
      language: "Esperanto",
    },
    "local host"
  );
}
{
  const url = new URL(
    "http://localhost:2520/user/580d8d6a54cf43e4452a0bba6694a4ed?hl=eo#account-token=f81919b78537257302b50f776b77a90b984cc3d75fa899f9f460ff972dcc8cb0"
  );
  strictAssert.deepEqual(
    commonUrl.urlDataAndAccountTokenFromUrl(url).accountToken,
    data.Maybe.Just(
      "f81919b78537257302b50f776b77a90b984cc3d75fa899f9f460ff972dcc8cb0" as data.AccountToken
    ),
    "accountToken"
  );
}
{
  const languageAndLocation: data.UrlData = {
    location: data.Location.Account(
      "580d8d6a54cf43e4452a0bba6694a4ed" as data.AccountId
    ),
    language: "Esperanto",
  };
  const url = commonUrl.urlDataAndAccountTokenToUrl(
    languageAndLocation,
    data.Maybe.Nothing()
  );
  const decodedLanguageAndLocation: data.UrlData = commonUrl.urlDataAndAccountTokenFromUrl(
    url
  ).urlData;
  strictAssert.deepEqual(
    languageAndLocation,
    decodedLanguageAndLocation,
    "encode, decode user url"
  );
}
