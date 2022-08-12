import {
  dataLanguageToQueryValue,
  defaultLanguage,
  languageQueryKey,
  queryValueToDataLanguage,
} from "../../common/url";
import type { Language } from "../../localData";
import { useQueryBasedState } from "./useQueryBasedState";

/**
 * Next.js の `useRouter` から言語のパラメータ(`hl`)を受け取り, 余計なパラメータを削除する
 * @returns
 */
export const useLanguage = (): Language => {
  const state = useQueryBasedState({
    queryToStructuredQuery: (q) => queryValueToLanguage(q[languageQueryKey]),
    structuredQueryToQuery: (s) => ({
      [languageQueryKey]: dataLanguageToQueryValue(s),
    }),
  });
  return state ?? defaultLanguage;
};

const queryValueToLanguage = (queryValue: unknown): Language => {
  if (typeof queryValue === "string") {
    return queryValueToDataLanguage(queryValue);
  }
  return defaultLanguage;
};
