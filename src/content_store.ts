/**
 * CAS (content-addressed storage) に預けたパーツの中身 (説明・公開/非公開・型・式. `core.part-content`.
 * 預けるのは評価すると中身になる定義の式. docs/part-definition.md.
 * docs/content-addressed.md「差分ハッシュ・ネゴシエーション方式」).
 * コミットにはパーツの名前と中身の content hash だけを入れ, 中身は `UploadContent` / `GetContent` でやり取りする
 */
import {
  base64ToBytes,
  bytesToBase64,
  decodeCborItem,
  encodeCborItem,
  sha256EventHashIdSync,
  type DecodedPart,
} from "./cbor.ts";
import { DEFAULT_VISIBILITY, type PartContent } from "./event_content.ts";
import {
  decodePartDefinition,
  evaluatePartDefinition,
  partDefinitionExpression,
  resolveDefinitionsInCommit,
  type DefinitionEvaluator,
} from "./part_definition.ts";

/** 1 回の `GetContent` で読む content hash の数 */
const GET_CONTENT_CHUNK_SIZE = 200;

/** CAS に預ける中身 1 つ (`UploadContent` の項目) */
export type ContentItem = {
  readonly contentHash: string;
  /** 中身の CBOR (Base64) */
  readonly contentBytes: string;
};

/** パーツの中身を CAS に預ける形 (定義の式の CBOR. docs/part-definition.md) にする */
export function partContentItem(content: PartContent): ContentItem {
  return definitionContentItem(partDefinitionExpression(content));
}

/** 定義の式を CAS に預ける形 (CBOR) にする */
export function definitionContentItem(definition: unknown): ContentItem {
  const bytes = encodeCborItem(definition);
  return {
    contentHash: sha256EventHashIdSync(bytes),
    contentBytes: bytesToBase64(bytes),
  };
}

/**
 * コミットするパーツに中身の content hash を付ける. 中身は `contents` (content hash → 中身) に集める.
 * 中身を読んでいないパーツ (`unresolved`) は持っている content hash をそのまま使う
 */
export function toContentAddressedParts(parts: ReadonlyArray<DecodedPart>): {
  readonly parts: ReadonlyArray<DecodedPart & { readonly contentHash: string }>;
  readonly contents: ReadonlyMap<string, ContentItem>;
} {
  const contents = new Map<string, ContentItem>();
  const result = parts.map((part) => {
    if (part.unresolved === true && part.contentHash != null) {
      return { ...part, contentHash: part.contentHash };
    }
    const content: PartContent = {
      description: part.description,
      visibility: part.visibility ?? DEFAULT_VISIBILITY,
      partType: part.partType ?? null,
      expression: part.expression ?? null,
    };
    // エディタで書いた定義の式はそのまま預ける
    if (part.definition !== undefined) {
      const definitionItem = definitionContentItem(part.definition);
      contents.set(definitionItem.contentHash, definitionItem);
      if (decodePartDefinition(part.definition) !== undefined) {
        contentCache.set(definitionItem.contentHash, content);
      } else {
        definitionCache.set(definitionItem.contentHash, part.definition);
      }
      const { definition: _, ...rest } = part;
      return { ...rest, contentHash: definitionItem.contentHash };
    }
    const item = partContentItem(content);
    // コミットの中で評価した定義の式のパーツは, 中身を変えていなければ定義の式 (content hash) のまま残す
    const evaluated =
      part.contentHash == null
        ? undefined
        : evaluatedContentByHash.get(part.contentHash);
    if (
      part.contentHash != null &&
      evaluated !== undefined &&
      evaluated.has(item.contentHash)
    ) {
      return { ...part, contentHash: part.contentHash };
    }
    contents.set(item.contentHash, item);
    contentCache.set(item.contentHash, content);
    return { ...part, contentHash: item.contentHash };
  });
  return { parts: result, contents };
}

/** content hash → パーツの中身. 中身は変わらないので, 読んだものはページを開いている間ずっと使う */
const contentCache = new Map<string, PartContent>();

/**
 * content hash → その場で評価できない定義の式 (ユーザーが作った定義のパーツの呼び出しなど).
 * 中身はコミットで決まるので, コミットの中で評価する ({@link withEvaluatedDefinitions})
 */
const definitionCache = new Map<string, unknown>();

/** その場で評価できない定義の式を読んだか (評価器を読み込むか決める) */
export function hasPendingDefinitions(): boolean {
  return definitionCache.size > 0;
}

/**
 * content hash の中身の定義の式のうち, その場で評価できないもの (ユーザーが作った定義のパーツの呼び出しなど).
 * `core.define-part(...)` などその場で評価できる定義や, 読んでいないものは `undefined`
 */
export function cachedDefinition(contentHash: string): unknown {
  return definitionCache.get(contentHash);
}

/** 読んだパーツの中身 (無ければ `undefined`) */
export function cachedContent(contentHash: string): PartContent | undefined {
  return contentCache.get(contentHash);
}

/** パーツのうち, 中身を CAS から読む必要があるものの content hash (読んだものは除く) */
export function missingContentHashes(
  parts: ReadonlyArray<DecodedPart>,
): ReadonlyArray<string> {
  const hashes = new Set<string>();
  for (const part of parts) {
    if (
      part.unresolved === true &&
      part.contentHash != null &&
      !contentCache.has(part.contentHash) &&
      !definitionCache.has(part.contentHash)
    ) {
      hashes.add(part.contentHash);
    }
  }
  return [...hashes];
}

