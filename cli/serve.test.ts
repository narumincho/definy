import { mkdtemp, readFile, rm, stat } from "node:fs/promises";
import { request as httpRequest } from "node:http";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, describe, expect, it } from "vitest";
import { startLocalServer } from "./serve.ts";

const dataDir = await mkdtemp(join(tmpdir(), "definy-serve-test-"));
afterAll(() => rm(dataDir, { recursive: true, force: true }));

/** fetch は Host を変えられないので node:http で送る */
function post(
  origin: string,
  path: string,
  body: unknown,
  headers: Record<string, string>,
): Promise<{ readonly status: number; readonly body: string }> {
  return new Promise((resolve, reject) => {
    const req = httpRequest(
      `${origin}${path}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json", ...headers },
      },
      (res) => {
        let text = "";
        res.setEncoding("utf8");
        res.on("data", (chunk: string) => (text += chunk));
        res.on("end", () =>
          resolve({ status: res.statusCode ?? 0, body: text }),
        );
      },
    );
    req.on("error", reject);
    req.end(JSON.stringify(body));
  });
}

const callTool = (name: string, args: unknown) => ({
  jsonrpc: "2.0",
  id: 1,
  method: "tools/call",
  params: { name, arguments: args },
});

describe("definy serve (手元の definy サーバー)", () => {
  it("トークン付きの /mcp で書き込みのツールを手元の鍵で使え, 止めても中身が残る", async () => {
    const server = await startLocalServer({ dataDir, port: 0 });
    const auth = { Authorization: `Bearer ${server.token}` };
    try {
      expect(
        (await post(server.origin, "/mcp", callTool("definy_whoami", {}), {}))
          .status,
      ).toBe(401);
      expect(
        (
          await post(server.origin, "/mcp", callTool("definy_whoami", {}), {
            ...auth,
            Host: "evil.example",
          })
        ).status,
      ).toBe(403);

      const whoami = await post(
        server.origin,
        "/mcp",
        callTool("definy_whoami", {}),
        auth,
      );
      expect(whoami.status).toBe(200);
      expect(whoami.body).toContain(server.account.accountId);

      const created = await post(
        server.origin,
        "/mcp",
        callTool("definy_create_branch", { project: "sample", branch: "w" }),
        auth,
      );
      expect(created.body).toContain('\\"status\\":\\"accepted\\"');
      const committed = await post(
        server.origin,
        "/mcp",
        callTool("definy_commit_parts", {
          project: "sample",
          branch: "w",
          changes: [
            {
              part: "local.double",
              type: "Fn(value: Number) -> Number",
              expression: "fn(value$0) => @core.plus(left: $0, right: $0)",
            },
          ],
        }),
        auth,
      );
      expect(committed.body).toContain("Committed 1 part changes");
    } finally {
      await server.close();
    }

    // 鍵とトークンは本人だけが読めるファイルに残り, 起動し直しても同じものを使う
    expect((await stat(join(dataDir, "account.json"))).mode & 0o777).toBe(
      0o600,
    );
    expect((await readFile(join(dataDir, "mcp-token"), "utf8")).trim()).toBe(
      server.token,
    );
    const restarted = await startLocalServer({ dataDir, port: 0 });
    try {
      expect(restarted.token).toBe(server.token);
      expect(restarted.account.accountId).toBe(server.account.accountId);
      const part = await post(
        restarted.origin,
        "/mcp",
        callTool("definy_get_part", {
          project: "sample",
          branch: "w",
          part: "local.double",
        }),
        { Authorization: `Bearer ${restarted.token}` },
      );
      expect(part.body).toContain("Fn(value: Number) -> Number");
    } finally {
      await restarted.close();
    }
  }, 60_000);
});
