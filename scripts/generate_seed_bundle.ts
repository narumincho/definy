import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import {
  importAccountCredentials,
  type AccountCredentials,
  importPrivateKeyFromSecretKey,
} from "../src/auth.ts";
import {
  base64ToBytes,
  bytesToBase64,
  bytesToUrlSafeBase64NoPad,
  encodeCborItem,
  sha256Bytes,
  sha256EventHashId,
  type LocalizedText,
} from "../src/cbor.ts";
import { encodeEventContent, MAIN_BRANCH } from "../src/event_content.ts";
import { createSeedInvalidSignatureSamples } from "../src/invalid_signature_samples.ts";
import { seedBundleFingerprint } from "../src/seed_fingerprint.ts";
import { compileTypeChecker } from "../src/self_hosted_type_check.ts";
import { compileEventChecker } from "../src/event_check.ts";
import { parseSignedEventMetadata } from "../src/signed_event.ts";
import { createStage1Compiler } from "../src/stage1_compiler.ts";
import { resolvePartPlaceholders } from "../src/seed_parts.ts";
import { deriveModuleIdBytes, deriveModulePartId } from "../worker/cbor.ts";
import type {
  SeedBundle,
  SeedContentEntry,
  SeedEventEntry,
} from "../worker/types.ts";

/** seed バンドルの指紋を書くファイル */
export const SEED_FINGERPRINT_PATH = "seeds/seed_bundle_fingerprint.json";

/** 開発用システムアカウント鍵のシード (`src/system_account.ts` の `DEV_SYSTEM_KEY_SEED` と同じ値) */
const DEV_SYSTEM_KEY_SEED = new TextEncoder().encode(
  "definy-compiler-system-key-2026\0",
);

const BASE_EPOCH_SECONDS = 1548909361;

/** 署名が不正なサンプルの時刻 (seed のイベントは BASE_EPOCH_SECONDS から 1 秒以内に置く) */
const INVALID_SIGNATURE_SAMPLE_TIME_OFFSET = 0.5;

function toBufferSource(bytes: Uint8Array): BufferSource {
  return bytes as unknown as BufferSource;
}

type ModuleSeedData = {
  readonly module_name: string;
  readonly module_description: ReadonlyArray<{
    readonly language: string;
    readonly text: string;
  }>;
  readonly message: string;
  readonly parts: ReadonlyArray<Record<string, unknown>>;
};

type ModuleSpec = {
  readonly name: string;
  readonly timeOffset: number;
  readonly createdAtRfc3339: string;
};

const MODULE_SPECS: ReadonlyArray<ModuleSpec> = [
  {
    name: "sample",
    timeOffset: 0.03,
    createdAtRfc3339: "2019-01-31T04:36:01.029999971+00:00",
  },
  {
    name: "wasi",
    timeOffset: 0.02,
    createdAtRfc3339: "2019-01-31T04:36:01.019999981+00:00",
  },
  {
    name: "std",
    timeOffset: 0.015,
    createdAtRfc3339: "2019-01-31T04:36:01.015000105+00:00",
  },
  {
    name: "core",
    timeOffset: 0.005,
    createdAtRfc3339: "2019-01-31T04:36:01.005000114+00:00",
  },
  {
    name: "definy",
    timeOffset: 0.001,
    createdAtRfc3339: "2019-01-31T04:36:01.000999928+00:00",
  },
];

/** seed に署名するシステムアカウント. `DEFINY_SYSTEM_ACCOUNT_SECRET_KEY` が無ければ開発用の鍵 */
async function seedAccountCredentials(): Promise<AccountCredentials> {
  const secretKeyEnv = process.env.DEFINY_SYSTEM_ACCOUNT_SECRET_KEY;
  const secretKeyBase64 =
    secretKeyEnv && secretKeyEnv.trim().length > 0
      ? secretKeyEnv.trim()
      : bytesToUrlSafeBase64NoPad(DEV_SYSTEM_KEY_SEED);
  return await importAccountCredentials(secretKeyBase64, "definy");
}