/**
 * `GetContent` でパーツの中身を読んでキャッシュに入れる. サーバーを信用せず, 中身の SHA-256 が content hash と
 * 一致し, 定義の式を評価して `core.part-content` の形になるものだけを使う. 読めたものが 1 つでもあれば `true`
 */
export async function loadContents(
  hashes: ReadonlyArray<string>,
  postRpc: (method: string, body: unknown) => Promise<unknown>,
): Promise<boolean> {
  const pending = hashes.filter((hash) => !contentCache.has(hash));
  let loaded = false;
  for (let i = 0; i < pending.length; i += GET_CONTENT_CHUNK_SIZE) {
    const chunk = pending.slice(i, i + GET_CONTENT_CHUNK_SIZE);
    const response = (await postRpc("GetContent", {
      contentHashes: chunk,
    })) as { readonly items?: ReadonlyArray<ContentItem> };
    for (const item of response.items ?? []) {
      const bytes = base64ToBytes(item.contentBytes);
      if (sha256EventHashIdSync(bytes) !== item.contentHash) {
        continue;
      }
      const definition = decodeCborItem(bytes)[0];
      const content = decodePartDefinition(definition);
      if (content !== undefined) {
        contentCache.set(item.contentHash, content);
        loaded = true;
      } else if (evaluatePartDefinition(definition) === undefined) {
        // その場で評価できない定義の式は, コミットの中で評価する ({@link withEvaluatedDefinitions})
        definitionCache.set(item.contentHash, definition);
        loaded = true;
      }
    }
  }
  return loaded;
}

/** 中身を読んでいないパーツを, 読んだ中身で埋める (content hash は残す). 埋めるものが無ければ同じ配列を返す */
export function withCachedContents(
  parts: ReadonlyArray<DecodedPart>,
): ReadonlyArray<DecodedPart> {
  const resolvable = (part: DecodedPart) =>
    part.unresolved === true &&
    part.contentHash != null &&
    contentCache.has(part.contentHash);
  if (!parts.some(resolvable)) {
    return parts;
  }
  return parts.map((part) => {
    if (!resolvable(part)) {
      return part;
    }
    const { unresolved: _, ...rest } = part;
    return { ...rest, ...contentCache.get(part.contentHash ?? "") };
  });
}

/** `イベントハッシュ:content hash` → コミットの中で評価したパーツの中身 */
const evaluatedContentCache = new Map<string, PartContent>();

/**
 * 定義の式の content hash → それをコミットの中で評価した中身を `core.define-part` の定義の式にしたときの content hash.
 * 中身を変えずにコミットし直すときに, 元の定義の式を残すのに使う ({@link toContentAddressedParts})
 */
const evaluatedContentByHash = new Map<string, Set<string>>();

/**
 * コミット `eventHash` のパーツのうち, 中身がその場で評価できない定義の式のものを, コミットの中で評価して埋める
 * (docs/part-definition.md). 評価で参照するパーツの式は, コミットのパーツならその中身, 無ければ `external` で引く.
 * 評価器 (`evaluate`) が無いか, 埋めるものが無ければ同じ配列を返す
 */
export function withEvaluatedDefinitions(
  eventHash: string,
  parts: ReadonlyArray<DecodedPart>,
  external: (partId: string) => unknown,
  evaluate: DefinitionEvaluator | undefined,
): ReadonlyArray<DecodedPart> {
  const key = (part: DecodedPart) => `${eventHash}:${part.contentHash ?? ""}`;
  const pending = parts.filter(
    (part) =>
      part.unresolved === true &&
      part.contentHash != null &&
      part.partIdHash != null &&
      definitionCache.has(part.contentHash),
  );
  if (pending.length === 0) {
    return parts;
  }
  if (
    evaluate !== undefined &&
    pending.some((part) => !evaluatedContentCache.has(key(part)))
  ) {
    const expressions = new Map(
      parts.flatMap((part) =>
        part.partIdHash != null && part.unresolved !== true
          ? [[part.partIdHash, part.expression ?? undefined] as const]
          : [],
      ),
    );
    const contents = resolveDefinitionsInCommit({
      definitions: new Map(
        pending.map((part) => [
          part.partIdHash ?? "",
          definitionCache.get(part.contentHash ?? ""),
        ]),
      ),
      external: (id) =>
        expressions.has(id) ? expressions.get(id) : external(id),
      evaluate,
    });
    for (const part of pending) {
      const content = contents.get(part.partIdHash ?? "");
      if (content !== undefined) {
        evaluatedContentCache.set(key(part), content);
        const hash = part.contentHash ?? "";
        const expanded = evaluatedContentByHash.get(hash) ?? new Set<string>();
        expanded.add(partContentItem(content).contentHash);
        evaluatedContentByHash.set(hash, expanded);
      }
    }
  }
  if (!pending.some((part) => evaluatedContentCache.has(key(part)))) {
    return parts;
  }
  return parts.map((part) => {
    const content = pending.includes(part)
      ? evaluatedContentCache.get(key(part))
      : undefined;
    if (content === undefined) {
      return part;
    }
    const { unresolved: _, ...rest } = part;
    return { ...rest, ...content };
  });
}
