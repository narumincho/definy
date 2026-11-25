/**
 * Node.js 版のホスト `definy.node-host-script` (docs/raspberry-pi.md) のテスト.
 * seed の文字列を host.mjs に書いて別のプロセスで動かし, 手元の definy サーバーの `definy_run_io` から
 * `definy.deploy-node-host` で HTTP でデプロイし, `definy.replace-node-host` で置き換えられること
 */
import { spawn, type ChildProcess } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, describe, expect, it } from "vitest";
import { loadSeedModule } from "../src/seed_parts.ts";
import { startLocalServer } from "./serve.ts";

const workDir = await mkdtemp(join(tmpdir(), "definy-node-host-test-"));
afterAll(() => rm(workDir, { recursive: true, force: true }));

/** seed の文字列のパーツ (`definy.<name>`) の値 */
async function seedString(name: string): Promise<string> {
  const part = (await loadSeedModule("definy")).parts.find(
    (p) => p.name === name,
  );
  return (part!.expression as { readonly "#string": string })["#string"];
}

/** host.mjs を動かし, 待ち受けたポートを返す */
async function startHost(
  hostPath: string,
  dataDir: string,
): Promise<{ readonly origin: string; readonly child: ChildProcess }> {
  const child = spawn(
    process.execPath,
    [hostPath, "--port", "0", "--data-dir", dataDir],
    { stdio: ["ignore", "pipe", "inherit"] },
  );
  const origin = await new Promise<string>((resolve, reject) => {
    let output = "";
    child.stdout!.on("data", (chunk: Buffer) => {
      output += chunk.toString();
      const match = /on (http:\/\/127\.0\.0\.1:\d+)/.exec(output);
      if (match) resolve(match[1]!);
    });
    child.once("exit", (code) =>
      reject(new Error(`the host exited (${code}): ${output}`)),
    );
  });
  return { origin, child };
}

describe("Node.js 版のホスト (definy.node-host-script)", () => {
  it("HTTP でデプロイしたものを動かし, ホスト自身も置き換えられる", async () => {
    const hostPath = join(workDir, "host.mjs");
    const hostData = join(workDir, "host-data");
    const script = await seedString("node-host-script");
    await writeFile(hostPath, script);
    let host = await startHost(hostPath, hostData);
    try {
      expect((await fetch(host.origin + "/")).status).toBe(503);
      const token = (
        await readFile(join(hostData, "deploy-token"), "utf8")
      ).trim();
      expect((await fetch(host.origin + "/__definy/status")).status).toBe(401);

      // 手元のサーバーのシークレットに, ホストのトークンを入れておく
      const serverData = join(workDir, "server-data");
      const { mkdir } = await import("node:fs/promises");
      await mkdir(serverData, { recursive: true });
      await writeFile(
        join(serverData, "secrets.json"),
        JSON.stringify({
          "node-host-test-token": {
            label: "test",
            value: token,
            allowedUrlPrefixes: [host.origin + "/"],
            updatedMs: 0,
          },
        }),
        { mode: 0o600 },
      );
      const server = await startLocalServer({ dataDir: serverData, port: 0 });
      try {
        const runIo = async (expression: string) => {
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
              params: {
                name: "definy_run_io",
                arguments: { expression, project: "definy" },
              },
            }),
          });
          return (
            (await response.json()) as {
              readonly result: {
                readonly content: ReadonlyArray<{ readonly text: string }>;
              };
            }
          ).result.content[0]!.text;
        };
        const secret = `secret("node-host-test-token", "test", [${JSON.stringify(host.origin + "/")}])`;
        const deploy = (text: string) =>
          runIo(`@definy.deploy-node-host(
  url: ${JSON.stringify(host.origin)},
  api_token: ${secret},
  cron: "* * * * *",
  handler: quote({
    fetch: fn(request$0) =>
      #respond<@definy.service-io>({
        status: 200,
        headers: [{name: "content-type", value: "text/plain; charset=utf-8"}],
        body: #text<@definy.http-body>(@core.string-concat(left: ${JSON.stringify(text)}, right: $0.path))
      }),
    scheduled: fn(time_ms$1) =>
      #respond<@definy.service-io>({status: 200, headers: [], body: #text<@definy.http-body>("")})
  })
)`);

        expect(await deploy("first ")).toContain("done: デプロイしました");
        expect(await (await fetch(host.origin + "/a")).text()).toBe("first /a");
        expect(await deploy("second ")).toContain("done: デプロイしました");
        expect(await (await fetch(host.origin + "/b")).text()).toBe(
          "second /b",
        );

        const admin = (path: string, method: string) =>
          fetch(host.origin + path, {
            method,
            headers: { Authorization: `Bearer ${token}` },
          });
        expect((await admin("/__definy/rollback", "POST")).status).toBe(200);
        expect(await (await fetch(host.origin + "/c")).text()).toBe("first /c");
        const status = (await (
          await admin("/__definy/status", "GET")
        ).json()) as {
          readonly deployments: ReadonlyArray<string>;
          readonly cron: string;
        };
        expect(status.deployments.length).toBe(2);
        expect(status.cron).toBe("* * * * *");

        // 置き換えは新しい JS を確かめてから終了する (systemd などが起動し直す)
        const exited = new Promise<number | null>((resolve) =>
          host.child.once("exit", resolve),
        );
        expect(
          await runIo(
            `@definy.replace-node-host(url: ${JSON.stringify(host.origin)}, api_token: ${secret})`,
          ),
        ).toContain("done: ホストを置き換えました");
        expect(await exited).toBe(0);
        expect(await readFile(hostPath, "utf8")).toBe(script);
        expect(await readFile(join(workDir, "host.prev.mjs"), "utf8")).toBe(
          script,
        );

        // 起動し直しても, 前のデプロイ (戻したもの) のまま動く
        host = await startHost(hostPath, hostData);
        expect(await (await fetch(host.origin + "/d")).text()).toBe("first /d");
      } finally {
        await server.close();
      }
    } finally {
      host.child.kill();
    }
  }, 300_000);
});
