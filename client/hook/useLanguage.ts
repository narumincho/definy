import {
  dataLanguageToQueryValue,
  defaultLanguage,
  isValidLanguageQueryValue,
  languageQueryKey,
  queryValueToDataLanguage,
} from "../../common/url";
import type { Language } from "../../localData";
import { useEffect } from "react";
import { useRouter } from "next/router";

/**
 * Next.js の {@link useRouter} から言語のパラメータ(`hl`)を受け取り, 余計なパラメータを削除する
 * @returns
 */
export const useLanguage = (): Language => {
  const { replace, query } = useRouter();
  useEffect(() => {
    if (
      Object.entries(query).length !== 1 ||
      !isValidLanguageQueryValue(query[languageQueryKey])
    ) {
      replace({
        query: {
          [languageQueryKey]: dataLanguageToQueryValue(
            queryValueToLanguage(query[languageQueryKey])
          ),
        },
      });
    }
  }, [replace, query]);
  return queryValueToLanguage(query[languageQueryKey]);
};

const queryValueToLanguage = (queryValue: unknown): Language => {
  if (typeof queryValue === "string") {
    return queryValueToDataLanguage(queryValue);
  }
  return defaultLanguage;
};
