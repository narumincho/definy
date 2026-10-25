import { useEffect, useState, type JSX } from "react";
import { useParams } from "@void/react";
import { Link } from "../../src/components/Link.tsx";
import {
  AccountLink,
  dateLocale,
} from "../../src/components/EventTimeline.tsx";
import { label, localizedText } from "../../src/language.ts";
import { useDefiny } from "../../src/state.tsx";
import { usePageTitle } from "../../src/page_title.ts";
import { MAIN_BRANCH } from "../../src/event_content.ts";
import {
  MergeBranchPanel,
  MergeStartedNotice,
} from "../../src/components/MergeBranchPanel.tsx";
import type { DecodedCommitEvent } from "../../src/state/useEvents.ts";
import type { ProjectSnapshot } from "../../src/types.ts";

/** コミット履歴に出す最大の数 (古いコミットは 1 件ずつ読むので上限を置く) */
const HISTORY_LIMIT = 50;

/**
 * `latest` から `parentCommitHash` をたどったコミット (新しい順) と, まだ読んでいない次のコミット.
 * 全イベントは読まないので, 足りないコミットは `loadEvent` で読む
 */
function branchHistory(
  commits: ReadonlyArray<DecodedCommitEvent>,
  latest: string | null,
): {
  readonly history: ReadonlyArray<DecodedCommitEvent>;
  readonly missing: string | null;
} {
  const byHash = new Map(commits.map((c) => [c.event.eventHash, c]));
  const history: DecodedCommitEvent[] = [];
  const visited = new Set<string>();
  let hash = latest;
  while (
    hash !== null &&
    !visited.has(hash) &&
    history.length < HISTORY_LIMIT
  ) {
    visited.add(hash);
    const commit = byHash.get(hash);
    if (commit === undefined) {
      return { history, missing: hash };
    }
    history.push(commit);
    hash = commit.commit.parentCommitHash;
  }
  return { history, missing: null };
}

/**
 * プロジェクトのページ (`/project/プロジェクト名`. docs/project.md). モジュールの一覧, ブランチ, 取り込み, コミット履歴
 */
