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
} from "../src/base64.ts";
import { encodeCborItem } from "../src/cbor.ts";
import { sha256EventHashId } from "../src/sha256.ts";
import {
  type LocalizedText,
  DEFAULT_VISIBILITY,
  encodeEventContent,
  MAIN_BRANCH,
  type Visibility,
} from "../src/event_content.ts";
import { partContentItem } from "../src/content_store.ts";
import {
  createSeedInvalidSignatureSamples,
  invalidSignatureSampleContents,
} from "../src/invalid_signature_samples.ts";
import { seedBundleFingerprint } from "../src/seed_fingerprint.ts";
import { compileTypeChecker } from "../src/self_hosted_type_check.ts";
import { compileSeedFunction } from "../src/event_check.ts";
import { parseSignedEventMetadata } from "../src/signed_event.ts";
import { createStage1Compiler } from "../src/stage1_compiler.ts";
import {
  resolvePartPlaceholders,
  resolveSeedPartType,
} from "../src/seed_parts.ts";
import {
  loadProjectSeeds,
  type ProjectSeedData,
} from "../src/seed_projects.ts";
import { deriveModuleIdBytes, deriveModulePartId } from "../src/part_ids.ts";
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
  readonly module_description: LocalizedText;
  readonly module_visibility?: Visibility;
  readonly parts: ReadonlyArray<Record<string, unknown>>;
};

/** seed のイベントの時刻 (BASE_EPOCH_SECONDS からのずれ) と RFC 3339 の表記. プロジェクト名ごと */
const PROJECT_TIMES: ReadonlyMap<
  string,
  { readonly timeOffset: number; readonly createdAtRfc3339: string }
> = new Map([
  [
    "sample",
    {
      timeOffset: 0.03,
      createdAtRfc3339: "2019-01-31T04:36:01.029999971+00:00",
    },
  ],
  [
    "definy",
    {
      timeOffset: 0.005,
      createdAtRfc3339: "2019-01-31T04:36:01.005000114+00:00",
    },
  ],
]);

/** プロジェクトの seed のイベントの時刻. 表に無いプロジェクトは sample の後に 0.001 秒ずつ置く */
function projectTime(project: ProjectSeedData): {
  readonly timeOffset: number;
  readonly createdAtRfc3339: string;
} {
  const known = PROJECT_TIMES.get(project.project_name);
  if (known !== undefined) {
    return known;
  }
  const index = loadProjectSeeds().findIndex(
    (p) => p.project_name === project.project_name,
  );
  const timeOffset = 0.04 + index * 0.001;
  return {
    timeOffset,
    createdAtRfc3339: new Date(
      (BASE_EPOCH_SECONDS + timeOffset) * 1000,
    ).toISOString(),
  };
}

/** seed に署名するシステムアカウント. `DEFINY_SYSTEM_ACCOUNT_SECRET_KEY` が無ければ開発用の鍵 */
async function seedAccountCredentials(): Promise<AccountCredentials> {
  const secretKeyEnv = process.env.DEFINY_SYSTEM_ACCOUNT_SECRET_KEY;
  const secretKeyBase64 =
    secretKeyEnv && secretKeyEnv.trim().length > 0
      ? secretKeyEnv.trim()
      : bytesToUrlSafeBase64NoPad(DEV_SYSTEM_KEY_SEED);
  return await importAccountCredentials(secretKeyBase64, "definy");
}

