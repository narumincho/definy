import { describe, expect, it } from "vitest";
import { checkLocalRequest } from "./local_security.ts";

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
