/**
 * CAS (content-addressed storage) に預けたパーツの式 (docs/content-addressed.md「差分ハッシュ・ネゴシエーション方式」).
 * コミットには式の content hash だけを入れ, 式は `UploadContent` / `GetContent` でやり取りする
 */
import {
  base64ToBytes,
  bytesToBase64,
  decodeCborItem,
  encodeCborItem,
  sha256EventHashId,
  sha256EventHashIdSync,
  type DecodedPart,
} from "./cbor.ts";

/** 1 回の `GetContent` で読む content hash の数 */
const GET_CONTENT_CHUNK_SIZE = 200;

/** CAS に預ける式 1 つ (`UploadContent` の項目) */
export type ContentItem = {
  readonly contentHash: string;
  /** 式の CBOR (Base64) */
  readonly contentBytes: string;
};

/**
 * コミットするパーツの式を content hash に置き換える. 新しい式は `contents` (content hash → 中身) に集める.
 * もう content hash を持つパーツはそのハッシュを使う
 */
export async function toContentAddressedParts(
  parts: ReadonlyArray<DecodedPart>,
): Promise<{
  readonly parts: ReadonlyArray<DecodedPart>;
  readonly contents: ReadonlyMap<string, ContentItem>;
}> {
  const contents = new Map<string, ContentItem>();
  const result: DecodedPart[] = [];
  for (const part of parts) {
    // content hash を持つパーツ (変えていない) はサーバーの CAS にあるので, 式を符号化し直さずそのハッシュを使う
    if (part.expression == null || part.contentHash != null) {
      result.push({ ...part, expression: null });
      continue;
    }
    const bytes = encodeCborItem(part.expression);
    const contentHash = await sha256EventHashId(bytes);
    contents.set(contentHash, {
      contentHash,
      contentBytes: bytesToBase64(bytes),
    });
    result.push({ ...part, expression: null, contentHash });
  }
  return { parts: result, contents };
}

/** content hash → 式. 中身は変わらないので, 読んだものはページを開いている間ずっと使う */
const contentCache = new Map<string, unknown>();

/** 読んだ式 (無ければ `undefined`) */
export function cachedContent(contentHash: string): unknown {
  return contentCache.get(contentHash);
}

/** パーツのうち, 式を CAS から読む必要があるものの content hash (読んだものは除く) */
export function missingContentHashes(
  parts: ReadonlyArray<DecodedPart>,
): ReadonlyArray<string> {
  const hashes = new Set<string>();
  for (const part of parts) {
    if (
      part.expression == null &&
      part.contentHash != null &&
      !contentCache.has(part.contentHash)
    ) {
      hashes.add(part.contentHash);
    }
  }
  return [...hashes];
}

/**
 * `GetContent` で式を読んでキャッシュに入れる. サーバーを信用せず, 中身の SHA-256 が content hash と
 * 一致するものだけを使う. 読めたものが 1 つでもあれば `true`
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
      contentCache.set(item.contentHash, decodeCborItem(bytes)[0]);
      loaded = true;
    }
  }
  return loaded;
}

/** CAS に預けた式を読んだもので埋める (content hash は残す). 埋めるものが無ければ同じ配列を返す */
export function withCachedContents(
  parts: ReadonlyArray<DecodedPart>,
): ReadonlyArray<DecodedPart> {
  if (
    !parts.some(
      (part) =>
        part.expression == null &&
        part.contentHash != null &&
        contentCache.has(part.contentHash),
    )
  ) {
    return parts;
  }
  return parts.map((part) =>
    part.expression == null &&
    part.contentHash != null &&
    contentCache.has(part.contentHash)
      ? { ...part, expression: contentCache.get(part.contentHash) }
      : part,
  );
}
