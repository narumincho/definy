/**
 * `SubmitEvent` で受け取ったプロジェクトのコミットの検査で, definy の `definy.check-commit` (docs/service.md) が使う能力.
 * 何をどの順に確かめるか, 定義の式の評価 (型環境の各プロジェクトの main の最新のコミットも), 型検査は
 * definy (`wasm/service.wasm`) が行い, ここはストアと CAS を読んで検査の入力を作ることだけをする
 */
import shapeCheckerModule from "../wasm/shape_checker.wasm?module";
import { base64ToBytes } from "../src/base64.ts";
import { decodeCborItem } from "../src/cbor.ts";
import { none, some, variant } from "../src/definy_value.ts";
import { conformsInDefiny } from "../src/event_check.ts";
import type { Env } from "./types.ts";
import {
  decodeStoredCommit,
  loadCommits,
  loadLatestMainCommits,
  type CommitPartRef,
  type PartStoreReader,
} from "./commit_store.ts";

/** CAS から読むときの 1 回の content hash の数 */
const CONTENT_CHUNK_SIZE = 200;

/**
 * content hash ごとの, 受け付けたコミットのパーツの定義の式 (CAS に無いか CBOR でなければ `null`).
 * 中身は変わらないので isolate の中で使い回す
 */
const acceptedDefinitionCache = new Map<string, unknown>();

/**
 * CAS からパーツの定義の式を読む (キーは content hash). 無いもの・CBOR として読めないものは入らない.
 * `trusted` を渡すと, それが偽の中身は `core.expression` の形か definy 製の `core.value-conforms` で確かめ, 違えば入れない
 */
async function readPartDefinitions(
  hashes: ReadonlyArray<string>,
  store: PartStoreReader,
  env: Env | undefined,
  trusted?: (hash: string) => boolean,
): Promise<ReadonlyMap<string, unknown>> {
  const result = new Map<string, unknown>();
  const unique = [...new Set(hashes)];
  for (let i = 0; i < unique.length; i += CONTENT_CHUNK_SIZE) {
    for (const item of await store.getContentItems(
      unique.slice(i, i + CONTENT_CHUNK_SIZE),
      env,
    )) {
      try {
        const definition = decodeCborItem(base64ToBytes(item.contentBytes))[0];
        if (
          trusted === undefined ||
          trusted(item.contentHash) ||
          conformsInDefiny(shapeCheckerModule, definition, "core.expression")
        ) {
          result.set(item.contentHash, definition);
        }
      } catch {
        // CBOR でないものは定義の式ではない
      }
    }
  }
  return result;
}

/** 受け付けたコミットのパーツの定義の式 (キーは content hash. 無ければ入らない). 形は受け付けたときに確かめてある */
async function readAcceptedDefinitions(
  hashes: ReadonlyArray<string>,
  store: PartStoreReader,
  env: Env | undefined,
): Promise<ReadonlyMap<string, unknown>> {
  const missing = [
    ...new Set(hashes.filter((hash) => !acceptedDefinitionCache.has(hash))),
  ];
  if (missing.length > 0) {
    const read = await readPartDefinitions(missing, store, env);
    for (const hash of missing) {
      acceptedDefinitionCache.set(hash, read.get(hash) ?? null);
    }
  }
  const result = new Map<string, unknown>();
  for (const hash of hashes) {
    const definition = acceptedDefinitionCache.get(hash);
    if (definition != null) {
      result.set(hash, definition);
    }
  }
  return result;
}

/** パーツを `definy.commit-check-source-part` の値にする */
function sourcePartValue(
  part: CommitPartRef,
  definitions: ReadonlyMap<string, unknown>,
): unknown {
  const definition = definitions.get(part.contentHash);
  return {
    id: part.partId,
    name: part.name,
    module_name: part.moduleName,
    module_id: part.moduleId,
    module_visibility: variant(part.moduleVisibility),
    content_hash: part.contentHash,
    definition: definition === undefined ? none() : some(definition),
  };
}

/**
 * `SubmitEvent` で受け取ったイベント (Base64) がプロジェクトのコミットなら, definy の `definy.check-commit` が検査に使うもの
 * (`definy.commit-check-source` の値) を読む (`read_commit_check_input`. docs/service.md).
 * コミットと, 型環境にする各プロジェクトの main の最新のコミットのパーツは定義の式のまま渡し, 中身は definy が求める.
 * プロジェクトのコミット以外・形式が不正なもの・CAS に足りない内容があるもの
 * (式を読めないので検査できない. `definy.submit-event` が先に `missing_content` を返す) は `null`
 */
export async function readCommitCheckInput(
  signedEventBase64: string,
  store: PartStoreReader & {
    readonly checkMissingHashes: (
      hashes: ReadonlyArray<string>,
      env?: Env,
    ) => Promise<ReadonlyArray<string>>;
  },
  env: Env | undefined,
): Promise<unknown> {
  // 署名は definy (definy.verify-signed-event) が先に確かめてある
  const commit = decodeStoredCommit(signedEventBase64);
  if (commit === null) {
    return null;
  }
  const refs = commit.parts;
  if (
    (
      await store.checkMissingHashes(
        [...new Set(refs.map((part) => part.contentHash))],
        env,
      )
    ).length > 0
  ) {
    return null;
  }
  const latestCommits = await loadLatestMainCommits(store, env);
  const latestDefinitions = await readAcceptedDefinitions(
    [...latestCommits.values()].flatMap((latest) =>
      latest.parts.map((part) => part.contentHash),
    ),
    store,
    env,
  );
  // 受け付けたコミットが参照している中身は, そのときに形を確かめてある
  const accepted = new Set(
    (await loadCommits(store, env)).flatMap((cached) =>
      cached.parts.map((part) => part.contentHash),
    ),
  );
  // 定義の式の評価と, 中身が core.part-content になるかは definy (definy.resolve-commit-contents) が見る.
  // CAS に預けた式は (イベントの形の検査を通らないので) ここで core.expression の形か確かめる
  const definitions = await readPartDefinitions(
    refs.map((part) => part.contentHash),
    store,
    env,
    (hash) => accepted.has(hash),
  );
  return {
    project_name: commit.projectName,
    parts: refs.map((part) => sourcePartValue(part, definitions)),
    latest_commits: Array.from(latestCommits, ([projectName, latest]) => ({
      project_name: projectName,
      parts: latest.parts.map((part) =>
        sourcePartValue(part, latestDefinitions),
      ),
    })),
    project_module_ids: latestCommits.get(commit.projectName)?.moduleIds ?? [],
  };
}

/**
 * コミットの外のパーツ (各プロジェクトの `main` の最新) の定義の式を CAS から読む (`read_part_definitions`).
 * 評価器が参照するパーツの式を definy が求めるのに使う. 無いパーツは `undefined`
 */
export async function readExternalPartDefinitions(
  partIds: ReadonlyArray<string>,
  store: PartStoreReader,
  env: Env | undefined,
): Promise<ReadonlyArray<unknown>> {
  const latestContentHashes = new Map(
    [...(await loadLatestMainCommits(store, env)).values()].flatMap((commit) =>
      commit.parts.map((part) => [part.partId, part.contentHash] as const),
    ),
  );
  const hashes = partIds.map((id) => latestContentHashes.get(id));
  const definitions = await readAcceptedDefinitions(
    hashes.filter((hash) => hash !== undefined),
    store,
    env,
  );
  return hashes.map((hash) =>
    hash === undefined ? undefined : definitions.get(hash),
  );
}
