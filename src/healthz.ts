/**
 * 設定画面に出す接続元の IP バージョン (`/healthz` の `ipVersion`. docs/healthz.md).
 * 取得できない・応答がおかしい・時間内に返らない場合は、画面が「...」のまま止まらないよう `unknown` にする
 */
export type IpVersion = "ipv4" | "ipv6" | "unknown";

/** `/healthz` の応答を待つ上限. これを超えたら `unknown` として表示を確定させる */
export const HEALTHZ_TIMEOUT_MS = 5000;

type FetchLike = (
  input: string,
  init?: RequestInit,
) => Promise<Pick<Response, "ok" | "json">>;

export async function fetchIpVersion(
  fetchFn: FetchLike = fetch,
  timeoutMs: number = HEALTHZ_TIMEOUT_MS,
): Promise<IpVersion> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => {
    controller.abort();
  }, timeoutMs);
  try {
    const res = await fetchFn("/healthz", { signal: controller.signal });
    if (!res.ok) {
      return "unknown";
    }
    const json = (await res.json()) as { readonly ipVersion?: unknown };
    return json.ipVersion === "ipv4" || json.ipVersion === "ipv6"
      ? json.ipVersion
      : "unknown";
  } catch {
    // ネットワークエラー, JSON でない応答, タイムアウト (abort) はすべて「不明」にする
    return "unknown";
  } finally {
    clearTimeout(timeoutId);
  }
}
