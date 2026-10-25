/**
 * 署名を確かめた後のイベントを受け付けるかを, definy 製の `core.check-event` で決める (docs/event.md「受け付ける規則」).
 *
 * `core.check-event` は `npm run build:seeds` が stage1 でコンパイルした `wasm/event_checker.wasm` を使う
 * (Cloudflare Workers は実行時に Wasm をコンパイルできない). TypeScript 側は, 規則が使う状態
 * (アカウントを作ったか, コミット先のブランチの最新のコミットと作成者など. docs/branch.md) を集めて渡し, 返った理由をメッセージにするだけ
 */
import { none, some, variant, variantOf } from "./definy_value.ts";
import { encodeEventContent, type EventContent } from "./event_content.ts";
import {
  collectReferencedParts,
  instantiateCompiledFunction,
  type Stage1CompilerInstance,
} from "./stage1_compiler.ts";

/** イベントを受け付ける前にサーバーが知っていること (`core.event-check-state`. docs/branch.md) */
export type EventCheckState = {
  /** このイベントのアカウントの `create_account` を受け付けたか */
  readonly accountCreated: boolean;
  /** モジュールのコミットなら, コミット先のブランチの最新のコミットのイベントハッシュ. 新しいブランチなら `null` */
  readonly branchLatestCommitHash: string | null;
  /** このイベントのアカウントがコミット先のブランチを作ったか (ブランチの最初のコミットのアカウントか) */
  readonly isBranchCreator: boolean;
  /** `merged_commit_hash` がコミット先のモジュールのコミットか. 取り込みでなければ `false` */
  readonly mergedInModule: boolean;
  /** コミット先のモジュールに (どのブランチにでも) コミットがあるか */
  readonly moduleHasCommits: boolean;
  /** `parent_commit_hash` がコミット先のモジュールの (どのブランチの) コミットか. 親が無ければ `false` */
  readonly parentInModule: boolean;
};

/** モジュールのコミット以外のイベントの状態 (使わない値) */
export const NO_MODULE_STATE: Omit<EventCheckState, "accountCreated"> = {
  branchLatestCommitHash: null,
  isBranchCreator: false,
  mergedInModule: false,
  moduleHasCommits: false,
  parentInModule: false,
};

/** `core.event-rejection` の値. `tag` はバリアント名 (`parent_commit_mismatch` など) */
export type EventRejection = {
  readonly tag: string;
  readonly payload: unknown;
};

/**
 * `core.check-event` を stage1 で Wasm にコンパイルする. `resolvePart` はパーツ ID (URL-safe Base64) から式を返す
 */
export function compileEventChecker(options: {
  readonly compiler: Stage1CompilerInstance;
  readonly checkEventPartId: string;
  readonly resolvePart: (id: string) => unknown;
}): Uint8Array {
  const expression = variant("part_reference", {
    part_definition_event_hash: options.checkEventPartId,
  });
  const { parts, unresolved } = collectReferencedParts(
    expression,
    options.resolvePart,
  );
  if (unresolved.length > 0) {
    throw new Error(
      `core.check-event references parts that cannot be compiled: ${unresolved.join(", ")}`,
    );
  }
  return options.compiler.compile(expression, parts);
}

/**
 * 規則が見ない式・型・説明を除いたイベントの中身. core のコミット (式で数 MB) をそのまま線形メモリに書くと重いため
 */
function contentForCheck(content: EventContent): EventContent {
  if (content.type !== "module_commit") {
    return content;
  }
  return {
    type: "module_commit",
    commit: {
      ...content.commit,
      moduleDescription: [],
      message: "",
      parts: content.commit.parts.map((part) => ({
        name: part.name,
        description: [],
        partType: null,
        expression: null,
        contentHash: null,
      })),
    },
  };
}

/** `core.check-event` (コンパイルした `checker`) でイベントを検査し, 受け付けない理由を返す. 空なら受け付ける */
export function checkEvent(
  checker: WebAssembly.Module,
  content: EventContent,
  state: EventCheckState,
): ReadonlyArray<EventRejection> {
  const instance = instantiateCompiledFunction(checker);
  const result = instance.read(
    instance.call([
      instance.writeArgument(encodeEventContent(contentForCheck(content))),
      instance.writeArgument({
        account_created: state.accountCreated,
        branch_latest_commit_hash:
          state.branchLatestCommitHash === null
            ? none()
            : some(state.branchLatestCommitHash),
        is_branch_creator: state.isBranchCreator,
        merged_in_module: state.mergedInModule,
        module_has_commits: state.moduleHasCommits,
        parent_in_module: state.parentInModule,
      }),
    ]),
  );
  if (!Array.isArray(result)) {
    throw new Error("core.check-event returned a non-list value");
  }
  return result.map((item) => {
    const tagged = variantOf(item);
    if (tagged === undefined) {
      throw new Error("core.check-event returned a non-variant rejection");
    }
    return { tag: tagged.tag, payload: tagged.payload };
  });
}

/** 受け付けない理由のメッセージ (英語. Connect-RPC のエラーメッセージにする) */
export function eventRejectionMessage(rejection: EventRejection): string {
  switch (rejection.tag) {
    case "account_already_created":
      return "the account has already been created";
    case "account_not_created":
      return "the account has not been created (submit create_account first)";
    case "empty_account_name":
      return "the account name is empty";
    case "empty_module_name":
      return "the module name is empty";
    case "empty_branch_name":
      return "the branch name is empty";
    case "first_branch_must_be_main":
      return "the first commit of a module must be on the main branch";
    case "not_branch_creator":
      return "only the account that created the branch can commit to it (create a new branch instead)";
    case "merged_commit_not_in_module":
      return "merged_commit_hash must be a commit of the same module";
    case "parent_commit_mismatch":
      return "parent_commit_hash must be the latest commit of the branch, or a commit of the module for a new branch (fetch the latest events and commit again)";
    case "empty_part_name":
      return "a part name is empty";
    case "duplicate_part_name":
      return `the part name '${String(rejection.payload)}' is duplicated`;
  }
  return `rejected: ${rejection.tag}`;
}
