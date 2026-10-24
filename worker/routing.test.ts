import { expect, it } from "vitest";
import {
  clientIpVersion,
  handleWorkerRequest,
  isAdminAccount,
  isWorkerFirstPath,
  WorkerStore,
} from "./index.ts";
import type { Env } from "./types.ts";

it("isWorkerFirstPath matches Connect-RPC and dynamic endpoints", () => {
  expect(isWorkerFirstPath("/definy.v1.EventService/GetEvents")).toBe(true);
  expect(isWorkerFirstPath("/definy.v1.EventService/GetEvent")).toBe(true);
  expect(isWorkerFirstPath("/definy.v1.HttpProxyService/Fetch")).toBe(true);
  expect(isWorkerFirstPath("/virtual/wasm/abc123.wasm")).toBe(true);
  expect(isWorkerFirstPath("/healthz")).toBe(true);

  expect(isWorkerFirstPath("/")).toBe(false);
  expect(isWorkerFirstPath("/assets/definy-ui.js")).toBe(false);
});

it("isAdminAccount checks DEFINY_ADMIN_ACCOUNT_IDS case-sensitively", () => {
  const env: Env = {
    DEFINY_ADMIN_ACCOUNT_IDS: "0123456789abcdef, FEEDBEEF-cafe_babe",
  };
  expect(isAdminAccount("0123456789abcdef", env)).toBe(true);
  expect(isAdminAccount("FEEDBEEF-cafe_babe", env)).toBe(true);
  expect(isAdminAccount("feedbeef-cafe_babe", env)).toBe(false);
  expect(isAdminAccount("unknown_user", env)).toBe(false);
  expect(isAdminAccount("", env)).toBe(false);
  expect(isAdminAccount(undefined, {})).toBe(false);
});

it("clientIpVersion reads Cloudflare connecting IP headers", async () => {
  const withHeaders = (headers: Record<string, string>): Request =>
    new Request("https://definy.workers.dev/healthz", { headers });

  expect(
    clientIpVersion(withHeaders({ "CF-Connecting-IP": "203.0.113.5" })),
  ).toBe("ipv4");
  expect(
    clientIpVersion(withHeaders({ "CF-Connecting-IP": "2001:db8::1" })),
  ).toBe("ipv6");
  // Pseudo IPv4: CF-Connecting-IP は IPv4 に書き換わり、元の IPv6 が別ヘッダーに入る
  expect(
    clientIpVersion(
      withHeaders({
        "CF-Connecting-IP": "240.0.0.1",
        "Cf-Connecting-IPv6": "2001:db8::1",
      }),
    ),
  ).toBe("ipv6");
  expect(clientIpVersion(withHeaders({}))).toBe("unknown");

  const res = await handleWorkerRequest(
    withHeaders({ "CF-Connecting-IP": "2001:db8::1" }),
    {},
    new WorkerStore(),
  );
  const json = await res.json();
  expect(json.ipVersion).toBe("ipv6");
  expect(JSON.stringify(json).includes("2001:db8")).toBe(false);
});
