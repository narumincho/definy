import { URL, URLSearchParams } from "url";

export const urlFromString = (domainAndPath: string): URL =>
    new URL("https://" + domainAndPath);

export const urlFromStringWithQuery = (
    domainAndPath: string,
    query: Map<string, string>
): URL => {
    const url = new URL("https://" + domainAndPath);
    for (const [key, value] of query) {
        url.searchParams.append(key, value);
    }
    return url;
};

/**
 *
 * @param domainAndPath https://を除いたドメインとパス narumincho.com/path など
 * @param fragment URLSearchParamsとしてエンコードされる
 */
export const urlFromStringWithFragment = (
    domainAndPath: string,
    fragment: Map<string, string>
): URL => {
    const url = new URL("https://" + domainAndPath);
    url.hash = new URLSearchParams(fragment).toString();
    return url;
};

/**
 * 他の人が間違っても生成しないような文字列を生成する
 */
export const createRandomString = () => {
    let id = "";
    const charTable =
        "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";
    for (let i = 0; i < 30; i++) {
        id += charTable[(Math.random() * charTable.length) | 0];
    }
    return id;
};
