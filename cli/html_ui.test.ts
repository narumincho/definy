/**
 * 手元の definy サーバーの HTML の UI (`--ui-port`. docs/local-server.md) のテスト.
 * 本物の html-ui は公開サーバーから取り込むものなので, ここでは小さな html-ui.handle を作って確かめる
 */
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, describe, expect, it } from "vitest";
import { startLocalServer } from "./serve.ts";

const dataDir = await mkdtemp(join(tmpdir(), "definy-html-ui-test-"));
afterAll(() => rm(dataDir, { recursive: true, force: true }));

const handleType =
  "Fn(editable: Boolean, request: @definy.http-request) -> @definy.service-io";

/** 版の文字列, editable, リクエストのメソッド・パス・クエリ・本文を返す html-ui.handle */
const handleExpression = (version: string) => `fn(editable$0, request$1) =>
  #read_request_text<@definy.service-io>({
    then: fn(body$2) =>
      #respond<@definy.service-io>({
        status: 200,
        headers: [{name: "content-type", value: "text/plain; charset=utf-8"}],
        body: #text<@definy.http-body>(
          @core.string-join(
            items: [${JSON.stringify(version)}, match $0 { true => "editable", false => "read-only" }, $1.method, $1.path, $1.query, $2],
            separator: " "
          )
        )
      })
  })`;

describe("definy serve の HTML の UI", () => {
  it("ストアの html-ui.handle をコンパイルしてサーバーと同じ能力で動かし, main が進んだらコンパイルし直す", async () => {
    const server = await startLocalServer({ dataDir, port: 0, uiPort: 0 });
    const ui = server.uiOrigin!;
    try {
      // html-ui がまだ無ければ, 取り込むように伝える
      const missing = await fetch(ui + "/");
      expect(missing.status).toBe(503);
      expect(await missing.text()).toContain("definy_pull");

      const call = async (name: string, args: unknown) => {
        const response = await fetch(server.origin + "/mcp", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${server.token}`,
          },
          body: JSON.stringify({
            jsonrpc: "2.0",
            id: 1,
            method: "tools/call",
            params: { name, arguments: args },
          }),
        });
        const json = (await response.json()) as {
          readonly result: {
            readonly content: ReadonlyArray<{ readonly text: string }>;
            readonly isError: boolean;
          };
        };
        expect(json.result.isError, json.result.content[0]?.text).toBe(false);
      };
      const commit = (version: string) =>
        call("definy_commit_parts", {
          project: "html-ui",
          branch: "main",
          changes: [
            {
              part: "html-ui.handle",
              type: handleType,
              expression: handleExpression(version),
            },
          ],
        });
      await call("definy_create_project", { project: "html-ui" });
      await commit("v1");

      const first = await fetch(ui + "/p/x?q=a");
      expect(first.status).toBe(200);
      expect(await first.text()).toBe("v1 editable GET /p/x q=a ");
      // 他のオリジンに読ませるヘッダーは付けない
      expect(first.headers.get("access-control-allow-origin")).toBeNull();

      await commit("v2");
      expect(await (await fetch(ui + "/")).text()).toBe("v2 editable GET /  ");

      // 書き込みは同じオリジンのページからだけ受け付ける
      expect(
        (await fetch(ui + "/api/commit", { method: "POST", body: "x" })).status,
      ).toBe(403);
      expect(
        (
          await fetch(ui + "/api/commit", {
            method: "POST",
            headers: { Origin: "https://evil.example" },
            body: "x",
          })
        ).status,
      ).toBe(403);
      const posted = await fetch(ui + "/api/commit", {
        method: "POST",
        headers: { Origin: ui },
        body: "hello",
      });
      expect(await posted.text()).toBe("v2 editable POST /api/commit  hello");
    } finally {
      await server.close();
    }
  }, 120_000);
});
