/**
 * definy の Ed25519 署名およびアカウント管理ユーティリティ
 */

import {
  base64ToBytes,
  bytesToBase64,
  bytesToUrlSafeBase64NoPad,
  encodeCborItem,
  sha256EventHashId,
  type DecodedPart,
  type LocalizedText,
} from "./cbor.ts";
import {
  encodeEventContent,
  MAIN_BRANCH,
  type EventContent,
} from "./event_content.ts";
import type { ContentItem } from "./content_store.ts";

export type AccountCredentials = {
  readonly accountId: string;
  readonly accountName: string;
  readonly secretKeyBase64: string;
};

export type SignedEventResult = {
  readonly signedEventBytes: string;
  readonly eventHash: string;
};

export type SubmitEventResult = {
  readonly eventHash: string;
  readonly status: string;
  readonly missingContentHashes?: ReadonlyArray<string>;
};

/** プロジェクトのコミットに入れるモジュール */
export type CommitModuleParams = {
  readonly name: string;
  readonly description: LocalizedText;
  readonly parts: ReadonlyArray<DecodedPart>;
};

export type CreateProjectCommitParams = {
  readonly credentials: AccountCredentials;
  readonly projectName: string;
  /** コミットするブランチ. 省略すると `main` */
  readonly branch?: string;
  readonly projectDescription: LocalizedText;
  readonly message: string;
  readonly parentCommitHash?: string | null;
  /** 取り込む他のブランチのコミット (docs/branch.md「取り込み」) */
  readonly mergedCommitHash?: string | null;
  /** プロジェクトのモジュールすべて (docs/project.md) */
  readonly modules: ReadonlyArray<CommitModuleParams>;
};

const ED25519_PKCS8_HEADER: ReadonlyArray<number> = [
  0x30, 0x2e, 0x02, 0x01, 0x00, 0x30, 0x05, 0x06, 0x03, 0x2b, 0x65, 0x70, 0x04,
  0x22, 0x04, 0x20,
];

function toBufferSource(bytes: Uint8Array): BufferSource {
  return bytes as unknown as BufferSource;
}

/**
 * 32 バイト（または 48/64 バイト）の Base64 秘密鍵シードから Web Crypto の Ed25519 CryptoKey をインポートする
 */
export async function importPrivateKeyFromSecretKey(
  secretKeyBase64: string,
): Promise<CryptoKey> {
  const trimmed = secretKeyBase64.trim();
  let rawBytes = base64ToBytes(trimmed);
  if (rawBytes.length === 64) {
    rawBytes = rawBytes.subarray(0, 32);
  }

  let pkcs8: Uint8Array;
  if (rawBytes.length === 32) {
    pkcs8 = new Uint8Array(ED25519_PKCS8_HEADER.length + 32);
    pkcs8.set(ED25519_PKCS8_HEADER);
    pkcs8.set(rawBytes, ED25519_PKCS8_HEADER.length);
  } else if (rawBytes.length === 48) {
    pkcs8 = rawBytes;
  } else {
    throw new Error(
      `Invalid secret key length: ${rawBytes.length} bytes (expected 32 bytes URL-safe base64)`,
    );
  }

  return await crypto.subtle.importKey(
    "pkcs8",
    toBufferSource(pkcs8),
    { name: "Ed25519" },
    true,
    ["sign"],
  );
}

/**
 * 新しい Ed25519 アカウント（秘密鍵シード・公開鍵 accountId）を生成する
 */
export async function generateAccountCredentials(
  accountName: string,
): Promise<AccountCredentials> {
  const seed = crypto.getRandomValues(new Uint8Array(32));
  const seedBase64 = bytesToUrlSafeBase64NoPad(seed);
  const key = await importPrivateKeyFromSecretKey(seedBase64);
  const jwk = await crypto.subtle.exportKey("jwk", key);
  const accountId = jwk.x ?? "";
  const finalSeed = jwk.d ?? seedBase64;

  return {
    accountId,
    accountName: accountName.trim(),
    secretKeyBase64: finalSeed,
  };
}

/**
 * 既存の秘密鍵シードからアカウント情報を復元する
 */
