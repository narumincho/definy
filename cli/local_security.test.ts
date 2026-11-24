import { describe, expect, it } from "vitest";
import { checkLocalRequest, checkPublicRequest } from "./local_security.ts";

const options = { port: 8787, token: "secret" };
const request = (path: string, headers: Record<string, string>) =>
  new Request(`http://127.0.0.1:8787${path}`, { headers });

describe("checkLocalRequest", () => {
  it("127.0.0.1 と localhost の Host を受け付ける", () => {
    expect(
      checkLocalRequest(request("/", { Host: "127.0.0.1:8787" }), options),
    ).toBeUndefined();
    expect(
      checkLocalRequest(request("/", { Host: "localhost:8787" }), options),
    ).toBeUndefined();
  });

  it("他の Host (DNS rebinding) やポートは 403", () => {
    expect(
      checkLocalRequest(request("/", { Host: "evil.example:8787" }), options)
        ?.status,
    ).toBe(403);
    expect(
      checkLocalRequest(request("/", { Host: "127.0.0.1:9999" }), options)
        ?.status,
    ).toBe(403);
  });

  it("他のサイトの Origin は 403", () => {
    for (const origin of [
      "https://evil.example",
      "http://127.0.0.1:9999",
      "https://127.0.0.1:8787",
      "null",
    ]) {
      expect(
        checkLocalRequest(
          request("/", { Host: "127.0.0.1:8787", Origin: origin }),
          options,
        )?.status,
      ).toBe(403);
    }
    expect(
      checkLocalRequest(
        request("/", {
          Host: "127.0.0.1:8787",
          Origin: "http://localhost:8787",
        }),
        options,
      ),
    ).toBeUndefined();
  });

  it("/mcp はトークンが要る", () => {
    const host = { Host: "127.0.0.1:8787" };
    expect(checkLocalRequest(request("/mcp", host), options)?.status).toBe(401);
    expect(
      checkLocalRequest(
        request("/mcp", { ...host, Authorization: "Bearer wrong" }),
        options,
      )?.status,
    ).toBe(401);
    expect(
      checkLocalRequest(
        request("/mcp", { ...host, Authorization: "Bearer secret" }),
        options,
      ),
    ).toBeUndefined();
  });
});

describe("checkPublicRequest", () => {
  const publicOptions = { port: 8788, publicHosts: ["definy.example.com"] };
  const get = (host: string, method = "GET") =>
    new Request("http://127.0.0.1:8788/", { method, headers: { Host: host } });

  it("公開するホスト名と手元の Host の GET と HEAD を受け付ける", () => {
    expect(
      checkPublicRequest(get("definy.example.com"), publicOptions),
    ).toBeUndefined();
    expect(
      checkPublicRequest(get("127.0.0.1:8788", "HEAD"), publicOptions),
    ).toBeUndefined();
  });

  it("他の Host は 403", () => {
    expect(checkPublicRequest(get("evil.example"), publicOptions)?.status).toBe(
      403,
    );
  });

  it("GET と HEAD 以外は 405 (読み取り専用)", () => {
    for (const method of ["POST", "PUT", "DELETE"]) {
      expect(
        checkPublicRequest(get("definy.example.com", method), publicOptions)
          ?.status,
      ).toBe(405);
    }
  });
});
