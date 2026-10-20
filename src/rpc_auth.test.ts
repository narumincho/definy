import { describe, expect, it } from "vitest";
import { generateAccountCredentials } from "./auth.ts";
import {
  createRpcAuthorization,
  RPC_AUTHORIZATION_MAX_SKEW_SECONDS,
  verifyRpcAuthorization,
} from "./rpc_auth.ts";

const path = "/definy.v1.DeployService/DeployCloudflare";
const body = JSON.stringify({ partId: "x" });
const now = 1_800_000_000;

describe("rpc authorization", () => {
  it("returns the signer account for a valid header", async () => {
    const creds = await generateAccountCredentials("admin");
    const header = await createRpcAuthorization(creds, "POST", path, body, now);
    await expect(
      verifyRpcAuthorization(header, "POST", path, body, now),
    ).resolves.toBe(creds.accountId);
  });

  it("returns null when the header is missing", async () => {
    await expect(
      verifyRpcAuthorization(null, "POST", path, body, now),
    ).resolves.toBeNull();
  });

  it("rejects a different body, path, or method", async () => {
    const creds = await generateAccountCredentials("admin");
    const header = await createRpcAuthorization(creds, "POST", path, body, now);
    await expect(
      verifyRpcAuthorization(header, "POST", path, "{}", now),
    ).rejects.toThrow();
    await expect(
      verifyRpcAuthorization(header, "POST", "/other", body, now),
    ).rejects.toThrow();
    await expect(
      verifyRpcAuthorization(header, "GET", path, body, now),
    ).rejects.toThrow();
  });

  it("rejects headers outside the allowed clock skew", async () => {
    const creds = await generateAccountCredentials("admin");
    const header = await createRpcAuthorization(creds, "POST", path, body, now);
    await expect(
      verifyRpcAuthorization(
        header,
        "POST",
        path,
        body,
        now + RPC_AUTHORIZATION_MAX_SKEW_SECONDS + 1,
      ),
    ).rejects.toThrow();
  });

  it("rejects a header signed by another account", async () => {
    const creds = await generateAccountCredentials("admin");
    const other = await generateAccountCredentials("other");
    const header = await createRpcAuthorization(creds, "POST", path, body, now);
    const forged = header.replace(creds.accountId, other.accountId);
    await expect(
      verifyRpcAuthorization(forged, "POST", path, body, now),
    ).rejects.toThrow();
  });
});