export async function importAccountCredentials(
  secretKeyBase64: string,
  fallbackAccountName?: string,
): Promise<AccountCredentials> {
  const key = await importPrivateKeyFromSecretKey(secretKeyBase64);
  const jwk = await crypto.subtle.exportKey("jwk", key);
  const accountId = jwk.x ?? "";
  const seed = jwk.d ?? secretKeyBase64.trim();
  const name =
    fallbackAccountName && fallbackAccountName.trim().length > 0
      ? fallbackAccountName.trim()
      : accountId.slice(0, 8);

  return {
    accountId,
    accountName: name,
    secretKeyBase64: seed,
  };
}

/**
 * イベントの `content` に `account_id` と `time` を付けて CBOR 化し、Ed25519 で署名した SignedEvent を作る
 */
async function signEvent(
  credentials: AccountCredentials,
  content: EventContent,
  timeSeconds: number,
): Promise<SignedEventResult> {
  const key = await importPrivateKeyFromSecretKey(credentials.secretKeyBase64);
  const innerBytes = encodeCborItem({
    account_id: base64ToBytes(credentials.accountId),
    time: { __tag: 1, value: timeSeconds },
    content: encodeEventContent(content),
  });
  const signature = new Uint8Array(
    await crypto.subtle.sign(
      { name: "Ed25519" },
      key,
      toBufferSource(innerBytes),
    ),
  );
  const signedBytes = encodeCborItem({
    signature,
    event_binary: { __tag: 24, value: innerBytes },
  });
  return {
    signedEventBytes: bytesToBase64(signedBytes),
    eventHash: await sha256EventHashId(signedBytes),
  };
}

/**
 * AccountCredentials から CreateAccount イベントを作成・Ed25519 署名する
 */
export async function createSignedAccountEvent(
  credentials: AccountCredentials,
  timeSeconds: number = Math.floor(Date.now() / 1000),
): Promise<SignedEventResult> {
  return await signEvent(
    credentials,
    { type: "create_account", accountName: credentials.accountName },
    timeSeconds,
  );
}

/**
 * プロジェクトのコミット (`project_commit`) イベントを作成・Ed25519 署名する (docs/project.md)
 */
export async function createSignedProjectCommitEvent(
  params: CreateProjectCommitParams,
  timeSeconds: number = Math.floor(Date.now() / 1000),
): Promise<SignedEventResult> {
  return await signEvent(
    params.credentials,
    {
      type: "project_commit",
      commit: {
        projectName: params.projectName,
        branch: params.branch ?? MAIN_BRANCH,
        projectDescription: params.projectDescription,
        message: params.message,
        parentCommitHash: params.parentCommitHash ?? null,
        mergedCommitHash: params.mergedCommitHash ?? null,
        modules: params.modules.map((module) => ({
          name: module.name,
          description: module.description,
          parts: module.parts.map((p) => ({
            name: p.name,
            description: p.description,
            partType: p.partType ?? null,
            expression: p.expression ?? null,
            contentHash: p.contentHash ?? null,
          })),
        })),
      },
    },
    timeSeconds,
  );
}

/**
 * 署名済みイベントを backend API (/definy.v1.EventService/SubmitEvent) に提出する
 */
export async function submitSignedEvent(
  signedEventBytes: string,
  fetchFn: typeof fetch = fetch,
): Promise<SubmitEventResult> {
  const res = await fetchFn("/definy.v1.EventService/SubmitEvent", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ signedEventBytes }),
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`SubmitEvent failed (${res.status}): ${errorText}`);
  }

  const data = (await res.json()) as SubmitEventResult;
  return data;
}

/**
 * プロジェクトのコミットを提出する. サーバーの CAS に足りない式があれば (`missing_content`),
 * その式だけを `UploadContent` で送ってから出し直す (docs/content-addressed.md「差分ハッシュ・ネゴシエーション方式」)
 */
export async function submitProjectCommitEvent(
  signedEventBytes: string,
  contents: ReadonlyMap<string, ContentItem>,
  fetchFn: typeof fetch = fetch,
): Promise<SubmitEventResult> {
  const first = await submitSignedEvent(signedEventBytes, fetchFn);
  if (first.status !== "missing_content") {
    return first;
  }
  const items = (first.missingContentHashes ?? []).map((hash) => {
    const item = contents.get(hash);
    if (item === undefined) {
      throw new Error(`The content ${hash} is not on the server`);
    }
    return item;
  });
  const res = await fetchFn("/definy.v1.EventService/UploadContent", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ items }),
  });
  if (!res.ok) {
    throw new Error(
      `UploadContent failed (${res.status}): ${await res.text()}`,
    );
  }
  return await submitSignedEvent(signedEventBytes, fetchFn);
}
