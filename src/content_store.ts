/**
 * CAS (content-addressed storage) に預けたパーツの中身 (説明・公開/非公開・型・式. `core.part-content`.
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
import {
  DEFAULT_VISIBILITY,
  decodePartContent,
  encodePartContent,
  type PartContent,
} from "./event_content.ts";

/** 1 回の `GetContent` で読む content hash の数 */
const GET_CONTENT_CHUNK_SIZE = 200;

/** CAS に預ける中身 1 つ (`UploadContent` の項目) */
export type ContentItem = {
  readonly contentHash: string;
  /** 中身の CBOR (Base64) */
  readonly contentBytes: string;
};

/** パーツの中身を CAS に預ける形にする */
export function partContentItem(content: PartContent): ContentItem {
  const bytes = encodeCborItem(encodePartContent(content));
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
    const item = partContentItem(content);
    contents.set(item.contentHash, item);
    contentCache.set(item.contentHash, content);
    return { ...part, contentHash: item.contentHash };
  });
  return { parts: result, contents };
}

/** content hash → パーツの中身. 中身は変わらないので, 読んだものはページを開いている間ずっと使う */
const contentCache = new Map<string, PartContent>();

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
      !contentCache.has(part.contentHash)
    ) {
      hashes.add(part.contentHash);
    }
  }
  return [...hashes];
}

/**
 * `GetContent` でパーツの中身を読んでキャッシュに入れる. サーバーを信用せず, 中身の SHA-256 が content hash と
 * 一致し, `core.part-content` の形のものだけを使う. 読めたものが 1 つでもあれば `true`
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
      const content = decodePartContent(decodeCborItem(bytes)[0]);
      if (content === undefined) {
        continue;
      }
      contentCache.set(item.contentHash, content);
      loaded = true;
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