/** 各モジュールの seed ファイルを読み込み, パーツ ID のプレースホルダーを解決する */
async function loadSeedModules(): Promise<ReadonlyMap<string, ModuleSeedData>> {
  // 1. 各モジュールシードファイルを読み込み、プレースホルダーを解決
  const loadedModulesMap = new Map<string, ModuleSeedData>();
  for (const spec of MODULE_SPECS) {
    const path = resolve(`seeds/${spec.name}.json`);
    const raw = await readFile(path, "utf-8");
    const parsed = JSON.parse(raw) as ModuleSeedData;
    const resolvedParts = await Promise.all(
      parsed.parts.map(async (p) => {
        const partCopy = { ...p };
        delete partCopy.$schema;
        if (partCopy.part_type != null) {
          partCopy.part_type = await resolvePartPlaceholders(
            partCopy.part_type,
          );
        }
        if (partCopy.expression != null) {
          partCopy.expression = await resolvePartPlaceholders(
            partCopy.expression,
          );
        }
        return partCopy;
      }),
    );
    loadedModulesMap.set(spec.name, {
      module_name: parsed.module_name,
      module_description: parsed.module_description,
      message: parsed.message,
      parts: resolvedParts,
    });
  }
  return loadedModulesMap;
}

/** seed の全パーツの式を, パーツ ID (URL-safe Base64) から引けるようにする */
async function seedPartExpressions(
  modules: ReadonlyMap<string, ModuleSeedData>,
): Promise<ReadonlyMap<string, unknown>> {
  const partExpressions = new Map<string, unknown>();
  for (const mod of modules.values()) {
    const moduleId = await deriveModuleIdBytes(mod.module_name);
    for (const part of mod.parts) {
      partExpressions.set(
        await deriveModulePartId(moduleId, String(part.name)),
        part.expression ?? undefined,
      );
    }
  }
  return partExpressions;
}

