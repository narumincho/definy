/**
 * `SubmitEvent` で受け取ったイベントを, 規則 (`core.check-event`. docs/event.md「受け付ける規則」) に渡せる形に読む.
 *
 * 規則そのものは `definy.submit-event` (`wasm/service.wasm`) の中で呼ぶ (docs/service.md). ここでは署名を確かめ,
 * 中身の形を definy 製の `core.value-conforms` (`wasm/shape_checker.wasm`) で確かめ, 規則が使う事実
 * (アカウントを作ったか) をストアから読むだけ. 規則が使う状態は definy の `core.event-check-state-of` が求める
 */
import shapeCheckerModule from "../wasm/shape_checker.wasm?module";
import {
  base64ToBytes,
  decodeCborItem,
  sha256EventHashId,
  toUint8Array,
} from "../src/cbor.ts";
import { conformsInDefiny, contentForCheck } from "../src/event_check.ts";
import type { EventContent } from "../src/event_content.ts";
import { decodeVerifiedSignedEvent } from "../src/signed_event.ts";
import type { PartStoreReader } from "./type_check.ts";
import type { Env } from "./types.ts";

const EVENTS_PAGE_SIZE = 500;

/** そのアカウントの `create_account` をすでに受け付けたか */
export async function isAccountCreated(
  accountId: string,
  store: PartStoreReader,
  env: Env | undefined,
): Promise<boolean> {
  for (let offset = 0; ; offset += EVENTS_PAGE_SIZE) {
    const page = await store.getEvents(
      { eventType: "create_account", limit: EVENTS_PAGE_SIZE, offset },
      env,
    );
    if (page.some((item) => item.accountId === accountId)) {
      return true;
    }
    if (page.length < EVENTS_PAGE_SIZE) {
      return false;
    }
  }
}

/** SignedEvent の内側のイベントの `content` (CBOR から読んだまま). 読めなければ `undefined` */
function rawEventContent(bytes: Uint8Array): unknown {
  try {
    const [signed] = decodeCborItem(bytes);
    const eventBinary = (signed as { readonly event_binary?: unknown })
      .event_binary as { readonly value?: unknown } | undefined;
    const innerBytes = toUint8Array(eventBinary?.value);
    if (innerBytes === undefined) {
      return undefined;
    }
    const [inner] = decodeCborItem(innerBytes);
    return (inner as { readonly content?: unknown }).content;
  } catch {
    return undefined;
  }
}

/** 中身の形が違うと definy (`core.value-conforms`) が判断したときのメッセージ */
export const MALFORMED_CONTENT_MESSAGE =
  "content must be a value of core.event-content";

/** 署名を確かめて読んだイベント (`definy.verified-event`) か, 受け付けない理由 */
type VerifiedEvent =
  | {
      readonly eventHash: string;
      readonly accountId: string;
      /** 規則が見ない説明などを除いた中身 ({@link contentForCheck}) */
      readonly content: EventContent;
      readonly referencedContentHashes: ReadonlyArray<string>;
    }
  | { readonly invalid: string };

/**
 * 受け取ったイベント (Base64) の Ed25519 署名を確かめ, 中身の形を definy 製の `core.value-conforms` で確かめて読む
 * (`definy.service-io` の `verify_signed_event`)
 */
export async function verifySubmittedEvent(
  signedEventBase64: string,
): Promise<VerifiedEvent> {
  let bytes: Uint8Array;
  let decoded: Awaited<ReturnType<typeof decodeVerifiedSignedEvent>>;
  try {
    bytes = base64ToBytes(signedEventBase64);
    decoded = await decodeVerifiedSignedEvent(bytes);
  } catch (e) {
    return { invalid: e instanceof Error ? e.message : String(e) };
  }
  if (
    !conformsInDefiny(
      shapeCheckerModule,
      rawEventContent(bytes),
      "core.event-content",
    )
  ) {
    return { invalid: MALFORMED_CONTENT_MESSAGE };
  }
  return {
    eventHash: await sha256EventHashId(bytes),
    accountId: decoded.meta.accountId,
    content: contentForCheck(decoded.content),
    referencedContentHashes: decoded.meta.referencedContentHashes,
  };
}
