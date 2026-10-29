import type { JSX, ReactNode } from "react";
import { Link } from "./Link.tsx";
import {
  BranchIcon,
  CommitIcon,
  ModuleIcon,
  PartsIcon,
  ProjectIcon,
  type IconComponent,
} from "../icons.tsx";
import { label } from "../language.ts";
import { useDefiny } from "../state.tsx";
import { MAIN_BRANCH } from "../event_content.ts";

/**
 * プロジェクト / ブランチ (コミット) / モジュール / パーツ の階層を示すパンくず (docs/ui.md「階層のパンくず」).
 * プロジェクト・モジュール・パーツ・コミットのページの先頭に出す.
 * ブランチはプロジェクトごとに選ぶので, どのページからでもここで切り替えられる
 */
export function HierarchyBreadcrumb({
  projectName,
  moduleName,
  partName,
  commit,
  children,
}: {
  /** 空文字ならプロジェクトとブランチを出さない */
  readonly projectName: string;
  readonly moduleName?: string;
  readonly partName?: string;
  /** コミットのページ: そのコミットのブランチとコミットを出す (表示しているブランチではなく) */
  readonly commit?: { readonly eventHash: string; readonly branch: string };
  /** パンくずの後ろに付けるもの (「編集中の変更あり」のバッジなど) */
  readonly children?: ReactNode;
}): JSX.Element {
  const { language, projects, accountNames, selectBranch } = useDefiny();
  const project = projects.find((p) => p.name === projectName);
  const branch = commit?.branch ?? project?.branch ?? MAIN_BRANCH;
  const branches = project?.branches ?? [];
  const latestCommitHash =
    branches.find((b) => b.name === branch)?.latestEventHash ??
    project?.latestEventHash ??
    "";
  const projectHref = `/project/${encodeURIComponent(projectName)}`;
  const branchLabel = label(language, "Branch", "ブランチ", "Branĉo");
  const isLast = (level: "project" | "branch" | "module" | "part"): boolean =>
    level === "part"
      ? true
      : level === "module"
        ? partName === undefined
        : level === "branch"
          ? commit === undefined &&
            moduleName === undefined &&
            partName === undefined
          : false;

  return (
    <nav
      className="hierarchy-breadcrumb"
      aria-label={label(language, "Location", "現在地", "Loko")}
    >
      <ol className="hierarchy-breadcrumb-list">
        {/* プロジェクトが分からない (読み込み前の新しいモジュールなど) ときはモジュールから出す */}
        {projectName !== "" && (
          <>
            <Segment
              kind={label(language, "Project", "プロジェクト", "Projekto")}
              icon={ProjectIcon}
              level="project"
            >
              <Link href={projectHref} className="hierarchy-name">
                {projectName}
              </Link>
            </Segment>

            <Segment
              kind={branchLabel}
              icon={BranchIcon}
              level="branch"
              current={isLast("branch")}
            >
              {commit === undefined && branches.length > 0 ? (
                <select
                  id="project-branch-select"
                  className="hierarchy-branch-select"
                  aria-label={branchLabel}
                  value={branch}
                  onChange={(e) => {
                    selectBranch(projectName, e.target.value);
                  }}
                >
                  {branches.map((b) => (
                    <option key={b.name} value={b.name}>
                      {b.name} (
                      {accountNames.get(b.creatorAccountId) ??
                        b.creatorAccountId.slice(0, 8)}
                      )
                    </option>
                  ))}
                </select>
              ) : commit !== undefined ? (
                // コミットのブランチを表示してプロジェクトのページを開く
                <Link
                  href={projectHref}
                  className="hierarchy-name"
                  onClick={() => {
                    selectBranch(projectName, commit.branch);
                  }}
                >
                  {branch}
                </Link>
              ) : (
                <span className="hierarchy-name">{branch}</span>
              )}
              {commit === undefined && latestCommitHash !== "" && (
                <Link
                  href={`/event/${latestCommitHash}`}
                  className="hierarchy-commit"
                  title={label(
                    language,
                    "Latest commit of this branch",
                    "このブランチの最新のコミット",
                    "Lasta enmeto de ĉi tiu branĉo",
                  )}
                >
                  <CommitIcon size={13} className="hierarchy-commit-icon" />
                  {latestCommitHash.slice(0, 8)}
                </Link>
              )}
            </Segment>
          </>
        )}

        {commit !== undefined && (
          <Segment
            kind={label(language, "Commit", "コミット", "Enmeto")}
            icon={CommitIcon}
            level="commit"
            current
          >
            <span className="hierarchy-name font-mono">
              {commit.eventHash.slice(0, 8)}
            </span>
          </Segment>
        )}

        {moduleName !== undefined && (
          <Segment
            kind={label(language, "Module", "モジュール", "Modulo")}
            icon={ModuleIcon}
            level="module"
            current={isLast("module")}
          >
            {isLast("module") ? (
              <span className="hierarchy-name">{moduleName}</span>
            ) : (
              <Link
                href={`/module/${encodeURIComponent(moduleName)}`}
                className="hierarchy-name"
              >
                {moduleName}
              </Link>
            )}
          </Segment>
        )}

        {partName !== undefined && (
          <Segment
            kind={label(language, "Part", "パーツ", "Parto")}
            icon={PartsIcon}
            level="part"
            current
          >
            <span className="hierarchy-name">{partName}</span>
          </Segment>
        )}
      </ol>
      {children}
    </nav>
  );
}

function Segment({
  kind,
  icon: Icon,
  level,
  current = false,
  children,
}: {
  readonly kind: string;
  readonly icon: IconComponent;
  readonly level: "project" | "branch" | "commit" | "module" | "part";
  readonly current?: boolean;
  readonly children: ReactNode;
}): JSX.Element {
  return (
    <li
      className="hierarchy-segment"
      data-level={level}
      aria-current={current ? "page" : undefined}
    >
      <Icon size={15} className="hierarchy-icon" />
      <span className="hierarchy-kind">{kind}</span>
      {children}
    </li>
  );
}