export async function generateSeedBundle(): Promise<SeedBundle> {
  const creds = await seedAccountCredentials();
  const accountBytes = base64ToBytes(creds.accountId);
  const privateKey = await importPrivateKeyFromSecretKey(creds.secretKeyBase64);
  const loadedModules = await loadSeedModules();

  // 2. CAS コンテンツ一覧の構築 (definy, core, std, sample, wasi の順に走査し重複排除)
  const contentOrder: ReadonlyArray<string> = [
    "definy",
    "core",
    "std",
    "sample",
    "wasi",
  ];
  const seenHashesSet = new Set<string>();
  const contentsList: Array<SeedContentEntry> = [];

  for (const modName of contentOrder) {
    const mod = loadedModules.get(modName);
    if (!mod) continue;
    for (const part of mod.parts) {
      if (part.expression != null) {
        const cborBytes = encodeCborItem(part.expression);
        const hashBytes = await sha256Bytes(cborBytes);
        const hashStr = bytesToUrlSafeBase64NoPad(hashBytes);
        if (!seenHashesSet.has(hashStr)) {
          seenHashesSet.add(hashStr);
          contentsList.push({
            contentHash: hashStr,
            contentBytes: bytesToBase64(cborBytes),
          });
        }
      }
    }
  }

  const contents: ReadonlyArray<SeedContentEntry> = contentsList;

  // 3. イベント一覧の構築 (sample, wasi, std, core, definy, create_account, 署名が不正なサンプルの順)
  const eventsList: Array<SeedEventEntry> = [];

  for (const spec of MODULE_SPECS) {
    const mod = loadedModules.get(spec.name);
    if (!mod) continue;
    const timeVal = BASE_EPOCH_SECONDS + spec.timeOffset;
    const inner = {
      account_id: accountBytes,
      time: { __tag: 1, value: timeVal },
      content: encodeEventContent({
        type: "module_commit",
        commit: {
          moduleName: mod.module_name,
          branch: MAIN_BRANCH,
          moduleDescription: mod.module_description,
          parentCommitHash: null,
          mergedCommitHash: null,
          message: mod.message,
          parts: mod.parts.map((part) => ({
            name: String(part.name),
            description: part.description as LocalizedText,
            partType: part.part_type ?? null,
            expression: part.expression ?? null,
            contentHash: null,
          })),
        },
      }),
    };
    const innerBytes = encodeCborItem(inner);
    const signature = new Uint8Array(
      await crypto.subtle.sign(
        { name: "Ed25519" },
        privateKey,
        toBufferSource(innerBytes),
      ),
    );
    const signedBytes = encodeCborItem({
      signature: Array.from(signature),
      event_binary: { __tag: 24, value: Array.from(innerBytes) },
    });
    const eventHash = await sha256EventHashId(signedBytes);
    eventsList.push({
      eventHash,
      signedEventBytes: bytesToBase64(signedBytes),
      accountId: creds.accountId,
      eventType: "module_commit",
      createdAtRfc3339: spec.createdAtRfc3339,
      timeMs: Math.round(timeVal * 1000),
    });
  }

  // create_account イベント (最後に追加)
  const createAccountInner = {
    account_id: accountBytes,
    time: { __tag: 1, value: { __float64: BASE_EPOCH_SECONDS } },
    content: encodeEventContent({
      type: "create_account",
      accountName: "definy",
    }),
  };
  const createAccountInnerBytes = encodeCborItem(createAccountInner);
  const createAccountSignature = new Uint8Array(
    await crypto.subtle.sign(
      { name: "Ed25519" },
      privateKey,
      toBufferSource(createAccountInnerBytes),
    ),
  );
  const createAccountSignedBytes = encodeCborItem({
    signature: Array.from(createAccountSignature),
    event_binary: { __tag: 24, value: Array.from(createAccountInnerBytes) },
  });
  const createAccountEventHash = await sha256EventHashId(
    createAccountSignedBytes,
  );
  eventsList.push({
    eventHash: createAccountEventHash,
    signedEventBytes: bytesToBase64(createAccountSignedBytes),
    accountId: creds.accountId,
    eventType: "create_account",
    createdAtRfc3339: "2019-01-31T04:36:01+00:00",
    timeMs: BASE_EPOCH_SECONDS * 1000,
  });

  // 署名が不正なイベントのサンプル. ブラウザの署名チェックをどの環境でも確かめられるように入れる
  // (docs/invalid-signature-debug.md). ブラウザはこれらを一覧で「署名が不正」と表示し, モジュール・パーツ・
  // アカウント名の導出から外す. サーバーも署名を検証してからパーツを読む (worker/part_compiler.ts)
  const invalidSamples = await createSeedInvalidSignatureSamples({
    systemAccountId: creds.accountId,
    timeSeconds: BASE_EPOCH_SECONDS + INVALID_SIGNATURE_SAMPLE_TIME_OFFSET,
  });
  for (const sample of invalidSamples) {
    const bytes = base64ToBytes(sample.signedEventBytes);
    const meta = parseSignedEventMetadata(bytes);
    eventsList.push({
      eventHash: await sha256EventHashId(bytes),
      signedEventBytes: sample.signedEventBytes,
      accountId: meta.accountId,
      eventType: meta.eventType,
      createdAtRfc3339: meta.createdAtRfc3339,
      timeMs: meta.timeMs,
    });
  }

  const events: ReadonlyArray<SeedEventEntry> = eventsList;

  return {
    fingerprint: await seedBundleFingerprint({ events, contents }),
    events,
    contents,
  };
}

/** 生成した seed バンドルを書き出すファイル (コミットしない. 静的アセット `/__definy_seed_bundle.json` として配信する) */
export const SEED_BUNDLE_PATH = "public/__definy_seed_bundle.json";

/**
 * seed バンドルを生成して {@link SEED_BUNDLE_PATH} に書き出す.
 * Vitest の起動時にも呼ぶ (指紋のファイルはテストで確かめるので書き換えない)
 */
