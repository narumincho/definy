import { bytesToBase64 } from "./store.ts";
import type {
  CloudflareWorkerItem,
  DeployCloudflareRequest,
  DeployCloudflareResponse,
  Env,
  ListCloudflareWorkersRequest,
  ListCloudflareWorkersResponse,
} from "./types.ts";

const DEFAULT_API_BASE_URL = "https://api.cloudflare.com/client/v4";

interface CloudflareApiErrorItem {
  readonly code: number;
  readonly message: string;
}

interface CloudflareApiResponse<T> {
  readonly success: boolean;
  readonly errors?: ReadonlyArray<CloudflareApiErrorItem>;
  readonly result?: T;
}

interface CloudflareAccountItem {
  readonly id: string;
  readonly name: string;
}

interface CloudflareSubdomainItem {
  readonly subdomain: string;
}

interface CloudflareWorkerSummary {
  readonly id: string;
  readonly created_on?: string;
  readonly modified_on?: string;
}

/**
 * デプロイ先の Cloudflare Worker で動作するエッジ ES Module スクリプトを生成する
 */
export function buildDefaultWorkerScript(
  wasmBytes?: Uint8Array,
): string {
  const wasmBase64 = wasmBytes ? bytesToBase64(wasmBytes) : "";
  const hasWasm = Boolean(wasmBytes && wasmBytes.byteLength > 0);

  return `const HAS_WASM = ${hasWasm ? "true" : "false"};
const WASM_BASE64 = "${wasmBase64}";

export default {
  async fetch(request) {
    const url = new URL(request.url);
    if (url.pathname === "/healthz") {
      return new Response(JSON.stringify({ status: "ok", runtime: "cloudflare-workers", has_wasm: HAS_WASM }), {
        headers: { "Content-Type": "application/json; charset=utf-8" },
      });
    }
    return new Response(
      JSON.stringify({
        service: "definy-edge-worker",
        path: url.pathname,
        has_wasm: HAS_WASM,
        wasm_base64_length: WASM_BASE64.length,
      }),
      {
        headers: { "Content-Type": "application/json; charset=utf-8" },
      },
    );
  },
};
`;
}

