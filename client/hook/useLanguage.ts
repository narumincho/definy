import { Language, defaultLanguage } from "../../common/zodType";
import {
  languageQueryKey,
  queryValueToZodLanguage,
  zodLanguageToQueryValue,
} from "../../common/url";
import { useQueryBasedState } from "./useQueryBasedState";

const languageStructuredQueryToQuery = (
  language: Language
): ReadonlyMap<string, string> =>
  new Map([[languageQueryKey, zodLanguageToQueryValue(language)]]);

const languageQueryToStructuredQuery = (
  query: ReadonlyMap<string, string>
): Language => queryValueToZodLanguage(query.get(languageQueryKey));

const languageIsEqual = (
  oldLanguage: Language,
  newLanguage: Language
): boolean => oldLanguage === newLanguage;

const onUpdate = (l: Language) => {
  console.log("言語の変更/設定を検知!", l);
};

/**
 * Next.js の `useRouter` から言語のパラメータ(`hl`)を受け取り, 余計なパラメータを削除する
 * @returns
 */
export const useLanguage = (): Language => {
  const state = useQueryBasedState<Language>({
    queryToStructuredQuery: languageQueryToStructuredQuery,
    structuredQueryToQuery: languageStructuredQueryToQuery,
    isEqual: languageIsEqual,
    onUpdate,
  });
  if (state.type === "loading") {
    return defaultLanguage;
  }
  return state.value;
};
