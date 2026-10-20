/**
 * パーツを Cloudflare Workers にデプロイするときの対象 (デプロイ設定と stage1 に渡す入力) を決める.
 * Worker (`worker/part_compiler.ts`) と seed バンドル生成 (`scripts/generate_seed_bundle.ts`) の両方で使うので,
 * Wasm の import などの環境依存は持たない
 */
import {
  bytesToUrlSafeBase64NoPad,
  encodeCborItem,
  sha256Bytes,
} from "./cbor.ts";
import type { Stage1ReferencedPart } from "./stage1_compiler.ts";

/** 式の中の `definy.deploy({ cloudflareToken, cloudflareWorkerName, handler })` の設定 */
export type DetectedDeploy = {
  readonly cloudflareToken: string | null;
  readonly cloudflareWorkerName: string;
  /** HTTP リクエストを受け取ってレスポンスを返す関数の式. 無いときはパーツの式全体をコンパイルする */
  readonly handler: unknown;
};

type AstNode = Readonly<Record<string, unknown>>;

function asNode(value: unknown): AstNode | undefined {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as AstNode)
    : undefined;
}

function stringLiteralValue(expression: unknown): string | undefined {
  const value = asNode(asNode(expression)?.String)?.value;
  return typeof value === "string" ? value : undefined;
}

const TOKEN_KEYS: ReadonlyArray<string> = [
  "cloudflareToken",
  "cloudflare_token",
  "token",
];
const WORKER_NAME_KEYS: ReadonlyArray<string> = [
  "cloudflareWorkerName",
  "cloudflare_worker_name",
  "workerName",
  "worker_name",
  "scriptName",
  "script_name",
];

function detectDeployInRecord(record: AstNode): DetectedDeploy | undefined {
  const items = Array.isArray(record.items)
    ? (record.items as ReadonlyArray<AstNode>)
    : [];
  let cloudflareToken: string | null = null;
  let cloudflareWorkerName: string | undefined;
  let handler: unknown = null;
  for (const item of items) {
    const key = item.key;
    if (typeof key !== "string") {
      continue;
    }
    if (TOKEN_KEYS.includes(key)) {
      cloudflareToken = stringLiteralValue(item.value) ?? cloudflareToken;
    } else if (WORKER_NAME_KEYS.includes(key)) {
      cloudflareWorkerName = stringLiteralValue(item.value)?.trim();
    } else if (key === "handler") {
      handler = item.value ?? null;
    }
  }
  if (!cloudflareWorkerName) {
    return undefined;
  }
  return { cloudflareToken, cloudflareWorkerName, handler };
}

/**
 * 式の中から Cloudflare Workers のデプロイ設定 (worker 名を持つレコード) を探す.
 * 旧 Rust 版の `definy_core::detect_deploy_in_expression` と同じく,
 * 呼び出しの引数・レコード・`let`・関数本体・`match` のアームをたどる
 */
export function detectDeployInExpression(
  expression: unknown,
): DetectedDeploy | undefined {
  const node = asNode(expression);
  if (node === undefined) {
    return undefined;
  }
  const record = asNode(node.TypeLiteral);
  if (record !== undefined) {
    return detectDeployInRecord(record);
  }
  const call = asNode(node.Call);
  if (call !== undefined) {
    const args = Array.isArray(call.arguments)
      ? (call.arguments as ReadonlyArray<AstNode>)
      : [];
    for (const arg of args) {
      const argRecord = asNode(asNode(arg.value)?.TypeLiteral);
      const detected =
        argRecord === undefined ? undefined : detectDeployInRecord(argRecord);
      if (detected !== undefined) {
        return detected;
      }
    }
    return (
      detectDeployInExpression(call.function) ??
      args.map((arg) => detectDeployInExpression(arg.value)).find(Boolean)
    );
  }
  const letNode = asNode(node.Let);
  if (letNode !== undefined) {
    const bindings = Array.isArray(letNode.bindings)
      ? (letNode.bindings as ReadonlyArray<AstNode>)
      : [];
    return (
      detectDeployInExpression(letNode.body) ??
      bindings
        .map((binding) => detectDeployInExpression(binding.value))
        .find(Boolean)
    );
  }
  const functionNode = asNode(node.Function);
  if (functionNode !== undefined) {
    return detectDeployInExpression(functionNode.body);
  }
  const matchNode = asNode(node.Match);
  if (matchNode !== undefined) {
    const arms = Array.isArray(matchNode.arms)
      ? (matchNode.arms as ReadonlyArray<AstNode>)
      : [];
    return (
      arms.map((arm) => detectDeployInExpression(arm.body)).find(Boolean) ??
      detectDeployInExpression(matchNode.default)
    );
  }
  return undefined;
}

/** デプロイするときに stage1 でコンパイルする式. デプロイ設定に `handler` があればそれ, 無ければ式全体 */
export function deployTargetExpression(expression: unknown): {
  readonly target: unknown;
  readonly deploy: DetectedDeploy | undefined;
} {
  const deploy = detectDeployInExpression(expression);
  return {
    target: deploy?.handler != null ? deploy.handler : expression,
    deploy,
  };
}

/** CAS 上で stage1 のコンパイル結果をキャッシュするときのキーの接頭辞 */
export const STAGE1_OUTPUT_CACHE_PREFIX = "stage1-output:";

/**
 * stage1 のコンパイル結果のキャッシュキー. stage1 の出力は入力 (式と参照パーツ) だけで決まるので, その CBOR の SHA-256 にする.
 * `wasm/stage1.wasm` を変えたら `npm run build:seeds` で seed バンドル内のキャッシュも作り直すこと
 */
export async function stage1OutputCacheKey(
  expression: unknown,
  parts: ReadonlyArray<Stage1ReferencedPart>,
): Promise<string> {
  const input = encodeCborItem([
    expression,
    parts.map((part) => [part.id, part.expression]),
  ]);
  return `${STAGE1_OUTPUT_CACHE_PREFIX}${bytesToUrlSafeBase64NoPad(
    await sha256Bytes(input),
  )}`;
}
