import { Language, defaultLanguage } from "../common/zodType";
import {
  languageQueryKey,
  queryValueToZodLanguage,
  zodLanguageToQueryValue,
} from "../common/url";
import { useQueryBasedState } from "./useQueryBasedState";

/**
 * Next.js の `useRouter` から言語のパラメータ(`hl`)を受け取り, 余計なパラメータを削除する
 * @returns
 */
export const useLanguage = (): Language => {
  const state = useQueryBasedState<Language>({
    queryToStructuredQuery: (q) => queryValueToZodLanguage(q[languageQueryKey]),
    structuredQueryToQuery: (s) => ({
      [languageQueryKey]: zodLanguageToQueryValue(s),
    }),
    isEqual: (oldLanguage, newLanguage) => oldLanguage === newLanguage,
  });
  if (state.type === "loading") {
    return defaultLanguage;
  }
  return state.value;
};
