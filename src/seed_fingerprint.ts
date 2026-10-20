/**
 * seed バンドルの指紋. イベントと CAS の内容がすべて同じなら同じ値になる.
 * `npm run build:seeds` が seed バンドルと `seeds/seed_bundle_fingerprint.json` に書き,
 * Worker は D1 に記録した指紋と比べて, 違えば seed を入れ直す (`worker/store.ts`)
 */
import { bytesToUrlSafeBase64NoPad, sha256Bytes } from "./cbor.ts";

export async function seedBundleFingerprint(bundle: {
  readonly events: ReadonlyArray<{ readonly eventHash: string }>;
  readonly contents: ReadonlyArray<{
    readonly contentHash: string;
    readonly contentBytes: string;
  }>;
}): Promise<string> {
  const text = JSON.stringify({
    events: bundle.events.map((event) => event.eventHash),
    contents: bundle.contents.map((content) => [
      content.contentHash,
      content.contentBytes,
    ]),
  });
  return bytesToUrlSafeBase64NoPad(
    await sha256Bytes(new TextEncoder().encode(text)),
  );
}
