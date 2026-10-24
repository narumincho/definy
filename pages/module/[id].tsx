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
import type { DecodedCommitEvent } from "../../src/state/useEvents.ts";

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

export default function ModuleDetailPage(): JSX.Element {
  const { id } = useParams<{ id: string }>();
  const {
    language,
    modules,
    parts,
    decodedCommits,
    accountNames,
    selectBranch,
    loadEvent,
  } = useDefiny();

  const mod = modules.find((m) => m.moduleId === id) ?? {
    moduleId: id ?? "unknown",
    name: id ?? "unknown",
    branch: MAIN_BRANCH,
    branches: [],
    description: [],
    latestEventHash: "",
    message: "",
    parts: [],
    updatedAtMs: Date.now(),
  };

  usePageTitle(mod.name);

  const moduleParts = parts.filter((p) => p.moduleId === id);
  /** 表示しているブランチの最新のコミットから親をたどったコミット (新しい順). 分かれる前の main のコミットも入る */
  const { history: moduleCommits, missing } = branchHistory(
    decodedCommits.filter((c) => c.commit.moduleName === id),
    mod.branches.find((b) => b.name === mod.branch)?.latestEventHash ?? null,
  );
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
    <div className="module-detail-view">
      <div className="breadcrumb">
        <Link href="/modules" className="breadcrumb-link">
          {label(language, "Modules", "モジュール", "Moduloj")}
        </Link>
        <span className="breadcrumb-separator">/</span>
        <span className="breadcrumb-current">{mod.name}</span>
      </div>
      <div className="card module-header">
        <h2 className="module-title">{mod.name}</h2>
        {mod.description.length > 0 && (
          <p className="module-desc">
            {localizedText(mod.description, language)}
          </p>
        )}
        {mod.branches.length > 0 && (
          <div className="module-branch">
            <label htmlFor="module-branch-select">
              {label(language, "Branch", "ブランチ", "Branĉo")}
            </label>
            <select
              id="module-branch-select"
              value={mod.branch}
              onChange={(e) => {
                selectBranch(mod.name, e.target.value);
              }}
            >
              {mod.branches.map((branch) => (
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
      </div>

      {moduleCommits.length > 0 && (
        <div className="module-parts-section">
          <h3>{label(language, "Commits", "コミット履歴", "Enmetoj")}</h3>
          <ol className="module-commit-list">
            {moduleCommits.map(({ event, commit }) => (
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

      <div className="module-parts-section">
        <div className="module-parts-heading">
          <h3>
            {label(
              language,
              "Parts in this module",
              "このモジュールのパーツ",
              "Partoj en ĉi tiu modulo",
            )}
          </h3>
          <Link
            href={`/new-part?module=${encodeURIComponent(mod.name)}`}
            className="btn btn-primary btn-xs"
          >
            {label(language, "+ New Part", "+ 新しいパーツ", "+ Nova parto")}
          </Link>
        </div>
        <div className="part-grid">
          {moduleParts.length === 0 ? (
            <p className="text-muted">
              {label(
                language,
                "No parts in this module",
                "パーツがありません",
                "Neniuj partoj",
              )}
            </p>
          ) : (
            moduleParts.map((part) => (
              <Link
                key={part.partId}
                href={`/part/${part.partId}`}
                className="card part-card"
              >
                <strong>{part.name}</strong>
                {part.description.length > 0 && (
                  <p>{localizedText(part.description, language)}</p>
                )}
              </Link>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
