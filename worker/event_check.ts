/**
 * `SubmitEvent` で受け取ったイベントを, definy 製の `core.check-event` の規則で検査する (docs/event.md「受け付ける規則」).
 *
 * 規則は `npm run build:seeds` が seed の `core.check-event` を stage1 でコンパイルした `wasm/event_checker.wasm` を
 * `?module` で取り込んで使う. 型チェッカーと同じく, 本番で `core.check-event` を編集しても seed に書き戻して
 * デプロイするまでサーバーには反映されない. ここでは規則が使う状態をストアから集めるだけ
 */
import eventCheckerModule from "../wasm/event_checker.wasm?module";
import { base64ToBytes } from "../src/cbor.ts";
import {
  checkEvent,
  eventRejectionMessage,
  NO_MODULE_STATE,
} from "../src/event_check.ts";
import { decodeVerifiedSignedEvent } from "../src/signed_event.ts";
import { deriveModuleIdBytes } from "./cbor.ts";
import { branchStateOf, type PartStoreReader } from "./type_check.ts";
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

/**
 * 受け取ったイベント (Base64) を `core.check-event` で検査し, 受け付けない理由を 1 つ 1 行で返す. 問題なければ空.
 * 署名や形式が不正なものは検査しない (`submitEvent` が拒否する)
 */
export async function checkSubmittedEvent(
  signedEventBase64: string,
  store: PartStoreReader,
  env: Env | undefined,
): Promise<ReadonlyArray<string>> {
  let decoded: Awaited<ReturnType<typeof decodeVerifiedSignedEvent>>;
  try {
    decoded = await decodeVerifiedSignedEvent(base64ToBytes(signedEventBase64));
  } catch {
    return [];
  }
  // ストアのイベントの accountId と同じ形 (署名済みイベントのメタデータ)
  const accountId = decoded.meta.accountId;
  const { content } = decoded;
  const moduleState =
    content.type === "module_commit"
      ? await branchStateOf(
          await deriveModuleIdBytes(content.commit.moduleName),
          content.commit.branch,
          accountId,
          content.commit.parentCommitHash,
          content.commit.mergedCommitHash,
          store,
          env,
        )
      : NO_MODULE_STATE;
  return checkEvent(eventCheckerModule, content, {
    accountCreated: await isAccountCreated(accountId, store, env),
    ...moduleState,
  }).map(eventRejectionMessage);
}