export async function writeSeedBundle(): Promise<SeedBundle> {
  const bundle = await generateSeedBundle();
  await writeFile(
    resolve(SEED_BUNDLE_PATH),
    `${JSON.stringify(bundle)}\n`,
    "utf-8",
  );
  return bundle;
}

/**
 * seed の `core.type-check-against` を stage1 でコンパイルした型チェッカーの Wasm を書き出すファイル
 * (コミットしない). Cloudflare Workers は実行時に Wasm をコンパイルできないので, Worker はこれを
 * `?module` で取り込み, ブラウザも同じものを使う (src/self_hosted_type_check.ts)
 */
export const TYPE_CHECKER_WASM_PATH = "wasm/type_checker.wasm";

/** seed の型チェッカーを stage1 でコンパイルする */
export async function generateTypeCheckerWasm(): Promise<Uint8Array> {
  const partExpressions = await seedPartExpressions(await loadSeedModules());
  return compileTypeChecker({
    compiler: createStage1Compiler(
      new WebAssembly.Module(await readFile(resolve("wasm/stage1.wasm"))),
    ),
    core: {
      typeChecker: await deriveModulePartId(
        await deriveModuleIdBytes("core"),
        "type-checker",
      ),
    },
    resolvePart: (id) => partExpressions.get(id),
  });
}

/**
 * seed の `core.check-event` (イベントを受け付ける規則) を stage1 でコンパイルした Wasm を書き出すファイル (コミットしない).
 * 型チェッカーと同じく Worker が `?module` で取り込む (src/event_check.ts)
 */
export const EVENT_CHECKER_WASM_PATH = "wasm/event_checker.wasm";

/** seed の `core.check-event` を stage1 でコンパイルする */
export async function generateEventCheckerWasm(): Promise<Uint8Array> {
  const partExpressions = await seedPartExpressions(await loadSeedModules());
  return compileEventChecker({
    compiler: createStage1Compiler(
      new WebAssembly.Module(await readFile(resolve("wasm/stage1.wasm"))),
    ),
    checkEventPartId: await deriveModulePartId(
      await deriveModuleIdBytes("core"),
      "check-event",
    ),
    resolvePart: (id) => partExpressions.get(id),
  });
}

/** {@link generateEventCheckerWasm} の結果を {@link EVENT_CHECKER_WASM_PATH} に書き出す */
export async function writeEventCheckerWasm(): Promise<void> {
  await writeFile(
    resolve(EVENT_CHECKER_WASM_PATH),
    await generateEventCheckerWasm(),
  );
}

/** {@link generateTypeCheckerWasm} の結果を {@link TYPE_CHECKER_WASM_PATH} に書き出す */
export async function writeTypeCheckerWasm(): Promise<void> {
  await writeFile(
    resolve(TYPE_CHECKER_WASM_PATH),
    await generateTypeCheckerWasm(),
  );
}

// 直接実行時の処理 (`npm run build:seeds`. `npm run dev` / `npm run build` の前にも実行する)
if (
  process.argv[1] &&
  (process.argv[1].endsWith("generate_seed_bundle.ts") ||
    process.argv[1].endsWith("generate_seed_bundle.js"))
) {
  const bundle = await writeSeedBundle();
  await writeTypeCheckerWasm();
  await writeEventCheckerWasm();
  // Worker がビルド時に取り込み, D1 の seed が最新かを調べるのに使う (worker/store.ts).
  // 型検査で必要なのでこちらはコミットする
  await writeFile(
    resolve(SEED_FINGERPRINT_PATH),
    `${JSON.stringify({ fingerprint: bundle.fingerprint }, null, 2)}\n`,
    "utf-8",
  );
  console.log(
    `Successfully generated seed bundle: ${bundle.events.length} events, ${bundle.contents.length} contents -> ${SEED_BUNDLE_PATH}, type checker -> ${TYPE_CHECKER_WASM_PATH}, event checker -> ${EVENT_CHECKER_WASM_PATH}`,
  );
}
