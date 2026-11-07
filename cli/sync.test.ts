import { mkdtemp, rm } from "node:fs/promises";
import { request as httpRequest } from "node:http";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, describe, expect, it } from "vitest";
import { startLocalServer } from "./serve.ts";

const dirs: Array<string> = [];
afterAll(() =>
  Promise.all(dirs.map((dir) => rm(dir, { recursive: true, force: true }))),
);
const newDataDir = async () => {
  const dir = await mkdtemp(join(tmpdir(), "definy-sync-test-"));
  dirs.push(dir);
  return dir;
};

/** 手元のサーバーの /mcp のツールを呼び, 結果のテキストを返す */
function callTool(
  server: { readonly origin: string; readonly token: string },
  name: string,
  args: unknown,
): Promise<{ readonly text: string; readonly isError: boolean }> {
  return new Promise((resolve, reject) => {
    const req = httpRequest(
      `${server.origin}/mcp`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${server.token}`,
        },
      },
      (res) => {
        let text = "";
        res.setEncoding("utf8");
        res.on("data", (chunk: string) => (text += chunk));
        res.on("end", () => {
          const result = (
            JSON.parse(text) as {
              result: {
                content: ReadonlyArray<{ text: string }>;
                isError?: boolean;
              };
            }
          ).result;
          resolve({
            text: result.content[0]?.text ?? "",
            isError: result.isError === true,
          });
        });
      },
    );
    req.on("error", reject);
    req.end(
      JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "tools/call",
        params: { name, arguments: args },
      }),
    );
  });
}

const commitDouble = (
  server: { readonly origin: string; readonly token: string },
  branch: string,
) =>
  callTool(server, "definy_create_branch", { project: "sample", branch }).then(
    () =>
      callTool(server, "definy_commit_parts", {
        project: "sample",
        branch,
        changes: [
          {
            part: "local.double",
            type: "Fn(value: Number) -> Number",
            expression: "fn(value$0) => @core.plus(left: $0, right: $0)",
          },
        ],
      }),
  );

describe("definy_pull / definy_push (サーバーどうしの同期)", () => {
  it("相手に無いイベントだけを中身ごと送り合う", async () => {
    const remote = await startLocalServer({
      dataDir: await newDataDir(),
      port: 0,
      accountName: "remote",
    });
    const local = await startLocalServer({
      dataDir: await newDataDir(),
      port: 0,
      accountName: "local",
    });
    try {
      expect((await commitDouble(remote, "r")).text).toContain(
        "Committed 1 part changes",
      );

      // 相手のブランチを取り込むと, そのパーツを読める
      const pulled = await callTool(local, "definy_pull", {
        remote: `${remote.origin}/`,
      });
      expect(pulled).toEqual({
        text: expect.stringMatching(/^Pulled ([1-9]\d*) of \1 events \(/),
        isError: false,
      });
      expect(
        (
          await callTool(local, "definy_get_part", {
            project: "sample",
            branch: "r",
            part: "local.double",
          })
        ).text,
      ).toContain("Fn(value: Number) -> Number");
      // 2 回目は取り込むものが無い
      expect(
        (await callTool(local, "definy_pull", { remote: remote.origin })).text,
      ).toBe(`Pulled 0 of 0 events (${remote.origin})`);

      // 自分のアカウントのイベントだけを送る (取り込んだ相手のイベントは送らない)
      expect((await commitDouble(local, "l")).text).toContain(
        "Committed 1 part changes",
      );
      const pushed = await callTool(local, "definy_push", {
        remote: remote.origin,
      });
      expect(pushed).toEqual({
        text: expect.stringMatching(/^Pushed ([1-9]\d*) of \1 events \(/),
        isError: false,
      });
      expect(
        (
          await callTool(remote, "definy_get_part", {
            project: "sample",
            branch: "l",
            part: "local.double",
          })
        ).text,
      ).toContain("Fn(value: Number) -> Number");
      expect(
        (await callTool(local, "definy_push", { remote: remote.origin })).text,
      ).toBe(`Pushed 0 of 0 events (${remote.origin})`);
    } finally {
      await Promise.all([remote.close(), local.close()]);
    }
  }, 120_000);

  it("相手に届かなければエラーを返す", async () => {
    const local = await startLocalServer({
      dataDir: await newDataDir(),
      port: 0,
    });
    try {
      const pulled = await callTool(local, "definy_pull", {
        remote: "http://127.0.0.1:1",
      });
      expect(pulled.isError).toBe(true);
      expect(pulled.text).toContain("Could not reach http://127.0.0.1:1");
    } finally {
      await local.close();
    }
  }, 60_000);
});
