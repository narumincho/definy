import {
  clientIpVersion,
  handleWorkerRequest,
  isAdminAccount,
  isWorkerFirstPath,
  WorkerStore,
} from "./index.ts";
import type { Env } from "./types.ts";
import { assertEquals, Deno } from "./test_helpers.ts";

Deno.test("isWorkerFirstPath matches Connect-RPC and dynamic endpoints", () => {
  assertEquals(isWorkerFirstPath("/definy.v1.EventService/GetEvents"), true);
  assertEquals(isWorkerFirstPath("/definy.v1.EventService/GetEvent"), true);
  assertEquals(
    isWorkerFirstPath("/definy.v1.DeployService/DeployCloudflare"),
    true,
  );
  assertEquals(isWorkerFirstPath("/virtual/wasm/abc123.wasm"), true);
  assertEquals(isWorkerFirstPath("/healthz"), true);

  assertEquals(isWorkerFirstPath("/"), false);
  assertEquals(isWorkerFirstPath("/assets/definy-ui.js"), false);
});

Deno.test(
  "isAdminAccount checks DEFINY_ADMIN_ACCOUNT_IDS case-sensitively",
  () => {
    const env: Env = {
      DEFINY_ADMIN_ACCOUNT_IDS: "0123456789abcdef, FEEDBEEF-cafe_babe",
    };
    assertEquals(isAdminAccount("0123456789abcdef", env), true);
    assertEquals(isAdminAccount("FEEDBEEF-cafe_babe", env), true);
    assertEquals(isAdminAccount("feedbeef-cafe_babe", env), false);
    assertEquals(isAdminAccount("unknown_user", env), false);
    assertEquals(isAdminAccount("", env), false);
    assertEquals(isAdminAccount(undefined, {}), false);
  },
);

Deno.test(
  "clientIpVersion reads Cloudflare connecting IP headers",
  async () => {
    const withHeaders = (headers: Record<string, string>): Request =>
      new Request("https://definy.workers.dev/healthz", { headers });

    assertEquals(
      clientIpVersion(withHeaders({ "CF-Connecting-IP": "203.0.113.5" })),
      "ipv4",
    );
    assertEquals(
      clientIpVersion(withHeaders({ "CF-Connecting-IP": "2001:db8::1" })),
      "ipv6",
    );
    // Pseudo IPv4: CF-Connecting-IP は IPv4 に書き換わり、元の IPv6 が別ヘッダーに入る
    assertEquals(
      clientIpVersion(
        withHeaders({
          "CF-Connecting-IP": "240.0.0.1",
          "Cf-Connecting-IPv6": "2001:db8::1",
        }),
      ),
      "ipv6",
    );
    assertEquals(clientIpVersion(withHeaders({})), "unknown");

    const res = await handleWorkerRequest(
      withHeaders({ "CF-Connecting-IP": "2001:db8::1" }),
      {},
      new WorkerStore(),
    );
    const json = await res.json();
    assertEquals(json.ipVersion, "ipv6");
    assertEquals(JSON.stringify(json).includes("2001:db8"), false);
  },
);
