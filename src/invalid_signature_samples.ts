/**
 * ブラウザ側の署名チェックを確認するための「署名が不正なイベント」のサンプルを作る。
 * サーバーの通常の `SubmitEvent` はこれらを拒否するので、
 * 保存にはローカル開発専用の `DebugService/SubmitUnverifiedEvent` を使う (docs/invalid-signature-debug.md)。
 */
import {
  createSignedAccountEvent,
  createSignedModuleCommitEvent,
  generateAccountCredentials,
  type AccountCredentials,
  type SubmitEventResult,
} from "./auth.ts";
import {
  base64ToBytes,
  bytesToBase64,
  decodeCborItem,
  encodeCborItem,
  toUint8Array,
  type DecodedPart,
} from "./cbor.ts";

export type InvalidSignatureSampleKind =
  "flipped_signature" | "tampered_content" | "impersonated_account";

export type InvalidSignatureSample = {
  readonly kind: InvalidSignatureSampleKind;
  readonly signedEventBytes: string;
};

/** サンプルのモジュール名。不正なイベントを表示から除外できていなければ、このモジュールが一覧に現れる */
export const INVALID_SIGNATURE_SAMPLE_MODULE_NAME = "invalid_signature_sample";

const SAMPLE_PARTS: ReadonlyArray<DecodedPart> = [
  {
    name: "answer",
    description: [
      {
        language: "en",
        text: "If you can see this part, the browser accepted an event with an invalid signature",
      },
      {
        language: "ja",
        text: "このパーツが見えていたら、ブラウザが不正な署名のイベントを受け入れている",
      },
    ],
    partType: "number",
    expression: { Number: { value: 42 } },
  },
];

type SignedEventParts = {
  readonly signature: Uint8Array;
  readonly inner: Record<string, unknown>;
};

function decodeSigned(signedEventBytes: string): SignedEventParts {
  const [signedRaw] = decodeCborItem(base64ToBytes(signedEventBytes));
  const signedObj = signedRaw as Record<string, unknown>;
  const signature = toUint8Array(signedObj.signature);
  const eventBinary = signedObj.event_binary as { readonly value?: unknown };
  const innerBytes = toUint8Array(eventBinary.value);
  if (!signature || !innerBytes) {
    throw new Error("unexpected SignedEvent shape");
  }
  const [inner] = decodeCborItem(innerBytes);
  return { signature, inner: inner as Record<string, unknown> };
}

function encodeSigned(parts: SignedEventParts): string {
  return bytesToBase64(
    encodeCborItem({
      signature: parts.signature,
      event_binary: { __tag: 24, value: encodeCborItem(parts.inner) },
    }),
  );
}

async function signSampleModuleCommit(
  credentials: AccountCredentials,
  message: string,
  timeSeconds: number,
): Promise<string> {
  const { signedEventBytes } = await createSignedModuleCommitEvent(
    {
      credentials,
      moduleName: INVALID_SIGNATURE_SAMPLE_MODULE_NAME,
      moduleDescription: [
        { language: "en", text: "Invalid signature sample" },
        { language: "ja", text: "不正な署名のサンプル" },
      ],
      message,
      parts: SAMPLE_PARTS,
    },
    timeSeconds,
  );
  return signedEventBytes;
}

/**
 * 署名が不正なイベントを 3 種類作る。
 * - `flipped_signature`: 正しく署名した CreateAccount の署名を 1 バイト書き換えたもの
 * - `tampered_content`: 正しく署名した ModuleCommit の中身を、署名後に書き換えたもの
 * - `impersonated_account`: 別の鍵で署名した ModuleCommit の `account_id` を `impersonatedAccountId` にすり替えたもの
 *
 * `impersonatedAccountId` を省略すると、使い捨ての別アカウントになりすます。
 */
export async function createInvalidSignatureSamples(
  options: {
    readonly impersonatedAccountId?: string | undefined;
    readonly timeSeconds?: number | undefined;
  } = {},
): Promise<ReadonlyArray<InvalidSignatureSample>> {
  const timeSeconds = options.timeSeconds ?? Math.floor(Date.now() / 1000);
  const signer = await generateAccountCredentials("invalid-signature-sample");

  const account = decodeSigned(
    (await createSignedAccountEvent(signer, timeSeconds)).signedEventBytes,
  );
  const flippedSignature = new Uint8Array(account.signature);
  flippedSignature[0] = (flippedSignature[0] ?? 0) ^ 0xff;

  const commit = decodeSigned(
    await signSampleModuleCommit(
      signer,
      "Signed commit (content will be tampered)",
      timeSeconds,
    ),
  );
  const content = commit.inner.content as Record<string, unknown>;
  const moduleCommit = content.ModuleCommit as Record<string, unknown>;
  const tamperedInner = {
    ...commit.inner,
    content: {
      ModuleCommit: {
        ...moduleCommit,
        message: "Tampered after signing",
      },
    },
  };

  const impersonatedAccountId =
    options.impersonatedAccountId ??
    (await generateAccountCredentials("impersonated")).accountId;
  const impersonation = decodeSigned(
    await signSampleModuleCommit(
      signer,
      "Commit signed by a different key",
      timeSeconds,
    ),
  );

  return [
    {
      kind: "flipped_signature",
      signedEventBytes: encodeSigned({
        signature: flippedSignature,
        inner: account.inner,
      }),
    },
    {
      kind: "tampered_content",
      signedEventBytes: encodeSigned({
        signature: commit.signature,
        inner: tamperedInner,
      }),
    },
    {
      kind: "impersonated_account",
      signedEventBytes: encodeSigned({
        signature: impersonation.signature,
        inner: {
          ...impersonation.inner,
          account_id: base64ToBytes(impersonatedAccountId),
        },
      }),
    },
  ];
}

/**
 * サンプルを作り、`DebugService/SubmitUnverifiedEvent` で保存する。
 * サーバーで `DEFINY_ALLOW_UNVERIFIED_EVENTS=true` になっていなければ失敗する。
 */
export async function submitInvalidSignatureSamples(
  options: { readonly impersonatedAccountId?: string | undefined } = {},
): Promise<ReadonlyArray<SubmitEventResult>> {
  const samples = await createInvalidSignatureSamples(options);
  const results: SubmitEventResult[] = [];
  for (const sample of samples) {
    const res = await fetch("/definy.v1.DebugService/SubmitUnverifiedEvent", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ signedEventBytes: sample.signedEventBytes }),
    });
    if (!res.ok) {
      const err = (await res.json().catch(() => null)) as {
        readonly message?: string;
      } | null;
      throw new Error(err?.message ?? `HTTP ${res.status}`);
    }
    results.push((await res.json()) as SubmitEventResult);
  }
  return results;
}
