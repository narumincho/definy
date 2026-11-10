import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { base64ToBytes } from "../src/base64.ts";
import { sha256EventHashId } from "../src/sha256.ts";
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
  readStoreSeed,
  type StoreSeed,
  storeSeedPartExpressions,
} from "../src/store_seed.ts";
import { deriveModuleIdBytes, deriveModulePartId } from "../src/part_ids.ts";
import type { SeedBundle, SeedEventEntry } from "../worker/types.ts";

/** seed バンドルの指紋を書くファイル */
export const SEED_FINGERPRINT_PATH = "seeds/seed_bundle_fingerprint.json";

/**
 * 紹介スライドの値 `story.slides` の式を書くファイル. ブラウザと音声の生成 (scripts/generate_story_voice.ts) が
 * src/story/story_value.ts で読む。`npm run check` が `npm run build:seeds` より前に動くのでコミットする
 */
export const STORY_SLIDES_PATH = "src/story/story_slides.generated.json";

/** {@link STORY_SLIDES_PATH} の中身 */
export async function generateStorySlides(): Promise<string> {
  const store = await readStoreSeed();
  const slides = store.projects
    .flatMap((project) => project.commit.modules)
    .find((module) => module.name === "story")
    ?.parts.find((part) => part.name === "slides");
  if (slides === undefined) {
    throw new Error("story.slides is not in seeds/store");
  }
  return `${JSON.stringify({ expression: slides.expression }, null, 2)}\n`;
}

/** 古い seed の時刻 (2019-01-31T04:36:01Z. 署名が不正なサンプルはここから 1 秒以内に置く) */
const BASE_EPOCH_SECONDS = 1548909361;

/** 署名が不正なサンプルの時刻 */
const INVALID_SIGNATURE_SAMPLE_TIME_OFFSET = 0.5;

/** `seeds/store/` の全パーツの式を, パーツ ID (URL-safe Base64) から引けるようにする */
async function seedPartExpressions(): Promise<ReadonlyMap<string, unknown>> {
  return storeSeedPartExpressions(await readStoreSeed());
}

/** definy プロジェクトの `main` の最新のコミットの作者 (opus5.5) */
function definyMainAuthor(store: StoreSeed): string {
  const head = store.heads.projects["definy"];
  const author = store.bundle.events.find(
    (event) => event.eventHash === head,
  )?.accountId;
  if (author === undefined) {
    throw new Error("seeds/store/heads.json has no definy project");
  }
  return author;
}

/**
 * seed バンドル: `seeds/store/` (ストアから書き出した署名済みのイベントとパーツの中身. docs/source-in-store.md) を
 * そのまま入れ, 署名が不正なイベントのサンプルを足したもの
 */
export async function generateSeedBundle(): Promise<SeedBundle> {
  const store = await readStoreSeed();
  const events: Array<SeedEventEntry> = [...store.bundle.events];
  const contents = [...store.bundle.contents];
  const seen = new Set(contents.map((c) => c.contentHash));

  // 署名が不正なイベントのサンプル. ブラウザの署名チェックをどの環境でも確かめられるように入れる
  // (docs/invalid-signature-debug.md). ブラウザはこれらを一覧で「署名が不正」と表示し, モジュール・パーツ・
  // アカウント名の導出から外す. サーバーも署名を検証してからパーツを読む (worker/part_compiler.ts)
  const invalidSamples = await createSeedInvalidSignatureSamples({
    impersonatedAccountId: definyMainAuthor(store),
    timeSeconds: BASE_EPOCH_SECONDS + INVALID_SIGNATURE_SAMPLE_TIME_OFFSET,
  });
  for (const sample of invalidSamples) {
    const bytes = base64ToBytes(sample.signedEventBytes);
    const meta = parseSignedEventMetadata(bytes);
    events.push({
      eventHash: await sha256EventHashId(bytes),
      signedEventBytes: sample.signedEventBytes,
      accountId: meta.accountId,
      eventType: meta.eventType,
      createdAtRfc3339: meta.createdAtRfc3339,
      timeMs: meta.timeMs,
    });
  }
  for (const item of invalidSignatureSampleContents()) {
    if (!seen.has(item.contentHash)) {
      seen.add(item.contentHash);
      contents.push(item);
    }
  }

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
  const partExpressions = await seedPartExpressions();
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

/**
 * seed の `definy.decode-stored-commit` (保存した SignedEvent をプロジェクトのコミットとして読む) を stage1 でコンパイルした Wasm を
 * 書き出すファイル (コミットしない). サーバーがストアのコミットを読むのに使う (worker/commit_store.ts)
 */
export const COMMIT_DECODER_WASM_PATH = "wasm/commit_decoder.wasm";

/**
 * seed の `definy.seed-store` (ストアのテーブルを作り seed を入れる) を stage1 でコンパイルした Wasm を
 * 書き出すファイル (コミットしない). テストなどで D1 に seed を入れる `WorkerStore.seedD1` が使う (worker/store.ts)
 */
export const SEEDER_WASM_PATH = "wasm/seeder.wasm";

/** seed の core の関数のパーツ `partName` を stage1 でコンパイルする */
async function compileCorePart(partName: string): Promise<Uint8Array> {
  return compileSeedPart("core", partName);
}

/** seed のモジュール `moduleName` の関数のパーツ `partName` を stage1 でコンパイルする */
async function compileSeedPart(
  moduleName: string,
  partName: string,
): Promise<Uint8Array> {
  const partExpressions = await seedPartExpressions();
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
 * `core.module-part-ids` を {@link PART_ID_DERIVER_WASM_PATH} に, `definy.decode-stored-commit` を {@link COMMIT_DECODER_WASM_PATH} に, `definy.seed-store` を {@link SEEDER_WASM_PATH} に書き出す
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
  await writeFile(
    resolve(COMMIT_DECODER_WASM_PATH),
    await compileSeedPart("definy", "decode-stored-commit"),
  );
  await writeFile(
    resolve(SEEDER_WASM_PATH),
    await compileSeedPart("definy", "seed-store"),
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
  await writeFile(
    resolve(STORY_SLIDES_PATH),
    await generateStorySlides(),
    "utf-8",
  );
  // Worker がビルド時に取り込み, D1 の seed が最新かを調べるのに使う (worker/store.ts).
  // 型検査で必要なのでこちらはコミットする
  await writeFile(
    resolve(SEED_FINGERPRINT_PATH),
    `${JSON.stringify({ fingerprint: bundle.fingerprint }, null, 2)}\n`,
    "utf-8",
  );
  console.log(
    `Successfully generated seed bundle: ${bundle.events.length} events, ${bundle.contents.length} contents -> ${SEED_BUNDLE_PATH}, type checker -> ${TYPE_CHECKER_WASM_PATH}, event checker -> ${EVENT_CHECKER_WASM_PATH}, shape checker -> ${SHAPE_CHECKER_WASM_PATH}, branch summarizer -> ${BRANCH_SUMMARIZER_WASM_PATH}, visibility checker -> ${VISIBILITY_CHECKER_WASM_PATH}, service -> ${SERVICE_WASM_PATH}, definition evaluator -> ${DEFINITION_EVALUATOR_WASM_PATH}, part ID deriver -> ${PART_ID_DERIVER_WASM_PATH}, commit decoder -> ${COMMIT_DECODER_WASM_PATH}, seeder -> ${SEEDER_WASM_PATH}, story.slides -> ${STORY_SLIDES_PATH}`,
  );
}
