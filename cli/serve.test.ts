import {
  mkdir,
  mkdtemp,
  readFile,
  rm,
  stat,
  writeFile,
} from "node:fs/promises";
import { request as httpRequest } from "node:http";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, describe, expect, it } from "vitest";
import { startLocalServer } from "./serve.ts";
import { generateAccountCredentials } from "../src/auth.ts";
import { base64ToBytes } from "../src/base64.ts";
import { fetchRunOptions, runIoOnServer } from "../src/wasi_io_browser.ts";

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
      // 手元のサーバーでは, ブランチのパーツを使う式を実行できる
      const ran = await post(
        server.origin,
        "/mcp",
        callTool("definy_run_expression", {
          project: "sample",
          branch: "w",
          expression: "@local.double(value: 21)",
        }),
        auth,
      );
      expect(JSON.parse(ran.body).result.content[0].text).toBe("42");
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
  it("イベント・アカウントの一覧, 参照を書き換える名前の変更, I/O をするプログラムの実行 (シークレットはデータフォルダの値)", async () => {
    const ioDataDir = join(dataDir, "io");
    await mkdir(ioDataDir, { recursive: true });
    await writeFile(
      join(ioDataDir, "secrets.json"),
      JSON.stringify({
        "test-secret": {
          label: "Test",
          value: "s3cret",
          allowedUrlPrefixes: ["https://example.com/"],
          updatedMs: 0,
        },
      }),
    );
    const requests: string[] = [];
    const server = await startLocalServer({
      dataDir: ioDataDir,
      port: 0,
      fetchFn: (input, init) => {
        const headers = new Headers(init?.headers);
        requests.push(`${String(input)} ${headers.get("authorization")}`);
        return Promise.resolve(
          new Response(`got ${headers.get("authorization")}`),
        );
      },
    });
    const auth = { Authorization: `Bearer ${server.token}` };
    const tool = async (name: string, args: unknown): Promise<string> =>
      (
        JSON.parse(
          (await post(server.origin, "/mcp", callTool(name, args), auth)).body,
        ) as { result: { content: ReadonlyArray<{ text: string }> } }
      ).result.content[0]?.text ?? "";
    try {
      await tool("definy_create_branch", { project: "sample", branch: "r" });
      const committed = await tool("definy_commit_parts", {
        project: "sample",
        branch: "r",
        message: "Add triple",
        changes: [
          {
            part: "local.triple",
            type: "Fn(value: Number) -> Number",
            expression:
              "fn(value$0) => @core.plus(left: $0, right: @core.plus(left: $0, right: $0))",
          },
          {
            part: "local.nine",
            type: "Number",
            expression: "@local.triple(value: 3)",
          },
        ],
      });
      expect(committed).toContain("Committed 2 part changes");

      const events = await tool("definy_list_events", { limit: 2 });
      expect(events).toContain("  project: sample");
      expect(events).toContain("  branch: r");
      expect(events).toContain("  message: Add triple");
      const hash = /^Event (\S+) project_commit/m.exec(events)?.[1] ?? "";
      const described = await tool("definy_describe_event", {
        eventHash: hash,
      });
      expect(described).toContain("    Add triple");
      expect(described).toContain("    local.triple");
      expect(await tool("definy_list_accounts", {})).toContain(
        `Account ${server.account.accountId} `,
      );

      expect(
        await tool("definy_find_references", {
          project: "sample",
          branch: "r",
          part: "local.triple",
        }),
      ).toContain("1 parts reference local.triple");
      const renamed = await tool("definy_rename_part", {
        project: "sample",
        branch: "r",
        part: "local.triple",
        to: "local.thrice",
      });
      expect(renamed).toContain("changed the references in 1 parts");
      expect(
        await tool("definy_run_expression", {
          project: "sample",
          branch: "r",
          expression: "@local.nine",
        }),
      ).toBe("9");

      const ran = await tool("definy_run_io", {
        expression: `#outgoing_request<@wasi.io>({
  request: {
    method: "GET",
    url: "https://example.com/x",
    headers: [],
    secret_headers: [{name: "authorization", prefix: "Bearer ", secret: secret("test-secret", "Test", ["https://example.com/"])}],
    body: []
  },
  then: fn(result$0) =>
    match $0 {
      #ok(response$1) =>
        #done<@wasi.io>($1.text),
      #error(message$2) =>
        #done<@wasi.io>($2)
    }
})`,
      });
      expect(ran).toContain("done: got Bearer s3cret");
      expect(ran).toContain("GET https://example.com/x");
      expect(requests).toEqual(["https://example.com/x Bearer s3cret"]);

      // ブラウザでコンパイルしたプログラムを RunService/RunIo でサーバーで動かす (手元の鍵のアカウントは管理者)
      const wasm = base64ToBytes(
        await tool("definy_compile_expression", {
          expression: `#outgoing_request<@wasi.io>({
  request: {method: "GET", url: "https://example.com/y", headers: [], secret_headers: [], body: []},
  then: fn(result$0) =>
    #done<@wasi.io>("sent")
})`,
        }),
      );
      const serverFetch = ((
        input: string | URL | Request,
        init?: RequestInit,
      ) => fetch(new URL(String(input), server.origin), init)) as typeof fetch;
      expect(await fetchRunOptions(server.account, serverFetch)).toEqual({
        administrator: true,
        serverRun: true,
      });
      expect(
        await runIoOnServer({ wasm, parts: [] }, server.account, serverFetch),
      ).toEqual({
        ok: true,
        message: "sent",
        steps: ["GET https://example.com/y (0 bytes) → 200"],
      });
      const other = await generateAccountCredentials("other");
      expect(
        (await runIoOnServer({ wasm, parts: [] }, other, serverFetch)).ok,
      ).toBe(false);
      expect(requests).toEqual([
        "https://example.com/x Bearer s3cret",
        "https://example.com/y null",
      ]);
    } finally {
      await server.close();
    }
  }, 120_000);
});