export default function ProjectDetailPage(): JSX.Element {
  const { id } = useParams<{ id: string }>();
  const {
    language,
    projects,
    modules,
    decodedCommits,
    accountNames,
    selectBranch,
    loadEvent,
  } = useDefiny();

  const project: ProjectSnapshot = projects.find((p) => p.name === id) ?? {
    name: id ?? "unknown",
    branch: MAIN_BRANCH,
    branches: [],
    description: [],
    latestEventHash: "",
    parentCommitHash: null,
    message: "",
    moduleNames: [],
    updatedAtMs: Date.now(),
  };

  usePageTitle(project.name);
  const [mergeConflicts, setMergeConflicts] = useState<ReadonlyArray<string>>(
    [],
  );

  /** 表示しているブランチの最新のコミットから親をたどったコミット (新しい順). 分かれる前の main のコミットも入る */
  const { history: projectCommits, missing } = branchHistory(
    decodedCommits.filter((c) => c.commit.projectName === id),
    project.branches.find((b) => b.name === project.branch)?.latestEventHash ??
      null,
  );
  const projectModules = project.moduleNames.flatMap((name) => {
    const mod = modules.find((m) => m.name === name);
    return mod === undefined ? [] : [mod];
  });
  // 読んでいない古いコミットを 1 件ずつ読む. 見つからなければ (消えた・不正) そこで止める
  const [unavailable, setUnavailable] = useState<ReadonlySet<string>>(
    () => new Set(),
  );
  useEffect(() => {
    if (missing === null || unavailable.has(missing)) return;
    let cancelled = false;
    void loadEvent(missing).then((found) => {
      if (!found && !cancelled) {
        setUnavailable((prev) => new Set(prev).add(missing));
      }
    });
    return () => {
      cancelled = true;
    };
  }, [missing, unavailable, loadEvent]);

  return (
    <div className="module-detail-view project-detail-view">
      <div className="breadcrumb">
        <Link href="/modules" className="breadcrumb-link">
          {label(language, "Modules", "モジュール", "Moduloj")}
        </Link>
        <span className="breadcrumb-separator">/</span>
        <span className="breadcrumb-current">{project.name}</span>
      </div>
      <div className="card module-header">
        <span className="badge badge-secondary">
          {label(language, "Project", "プロジェクト", "Projekto")}
        </span>
        <h2 className="module-title">{project.name}</h2>
        {project.description.length > 0 && (
          <p className="module-desc">
            {localizedText(project.description, language)}
          </p>
        )}
        {project.branches.length > 0 && (
          <div className="module-branch">
            <label htmlFor="project-branch-select">
              {label(language, "Branch", "ブランチ", "Branĉo")}
            </label>
            <select
              id="project-branch-select"
              value={project.branch}
              onChange={(e) => {
                selectBranch(project.name, e.target.value);
              }}
            >
              {project.branches.map((branch) => (
                <option key={branch.name} value={branch.name}>
                  {branch.name} (
                  {accountNames.get(branch.creatorAccountId) ??
                    branch.creatorAccountId.slice(0, 8)}
                  )
                </option>
              ))}
            </select>
            <span className="text-muted">
              {label(
                language,
                "Only the creator of a branch can commit to it. Committing from another account's branch creates a new branch.",
                "ブランチにはそのブランチを作ったアカウントだけがコミットできます。他のアカウントのブランチからコミットすると新しいブランチを作ります。",
                "Nur la kreinto de branĉo povas enmeti al ĝi. Enmeto de alies branĉo kreas novan branĉon.",
              )}
            </span>
          </div>
        )}
        <MergeBranchPanel project={project} onStarted={setMergeConflicts} />
      </div>

      <MergeStartedNotice
        projectName={project.name}
        conflicts={mergeConflicts}
      />

      <div className="module-parts-section">
        <h3>
          {label(
            language,
            "Modules in this project",
            "このプロジェクトのモジュール",
            "Moduloj en ĉi tiu projekto",
          )}
        </h3>
        <div className="part-grid">
          {projectModules.length === 0 ? (
            <p className="text-muted">
              {label(
                language,
                "No modules in this project",
                "モジュールがありません",
                "Neniuj moduloj",
              )}
            </p>
          ) : (
            projectModules.map((mod) => (
              <Link
                key={mod.name}
                href={`/module/${mod.moduleId}`}
                className="card part-card project-module-card"
              >
                <strong>{mod.name}</strong>
                {mod.description.length > 0 && (
                  <p>{localizedText(mod.description, language)}</p>
                )}
              </Link>
            ))
          )}
        </div>
      </div>

      {projectCommits.length > 0 && (
        <div className="module-parts-section">
          <h3>{label(language, "Commits", "コミット履歴", "Enmetoj")}</h3>
          <ol className="module-commit-list">
            {projectCommits.map(({ event, commit }) => (
              <li key={event.eventHash} className="module-commit">
                <Link
                  href={`/event/${event.eventHash}`}
                  className="module-commit-message"
                >
                  {commit.message.length > 0
                    ? commit.message
                    : label(
                        language,
                        "(no message)",
                        "(メッセージなし)",
                        "(sen mesaĝo)",
                      )}
                </Link>
                <span className="module-commit-meta">
                  {commit.mergedCommitHash !== null && (
                    <Link
                      href={`/event/${commit.mergedCommitHash}`}
                      className="badge badge-success"
                    >
                      {label(language, "Merge", "取り込み", "Kunfando")}{" "}
                      {commit.mergedCommitHash.slice(0, 8)}
                    </Link>
                  )}
                  <AccountLink accountId={event.accountId} />
                  <time dateTime={event.createdAtRfc3339}>
                    {new Date(event.timeMs).toLocaleString(
                      dateLocale(language),
                      { dateStyle: "medium", timeStyle: "short" },
                    )}
                  </time>
                  <Link
                    href={`/event/${event.eventHash}`}
                    className="event-hash"
                  >
                    {event.eventHash.slice(0, 8)}
                  </Link>
                </span>
              </li>
            ))}
          </ol>
        </div>
      )}
    </div>
  );
}