async function resolveAccountId(
  apiToken: string,
  explicitAccountId: string | undefined | null,
  apiBaseUrl: string,
  fetchFn: typeof fetch,
): Promise<string> {
  if (explicitAccountId && explicitAccountId.trim().length > 0) {
    return explicitAccountId.trim();
  }
  const res = await fetchFn(`${apiBaseUrl}/accounts`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${apiToken}`,
    },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(
      `Cloudflare accounts API failed (status ${res.status}): ${text}`,
    );
  }
  const parsed = (await res.json()) as CloudflareApiResponse<
    ReadonlyArray<CloudflareAccountItem>
  >;
  if (!parsed.success || !parsed.result || parsed.result.length === 0) {
    throw new Error("No Cloudflare accounts found for the provided API token");
  }
  return parsed.result[0].id;
}

async function getSubdomain(
  apiToken: string,
  accountId: string,
  apiBaseUrl: string,
  fetchFn: typeof fetch,
): Promise<string> {
  const res = await fetchFn(
    `${apiBaseUrl}/accounts/${accountId}/workers/subdomain`,
    {
      method: "GET",
      headers: {
        Authorization: `Bearer ${apiToken}`,
      },
    },
  );
  if (!res.ok) {
    return "workers.dev";
  }
  const parsed = (await res.json()) as CloudflareApiResponse<
    CloudflareSubdomainItem
  >;
  return parsed.result?.subdomain || "workers.dev";
}

/**
 * Cloudflare REST API v4 を呼び出して Worker スクリプトをデプロイする
 */
export async function deployWorkerToCloudflare(
  req: DeployCloudflareRequest,
  wasmBytes: Uint8Array | undefined,
  env: Env,
  fetchFn: typeof fetch = fetch,
  apiBaseUrl: string = DEFAULT_API_BASE_URL,
): Promise<DeployCloudflareResponse> {
  const apiToken = (req.api_token || env.CLOUDFLARE_API_TOKEN || "").trim();
  if (!apiToken) {
    throw new Error(
      "CLOUDFLARE_API_TOKEN is not configured and api_token was not provided",
    );
  }

  const accountId = await resolveAccountId(
    apiToken,
    req.account_id || env.CLOUDFLARE_ACCOUNT_ID,
    apiBaseUrl,
    fetchFn,
  );

  const randomSuffix = Math.floor(Math.random() * 0xffffffff)
    .toString(16)
    .padStart(8, "0");
  const scriptName = req.worker_name && req.worker_name.trim().length > 0
    ? req.worker_name.trim()
    : `definy-worker-${randomSuffix}`;

  const scriptContent = buildDefaultWorkerScript(wasmBytes);
  const metadata = JSON.stringify({ main_module: "worker.js" });

  const form = new FormData();
  form.append(
    "metadata",
    new Blob([metadata], { type: "application/json" }),
    "metadata.json",
  );
  form.append(
    "worker.js",
    new Blob([scriptContent], { type: "application/javascript+module" }),
    "worker.js",
  );

  const putRes = await fetchFn(
    `${apiBaseUrl}/accounts/${accountId}/workers/scripts/${scriptName}`,
    {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${apiToken}`,
      },
      body: form,
    },
  );

  if (!putRes.ok) {
    const errText = await putRes.text();
    throw new Error(
      `Cloudflare script upload failed (status ${putRes.status}): ${errText}`,
    );
  }

  // Enable workers.dev subdomain
  await fetchFn(
    `${apiBaseUrl}/accounts/${accountId}/workers/scripts/${scriptName}/subdomain`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ enabled: true }),
    },
  ).catch(() => undefined);

  const subdomain = await getSubdomain(
    apiToken,
    accountId,
    apiBaseUrl,
    fetchFn,
  );
  const publicUrl = subdomain === "workers.dev"
    ? `https://${scriptName}.workers.dev`
    : `https://${scriptName}.${subdomain}.workers.dev`;

  return {
    deployment_id: `cf-${scriptName}`,
    worker_name: scriptName,
    status: "succeeded",
    url: publicUrl,
    created_at: new Date().toISOString(),
    wasm_hash: req.wasm_hash ?? null,
  };
}

/**
 * Cloudflare REST API v4 を呼び出してアカウント内の Worker スクリプト一覧を取得する
 */
export async function listWorkersFromCloudflare(
  req: ListCloudflareWorkersRequest,
  env: Env,
  fetchFn: typeof fetch = fetch,
  apiBaseUrl: string = DEFAULT_API_BASE_URL,
): Promise<ListCloudflareWorkersResponse> {
  const apiToken = (req.api_token || env.CLOUDFLARE_API_TOKEN || "").trim();
  if (!apiToken) {
    return { workers: [] };
  }

  const accountId = await resolveAccountId(
    apiToken,
    req.account_id || env.CLOUDFLARE_ACCOUNT_ID,
    apiBaseUrl,
    fetchFn,
  );

  const res = await fetchFn(
    `${apiBaseUrl}/accounts/${accountId}/workers/scripts`,
    {
      method: "GET",
      headers: {
        Authorization: `Bearer ${apiToken}`,
      },
    },
  );
  if (!res.ok) {
    const errText = await res.text();
    throw new Error(
      `Cloudflare list workers failed (status ${res.status}): ${errText}`,
    );
  }

  const parsed = (await res.json()) as CloudflareApiResponse<
    ReadonlyArray<CloudflareWorkerSummary>
  >;
  const summaries = parsed.result ?? [];
  const subdomain = await getSubdomain(
    apiToken,
    accountId,
    apiBaseUrl,
    fetchFn,
  );

  const workers: CloudflareWorkerItem[] = summaries.map((w) => ({
    script_name: w.id,
    created_on: w.created_on ?? "",
    modified_on: w.modified_on ?? "",
    url: subdomain === "workers.dev"
      ? `https://${w.id}.workers.dev`
      : `https://${w.id}.${subdomain}.workers.dev`,
  }));

  return { workers };
}
