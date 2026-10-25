import { useState, type JSX } from "react";
import { Link } from "./Link.tsx";
import { CHANGES_ONLY_HREF } from "./WorkingChanges.tsx";
import { label } from "../language.ts";
import { useDefiny } from "../state.tsx";
import { MAIN_BRANCH } from "../event_content.ts";
import {
  findMergeBase,
  hasWorkingChangesIn,
  mergeParts,
  mergeToWorkingChanges,
  type MergeCommit,
} from "../merge.ts";
import type { ProjectSnapshot } from "../types.ts";
import type { DecodedCommitEvent } from "../state/useEvents.ts";

/** 取り込みに使うコミット. パーツはプロジェクトの全モジュールのものを `モジュール名.パーツ名` で並べる */
function toMergeCommit({ event, commit }: DecodedCommitEvent): MergeCommit {
  return {
    eventHash: event.eventHash,
    parentCommitHash: commit.parentCommitHash,
    mergedCommitHash: commit.mergedCommitHash,
    parts: commit.modules.flatMap((module) =>
      module.parts.map((part) => ({
        ...part,
        name: `${module.name}.${part.name}`,
      })),
    ),
  };
}

type MergeState =
  | { readonly status: "idle" }
  | { readonly status: "merging" }
  | { readonly status: "nothing" }
  | { readonly status: "blocked" }
  | { readonly status: "failed"; readonly message: string };

/**
 * 表示している (他のアカウントの) ブランチを main に取り込む (docs/branch.md「取り込み」).
 * main を作ったアカウントにだけ出す. 取り込んだ後のパーツへの変更を作業中の変更にし, 変更のページでコミットする
 */
export function MergeBranchPanel({
  project,
  onStarted,
}: {
  readonly project: ProjectSnapshot;
  /** 取り込みを始めた. `conflicts` は両方のブランチで違うように変えたパーツ (取り込む側を使った) */
  readonly onStarted: (conflicts: ReadonlyArray<string>) => void;
}): JSX.Element | null {
  const {
    language,
    currentAccount,
    workingChanges,
    fetchCommit,
    startMerge,
    selectBranch,
  } = useDefiny();
  const [state, setState] = useState<MergeState>({ status: "idle" });

  const main = project.branches.find((b) => b.name === MAIN_BRANCH);
  const theirs = project.branches.find((b) => b.name === project.branch);
  if (
    currentAccount === null ||
    main === undefined ||
    theirs === undefined ||
    theirs.name === MAIN_BRANCH ||
    main.creatorAccountId !== currentAccount.accountId
  ) {
    return null;
  }

  const handleMerge = async (): Promise<void> => {
    if (
      hasWorkingChangesIn(project.name, project.moduleNames, workingChanges)
    ) {
      setState({ status: "blocked" });
      return;
    }
    setState({ status: "merging" });
    try {
      const getCommit = async (hash: string) => {
        const commit = await fetchCommit(hash);
        return commit === null ? null : toMergeCommit(commit);
      };
      const [ours, their, base] = await Promise.all([
        getCommit(main.latestEventHash),
        getCommit(theirs.latestEventHash),
        findMergeBase(main.latestEventHash, theirs.latestEventHash, getCommit),
      ]);
      if (ours === null || their === null) {
        throw new Error("could not read the latest commits");
      }
      const result = mergeParts(base?.parts ?? [], ours.parts, their.parts);
      const changes = mergeToWorkingChanges(ours.parts, result.parts);
      if (changes.size === 0) {
        setState({ status: "nothing" });
        return;
      }
      startMerge(project.name, their.eventHash, changes);
      // 取り込んだ変更は main に重ねてコミットする
      selectBranch(project.name, MAIN_BRANCH);
      setState({ status: "idle" });
      onStarted(result.conflicts);
    } catch (e) {
      setState({
        status: "failed",
        message: e instanceof Error ? e.message : String(e),
      });
    }
  };

  return (
    <div className="module-merge">
      <button
        type="button"
        className="btn btn-primary btn-sm module-merge-button"
        disabled={state.status === "merging"}
        onClick={() => {
          void handleMerge();
        }}
      >
        {label(
          language,
          `Merge '${theirs.name}' into main`,
          `「${theirs.name}」を main に取り込む`,
          `Kunfandi '${theirs.name}' en main`,
        )}
      </button>
      {state.status === "blocked" && (
        <p className="text-muted">
          {label(
            language,
            "This project has uncommitted changes. Commit or discard them first.",
            "このプロジェクトには作業中の変更があります。先にコミットするか破棄してください。",
            "Ĉi tiu projekto havas neenmetitajn ŝanĝojn.",
          )}
        </p>
      )}
      {state.status === "nothing" && (
        <p className="text-muted">
          {label(
            language,
            "Nothing to merge: main already has the changes of this branch.",
            "取り込むものはありません (main にこのブランチの変更が入っています)。",
            "Nenio por kunfandi.",
          )}
        </p>
      )}
      {state.status === "failed" && (
        <p className="text-muted">{state.message}</p>
      )}
    </div>
  );
}

/** 取り込みを始めた後の知らせ (main に切り替わった後も出すので, プロジェクトのページが持つ) */
export function MergeStartedNotice({
  projectName,
  conflicts,
}: {
  readonly projectName: string;
  readonly conflicts: ReadonlyArray<string>;
}): JSX.Element | null {
  const { language, workingChanges, cancelMerge } = useDefiny();
  const merged = workingChanges.merges?.get(projectName);
  if (merged === undefined) return null;
  return (
    <div className="alert alert-success module-merge-notice" role="status">
      {label(
        language,
        `Merging commit ${merged.slice(0, 8)} into main. Review the changes and commit them.`,
        `コミット ${merged.slice(0, 8)} を main に取り込んでいます。変更を確かめてコミットしてください。`,
        `Kunfandante enmeton ${merged.slice(0, 8)} en main.`,
      )}{" "}
      {conflicts.length > 0 && (
        <span className="module-merge-conflicts">
          {label(
            language,
            `Changed differently on both branches (the merged branch's version is used): ${conflicts.join(", ")}.`,
            `両方のブランチで違うように変えたパーツ (取り込む側を使いました): ${conflicts.join(", ")}。`,
            `Ŝanĝitaj malsame en ambaŭ branĉoj: ${conflicts.join(", ")}.`,
          )}{" "}
        </span>
      )}
      <Link href={CHANGES_ONLY_HREF} className="btn btn-primary btn-xs">
        {label(language, "Review changes", "変更を見る", "Vidi ŝanĝojn")}
      </Link>{" "}
      <button
        type="button"
        className="btn btn-secondary btn-xs"
        onClick={() => {
          cancelMerge(projectName);
        }}
      >
        {label(language, "Cancel merge", "取り込みをやめる", "Nuligi")}
      </button>
    </div>
  );
}
