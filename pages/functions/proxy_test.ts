import { assertEquals } from "@std/assert";
import { proxyToBackend, shouldProxyToBackend } from "./[[path]].ts";

Deno.test("shouldProxyToBackend identifies Connect-RPC endpoints", () => {
  assertEquals(
    shouldProxyToBackend("/definy.v1.ProjectService/ListProjects"),
    true,
  );
  assertEquals(
    shouldProxyToBackend("/definy.v1.PreviewService/ListPreviewApps"),
    true,
  );
});

Deno.test("shouldProxyToBackend identifies preview and virtual endpoints", () => {
  assertEquals(shouldProxyToBackend("/preview/app-123/index.html"), true);
  assertEquals(shouldProxyToBackend("/virtual/wasm/sample.wasm"), true);
  assertEquals(shouldProxyToBackend("/swagger-ui"), true);
  assertEquals(shouldProxyToBackend("/api-docs/openapi.json"), true);
});

Deno.test("shouldProxyToBackend identifies exact backend paths", () => {
  assertEquals(shouldProxyToBackend("/mcp"), true);
  assertEquals(shouldProxyToBackend("/healthz"), true);
});

Deno.test("shouldProxyToBackend leaves static assets and SPA routes to Pages", () => {
  assertEquals(shouldProxyToBackend("/"), false);
  assertEquals(shouldProxyToBackend("/index.html"), false);
  assertEquals(shouldProxyToBackend("/assets/main.js"), false);
  assertEquals(shouldProxyToBackend("/wasm/definy_client_bg.wasm"), false);
  assertEquals(shouldProxyToBackend("/projects/abc"), false);
  assertEquals(shouldProxyToBackend("/settings"), false);
});

Deno.test("proxyToBackend returns 503 Connect error on connection failure", async () => {
  // 存在しないローカルポートを指定して接続失敗をシミュレート
  const req = new Request(
    "https://definy.pages.dev/definy.v1.ProjectService/ListProjects",
    {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({}),
    },
  );

  const res = await proxyToBackend(req, "http://127.0.0.1:59999");
  assertEquals(res.status, 503);
  assertEquals(res.headers.get("content-type"), "application/json");
  const json = await res.json();
  assertEquals(json.code, "unavailable");
});
