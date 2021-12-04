// @ts-check
/* eslint-disable @typescript-eslint/no-var-requires */
/* eslint-disable @typescript-eslint/no-require-imports */

/**
 *
 * @param {ReadonlyArray<{key: string, value: string}>} queryList
 * @returns {string}
 */
exports.searchParamsToString = (queryList) => {
  return new URLSearchParams(queryList.map((e) => [e.key, e.value])).toString();
};