/** 各プロジェクトのモジュールの seed ファイルを読み込み, パーツ ID のプレースホルダーを解決する */
async function loadSeedModules(): Promise<ReadonlyMap<string, ModuleSeedData>> {
  // 1. 各モジュールシードファイルを読み込み、プレースホルダーを解決
  const loadedModulesMap = new Map<string, ModuleSeedData>();
  for (const name of loadProjectSeeds().flatMap((project) => project.modules)) {
    const path = resolve(`seeds/${name}.json`);
    const raw = await readFile(path, "utf-8");
    const parsed = JSON.parse(raw) as ModuleSeedData;
    const resolvedParts = await Promise.all(
      parsed.parts.map(async (p) => {
        const partCopy = { ...p };
        delete partCopy.$schema;
        // パーツの型は seed では型の式. 読み込んだあとは型チェッカーの形 (`core.type-ast`) にする
        if (partCopy.part_type != null) {
          partCopy.part_type = await resolveSeedPartType(partCopy.part_type);
        }
        if (partCopy.expression != null) {
          partCopy.expression = await resolvePartPlaceholders(
            partCopy.expression,
          );
        }
        return partCopy;
      }),
    );
    loadedModulesMap.set(name, {
      module_name: parsed.module_name,
      module_description: parsed.module_description,
      ...(parsed.module_visibility === "private"
        ? { module_visibility: "private" as const }
        : {}),
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
    const moduleId = deriveModuleIdBytes(mod.module_name);
    for (const part of mod.parts) {
      partExpressions.set(
        deriveModulePartId(moduleId, String(part.name)),
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

  // 2. CAS コンテンツ一覧の構築 (definy, core, std, sample, wasi, wasm の順に走査し重複排除)
  const contentOrder: ReadonlyArray<string> = [
    "definy",
    "core",
    "std",
    "sample",
    "wasi",
    "wasm",
  ];
  const seenHashesSet = new Set<string>();
  const contentsList: Array<SeedContentEntry> = [];
  /** パーツの中身 (`core.part-content`) の content hash (キーはモジュール名, 値はパーツの順) */
  const partContentHashes = new Map<string, ReadonlyArray<string>>();

  for (const modName of contentOrder) {
    const mod = loadedModules.get(modName);
    if (!mod) continue;
    partContentHashes.set(
      modName,
      mod.parts.map((part) => {
        const item = partContentItem({
          description: part.description as LocalizedText,
          visibility:
            part.visibility === "private" ? "private" : DEFAULT_VISIBILITY,
          partType: part.part_type ?? null,
          expression: part.expression ?? null,
        });
        if (!seenHashesSet.has(item.contentHash)) {
          seenHashesSet.add(item.contentHash);
          contentsList.push(item);
        }
        return item.contentHash;
      }),
    );
  }

  for (const item of invalidSignatureSampleContents()) {
    if (!seenHashesSet.has(item.contentHash)) {
      seenHashesSet.add(item.contentHash);
      contentsList.push(item);
    }
  }

  const contents: ReadonlyArray<SeedContentEntry> = contentsList;

  // 3. イベント一覧の構築 (プロジェクトの新しい順, create_account, 署名が不正なサンプルの順)
  const eventsList: Array<SeedEventEntry> = [];

  const projects = [...loadProjectSeeds()].sort(
    (a, b) => projectTime(b).timeOffset - projectTime(a).timeOffset,
  );
  for (const project of projects) {
    const { timeOffset, createdAtRfc3339 } = projectTime(project);
    const timeVal = BASE_EPOCH_SECONDS + timeOffset;
    const modules = [];
    for (const name of project.modules) {
      const mod = loadedModules.get(name);
      if (!mod) continue;
      modules.push({
        name: mod.module_name,
        description: mod.module_description,
        visibility: mod.module_visibility ?? DEFAULT_VISIBILITY,
        // パーツの中身は CAS (contents) に入れ, コミットには名前と content hash だけを入れる
        parts: mod.parts.map((part, index) => {
          const contentHash = partContentHashes.get(name)?.[index];
          if (contentHash === undefined) {
            throw new Error(`no content hash for ${name}.${String(part.name)}`);
          }
          return {
            name: String(part.name),
            description: [],
            partType: null,
            expression: null,
            contentHash,
          };
        }),
      });
    }
    const inner = {
      account_id: accountBytes,
      time: { __tag: 1, value: timeVal },
      content: encodeEventContent({
        type: "project_commit",
        commit: {
          projectName: project.project_name,
          branch: MAIN_BRANCH,
          projectDescription: project.project_description,
          parentCommitHash: null,
          mergedCommitHash: null,
          message: project.message,
          modules,
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
      eventType: "project_commit",
      createdAtRfc3339,
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
      typeChecker: deriveModulePartId(
        deriveModuleIdBytes("core"),
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

/**
 * seed の `core.value-conforms` (値が型パーツの宣言の形か) を stage1 でコンパイルした Wasm を書き出すファイル (コミットしない).
 * サーバーがイベントの中身の形を確かめるのに使う (worker/event_check.ts)
 */
export const SHAPE_CHECKER_WASM_PATH = "wasm/shape_checker.wasm";

/**
 * seed の `core.project-branches` (受け付けたコミットをブランチにまとめる) を stage1 でコンパイルした Wasm を書き出すファイル (コミットしない).
 * サーバーが `GetProjectBranches` と main の最新のコミットに使う (src/branches.ts)
 */
export const BRANCH_SUMMARIZER_WASM_PATH = "wasm/branch_summarizer.wasm";

/**
 * seed の `core.check-reference-visibility` (非公開のパーツへの参照の検査) を stage1 でコンパイルした Wasm を書き出すファイル (コミットしない).
 * サーバーの `SubmitEvent` とエディタのコミット前の検査が使う (src/visibility.ts)
 */
export const VISIBILITY_CHECKER_WASM_PATH = "wasm/visibility_checker.wasm";

/**
 * seed の `definy.handle-request` (サーバーが HTTP リクエストをどう処理するか) を stage1 でコンパイルした Wasm を書き出すファイル (コミットしない).
 * Worker が `?module` で取り込み, worker/service_io.ts で動かす
 */
export const SERVICE_WASM_PATH = "wasm/service.wasm";

/**
 * seed の `core.eval-value` (definy 製の評価器) を stage1 でコンパイルした Wasm を書き出すファイル (コミットしない).
 * ユーザーが作った定義のパーツを使う定義の式を, サーバーとブラウザが評価するのに使う (src/definition_evaluator.ts)
 */
export const DEFINITION_EVALUATOR_WASM_PATH = "wasm/definition_evaluator.wasm";

/**
 * seed の `core.module-part-ids` (モジュール ID とパーツ ID の導出) を stage1 でコンパイルした Wasm を書き出すファイル (コミットしない).
 * サーバーがコミットのパーツの ID を求めるのに使う (src/part_ids.ts)
 */
export const PART_ID_DERIVER_WASM_PATH = "wasm/part_id_deriver.wasm";

/** seed の core の関数のパーツ `partName` を stage1 でコンパイルする */
async function compileCorePart(partName: string): Promise<Uint8Array> {
  return compileSeedPart("core", partName);
}

/** seed のモジュール `moduleName` の関数のパーツ `partName` を stage1 でコンパイルする */
async function compileSeedPart(
  moduleName: string,
  partName: string,
): Promise<Uint8Array> {
  const partExpressions = await seedPartExpressions(await loadSeedModules());
  return compileSeedFunction({
    compiler: createStage1Compiler(
      new WebAssembly.Module(await readFile(resolve("wasm/stage1.wasm"))),
    ),
    partId: deriveModulePartId(deriveModuleIdBytes(moduleName), partName),
    resolvePart: (id) => partExpressions.get(id),
  });
}

/** seed の `core.check-event` を stage1 でコンパイルする */
export async function generateEventCheckerWasm(): Promise<Uint8Array> {
  return compileCorePart("check-event");
}

/**
 * {@link generateEventCheckerWasm} の結果を {@link EVENT_CHECKER_WASM_PATH} に, `core.value-conforms` を {@link SHAPE_CHECKER_WASM_PATH} に,
 * `core.project-branches` を {@link BRANCH_SUMMARIZER_WASM_PATH} に, `core.check-reference-visibility` を {@link VISIBILITY_CHECKER_WASM_PATH} に,
 * `definy.handle-request` を {@link SERVICE_WASM_PATH} に, `core.eval-value` を {@link DEFINITION_EVALUATOR_WASM_PATH} に,
 * `core.module-part-ids` を {@link PART_ID_DERIVER_WASM_PATH} に書き出す
 */
export async function writeEventCheckerWasm(): Promise<void> {
  await writeFile(
    resolve(EVENT_CHECKER_WASM_PATH),
    await generateEventCheckerWasm(),
  );
  await writeFile(
    resolve(SHAPE_CHECKER_WASM_PATH),
    await compileCorePart("value-conforms"),
  );
  await writeFile(
    resolve(BRANCH_SUMMARIZER_WASM_PATH),
    await compileCorePart("project-branches"),
  );
  await writeFile(
    resolve(VISIBILITY_CHECKER_WASM_PATH),
    await compileCorePart("check-reference-visibility"),
  );
  await writeFile(
    resolve(SERVICE_WASM_PATH),
    await compileSeedPart("definy", "handle-request"),
  );
  await writeFile(
    resolve(DEFINITION_EVALUATOR_WASM_PATH),
    await compileCorePart("eval-value"),
  );
  await writeFile(
    resolve(PART_ID_DERIVER_WASM_PATH),
    await compileCorePart("module-part-ids"),
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
    `Successfully generated seed bundle: ${bundle.events.length} events, ${bundle.contents.length} contents -> ${SEED_BUNDLE_PATH}, type checker -> ${TYPE_CHECKER_WASM_PATH}, event checker -> ${EVENT_CHECKER_WASM_PATH}, shape checker -> ${SHAPE_CHECKER_WASM_PATH}, branch summarizer -> ${BRANCH_SUMMARIZER_WASM_PATH}, visibility checker -> ${VISIBILITY_CHECKER_WASM_PATH}, service -> ${SERVICE_WASM_PATH}, definition evaluator -> ${DEFINITION_EVALUATOR_WASM_PATH}, part ID deriver -> ${PART_ID_DERIVER_WASM_PATH}`,
  );
}
