import {
  languageQueryKey,
  queryValueToZodLanguage,
  zodLanguageToQueryValue,
} from "../../common/url";
import { useQueryBasedState } from "./useQueryBasedState";
import { zodType } from "../../deno-lib/npm";

const languageStructuredQueryToQuery = (
  language: zodType.Language
): ReadonlyMap<string, string> =>
  new Map([[languageQueryKey, zodLanguageToQueryValue(language)]]);

const languageQueryToStructuredQuery = (
  query: ReadonlyMap<string, string>
): zodType.Language => queryValueToZodLanguage(query.get(languageQueryKey));

const languageIsEqual = (
  oldLanguage: zodType.Language,
  newLanguage: zodType.Language
): boolean => oldLanguage === newLanguage;

const onUpdate = (l: zodType.Language) => {
  console.log("言語の変更/設定を検知!", l);
};

/**
 * Next.js の `useRouter` から言語のパラメータ(`hl`)を受け取り, 余計なパラメータを削除する
 * @returns
 */
export const useLanguage = (): zodType.Language => {
  const state = useQueryBasedState<zodType.Language>({
    queryToStructuredQuery: languageQueryToStructuredQuery,
    structuredQueryToQuery: languageStructuredQueryToQuery,
    isEqual: languageIsEqual,
    onUpdate,
  });
  if (state.type === "loading") {
    return zodType.defaultLanguage;
  }
  return state.value;
};
