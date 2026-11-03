import { expect, test } from "vitest";
import { fetchIpVersion } from "./healthz.ts";

function jsonResponse(body: unknown, ok = true): Pick<Response, "ok" | "json"> {
  return {
    ok,
    json: () => Promise.resolve(body),
  };
}

test("healthz の ipVersion をそのまま返す", async () => {
  await expect(
    fetchIpVersion(() => Promise.resolve(jsonResponse({ ipVersion: "ipv6" }))),
  ).resolves.toBe("ipv6");
  await expect(
    fetchIpVersion(() => Promise.resolve(jsonResponse({ ipVersion: "ipv4" }))),
  ).resolves.toBe("ipv4");
});

test("ipVersion が無い・想定外の値なら unknown", async () => {
  await expect(
    fetchIpVersion(() => Promise.resolve(jsonResponse({ status: "ok" }))),
  ).resolves.toBe("unknown");
  await expect(
    fetchIpVersion(() => Promise.resolve(jsonResponse({ ipVersion: "ipv5" }))),
  ).resolves.toBe("unknown");
});

test("HTTP エラーや取得の失敗は unknown", async () => {
  await expect(
    fetchIpVersion(() =>
      Promise.resolve(jsonResponse({ ipVersion: "ipv6" }, false)),
    ),
  ).resolves.toBe("unknown");
  await expect(
    fetchIpVersion(() => Promise.reject(new Error("network error"))),
  ).resolves.toBe("unknown");
  await expect(
    fetchIpVersion(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.reject(new Error("not json")),
      }),
    ),
  ).resolves.toBe("unknown");
});

test("時間内に返らなければ abort して unknown (「...」のまま止まらない)", async () => {
  let aborted = false;
  const hangingFetch = (
    _input: string,
    init?: RequestInit,
  ): Promise<Pick<Response, "ok" | "json">> =>
    new Promise((_resolve, reject) => {
      init?.signal?.addEventListener("abort", () => {
        aborted = true;
        reject(new Error("aborted"));
      });
    });
  await expect(fetchIpVersion(hangingFetch, 10)).resolves.toBe("unknown");
  expect(aborted).toBe(true);
});
