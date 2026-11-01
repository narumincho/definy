import { expect, it } from "vitest";
import {
  clientIpVersion,
  handleWorkerRequest,
  isWorkerFirstPath,
  WorkerStore,
} from "./index.ts";

it("isWorkerFirstPath matches Connect-RPC and dynamic endpoints", () => {
  expect(isWorkerFirstPath("/definy.v1.EventService/GetEvents")).toBe(true);
  expect(isWorkerFirstPath("/definy.v1.EventService/GetEvent")).toBe(true);
  expect(isWorkerFirstPath("/definy.v1.HttpProxyService/Fetch")).toBe(true);
  expect(isWorkerFirstPath("/virtual/wasm/abc123.wasm")).toBe(true);
  expect(isWorkerFirstPath("/healthz")).toBe(true);

  expect(isWorkerFirstPath("/")).toBe(false);
  expect(isWorkerFirstPath("/assets/definy-ui.js")).toBe(false);
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
