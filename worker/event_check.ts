/**
 * `SubmitEvent` で受け取ったイベントを, definy 製の `core.check-event` の規則で検査する (docs/event.md「受け付ける規則」).
 *
 * 規則は `npm run build:seeds` が seed の `core.check-event` を stage1 でコンパイルした `wasm/event_checker.wasm` を
 * `?module` で取り込んで使う. 型チェッカーと同じく, 本番で `core.check-event` を編集しても seed に書き戻して
 * デプロイするまでサーバーには反映されない. ここでは保存している事実 (アカウントを作ったか, 受け付けたコミット) を
 * ストアから集めて渡すだけで, 規則が使う状態は definy の `core.event-check-state-of` が求める.
 * 中身の形も definy 製の `core.value-conforms` (`wasm/shape_checker.wasm`) で確かめる
 */
import eventCheckerModule from "../wasm/event_checker.wasm?module";
import shapeCheckerModule from "../wasm/shape_checker.wasm?module";
import { base64ToBytes, decodeCborItem, toUint8Array } from "../src/cbor.ts";
import {
  checkEvent,
  conformsInDefiny,
  eventRejectionMessage,
} from "../src/event_check.ts";
import { decodeVerifiedSignedEvent } from "../src/signed_event.ts";
import { loadCommitSummaries, type PartStoreReader } from "./type_check.ts";
import type { Env } from "./types.ts";

const EVENTS_PAGE_SIZE = 500;

/** そのアカウントの `create_account` をすでに受け付けたか */
async function isAccountCreated(
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

/** SignedEvent (Base64) の内側のイベントの `content` (CBOR から読んだまま). 読めなければ `undefined` */
function rawEventContent(signedEventBase64: string): unknown {
  try {
    const [signed] = decodeCborItem(base64ToBytes(signedEventBase64));
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

/**
 * 受け取ったイベント (Base64) を検査し, 受け付けない理由を 1 つ 1 行で返す. 問題なければ空.
 * 中身の形は definy 製の `core.value-conforms` で, 規則は `core.check-event` で確かめる.
 * 署名や CBOR が不正なものは検査しない (`submitEvent` が拒否する)
 */
export async function checkSubmittedEvent(
  signedEventBase64: string,
  store: PartStoreReader,
  env: Env | undefined,
): Promise<ReadonlyArray<string>> {
  const raw = rawEventContent(signedEventBase64);
  if (raw === undefined) {
    return [];
  }
  if (!conformsInDefiny(shapeCheckerModule, raw, "core.event-content")) {
    return [MALFORMED_CONTENT_MESSAGE];
  }
  let decoded: Awaited<ReturnType<typeof decodeVerifiedSignedEvent>>;
  try {
    decoded = await decodeVerifiedSignedEvent(base64ToBytes(signedEventBase64));
  } catch {
    return [];
  }
  const accountId = decoded.meta.accountId;
  const { content } = decoded;
  return checkEvent(eventCheckerModule, content, {
    accountId,
    accountCreated: await isAccountCreated(accountId, store, env),
    // 規則が使う状態 (ブランチの最新のコミットなど) は definy が求める
    commits:
      content.type === "project_commit"
        ? await loadCommitSummaries(store, env)
        : [],
  }).map(eventRejectionMessage);
}
