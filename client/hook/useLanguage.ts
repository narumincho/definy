import {
  defaultLanguage,
  languageQueryKey,
  queryValueToDataLanguage,
} from "../../common/url";
import { Language } from "../../localData";
import { useRouter } from "next/router";

export const useLanguage = (): Language => {
  const route = useRouter();
  const queryValue = route.query[languageQueryKey];
  if (typeof queryValue === "string") {
    return queryValueToDataLanguage(queryValue);
  }
  return defaultLanguage;
};
