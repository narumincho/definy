import type { JSX } from "react";
import { CHANGES_ONLY_HREF } from "../WorkingChanges.tsx";
import {
  BranchIcon,
  CommitIcon,
  ModuleIcon,
  ProjectIcon,
} from "../../icons.tsx";
import { label } from "../../language.ts";
import type {
  ExplorerBranch,
  ExplorerModule,
  ExplorerPart,
  ExplorerProject,
} from "../../explorer_tree.ts";
import { AddRow, PartNode, TreeRow } from "./TreeRows.tsx";
import { branchKey, commitKey, moduleKey, projectKey } from "./tree_keys.ts";
import type { TreeControls } from "./useExplorerProjectTree.ts";

/** エクスプローラーのプロジェクトの木 (`useExplorerProjectTree` で作ったもの) を描く */
export function ExplorerProjectTree({
  tree,
  c,
}: {
  readonly tree: ReadonlyArray<ExplorerProject>;
  readonly c: TreeControls;
}): JSX.Element {
  const { language, query, closeSidebar } = c;
  return (
    <>
      {query === "" && (
        <AddRow
          level="project"
          href="/new-part"
          text={label(
            language,
            "Add project",
            "プロジェクトの追加",
            "Aldoni projekton",
          )}
          onNavigate={closeSidebar}
        />
      )}
      {tree.map((project) => (
        <ProjectGroup key={project.name} project={project} c={c} />
      ))}
    </>
  );
}

/** プロジェクトの段. 絞り込みに一致するパーツが無ければ出さない */
function ProjectGroup({
  project,
  c,
}: {
  readonly project: ExplorerProject;
  readonly c: TreeControls;
}): JSX.Element | null {
  const pKey = projectKey(project.name);
  const projectOpen = c.query !== "" || c.isOpen(pKey, true);
  const projectHasMatch =
    c.query === "" ||
    project.branches.some((branch) =>
      branch.commit?.modules.some((mod) =>
        mod.parts.some((part) => c.matchesQuery(mod.name, part.name)),
      ),
    );
  if (!projectHasMatch) return null;
  const projectHref = `/project/${encodeURIComponent(project.name)}`;
  return (
    <div className="sidebar-project-group" data-project={project.name}>
      <TreeRow
        level="project"
        open={projectOpen}
        onToggle={() => {
          c.toggle(pKey);
        }}
        href={projectHref}
        icon={ProjectIcon}
        text={project.name}
        current={c.currentBranchQuery === null && c.currentPath === projectHref}
        onNavigate={c.closeSidebar}
        language={c.language}
      />
      {projectOpen && (
        <>
          {c.query === "" &&
            project.branches.some((b) => b.latestEventHash !== "") && (
              <AddRow
                level="branch"
                href={`${projectHref}?add=branch`}
                text={label(
                  c.language,
                  "Add branch",
                  "ブランチの追加",
                  "Aldoni branĉon",
                )}
                onNavigate={c.closeSidebar}
              />
            )}
          {project.branches.map((branch) => (
            <BranchGroup
              key={branch.name}
              projectName={project.name}
              branch={branch}
              c={c}
            />
          ))}
        </>
      )}
    </div>
  );
}

/** ブランチの段とその最新のコミットの段. 絞り込んでいて一致するパーツが無ければ出さない */
function BranchGroup({
  projectName,
  branch,
  c,
}: {
  readonly projectName: string;
  readonly branch: ExplorerBranch;
  readonly c: TreeControls;
}): JSX.Element | null {
  const { language, query } = c;
  const bKey = branchKey(projectName, branch.name);
  const cKey = commitKey(projectName, branch.name);
  const branchOpen = query !== "" || c.isOpen(bKey, branch.displayed);
  const commitOpen = query !== "" || c.isOpen(cKey, branch.displayed);
  const commit = branch.commit;
  const onNavigate = c.navigateIn(projectName, branch.name);
  // ブランチにコミットできるのは作成者だけなので, 中の「追加」は自分のブランチ
  // (とまだコミットの無い新しいプロジェクト) にだけ出す. ブランチの追加は誰でもできる
  const canEdit =
    query === "" &&
    (branch.creatorAccountId === null ||
      branch.creatorAccountId === c.currentAccountId);
  const branchModules =
    commit?.modules
      .map((mod) => ({
        ...mod,
        shownParts:
          query === ""
            ? mod.parts
            : mod.parts.filter((part) => c.matchesQuery(mod.name, part.name)),
      }))
      .filter((mod) => query === "" || mod.shownParts.length > 0) ?? [];
  if (query !== "" && branchModules.length === 0) {
    return null;
  }
  const projectHref = `/project/${encodeURIComponent(projectName)}`;
  return (
    <div className="sidebar-branch-group">
      <TreeRow
        level="branch"
        open={branchOpen}
        onToggle={() => {
          c.toggle(bKey);
        }}
        href={`${projectHref}?branch=${encodeURIComponent(branch.name)}`}
        icon={BranchIcon}
        text={branch.name}
        current={
          c.currentBranchQuery === branch.name && c.currentPath === projectHref
        }
        detail={
          branch.creatorAccountId === null || branch.creatorAccountId === ""
            ? undefined
            : (c.accountNames.get(branch.creatorAccountId) ??
              branch.creatorAccountId.slice(0, 8))
        }
        badge={
          branch.displayed
            ? label(language, "shown", "表示中", "montrata")
            : undefined
        }
        onNavigate={onNavigate}
        language={language}
      />
      {branchOpen && (
        <>
          {canEdit && (
            <AddRow
              level="commit"
              href={CHANGES_ONLY_HREF}
              text={label(
                language,
                "Add commit",
                "コミットの追加",
                "Aldoni enmeton",
              )}
              onNavigate={onNavigate}
            />
          )}
          {commit === null ? (
            <div className="sidebar-tree-loading" data-level="commit">
              {label(language, "Loading...", "読み込み中...", "Ŝargante...")}
            </div>
          ) : (
            <div className="sidebar-commit-group">
              <TreeRow
                level="commit"
                open={commitOpen}
                onToggle={() => {
                  c.toggle(cKey);
                }}
                href={
                  commit.eventHash === ""
                    ? CHANGES_ONLY_HREF
                    : `/event/${commit.eventHash}`
                }
                icon={CommitIcon}
                current={
                  commit.eventHash !== "" &&
                  c.currentPath === `/event/${commit.eventHash}`
                }
                text={
                  commit.eventHash === ""
                    ? label(
                        language,
                        "Not committed",
                        "未コミット",
                        "Neenmetita",
                      )
                    : commit.eventHash.slice(0, 8)
                }
                mono={commit.eventHash !== ""}
                detail={commit.message}
                onNavigate={c.closeSidebar}
                language={language}
              />
              {commitOpen && (
                <>
                  {canEdit && (
                    <AddRow
                      level="module"
                      href={`/new-part?project=${encodeURIComponent(projectName)}`}
                      text={label(
                        language,
                        "Add module",
                        "モジュールの追加",
                        "Aldoni modulon",
                      )}
                      onNavigate={onNavigate}
                    />
                  )}
                  {branchModules.map((mod) => (
                    <ModuleGroup
                      key={mod.name}
                      projectName={projectName}
                      branch={branch}
                      mod={mod}
                      shownParts={mod.shownParts}
                      canEdit={canEdit}
                      onNavigate={onNavigate}
                      c={c}
                    />
                  ))}
                </>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}

/** モジュールの段とその中のパーツ. `shownParts` は絞り込みに一致したパーツ */
function ModuleGroup({
  projectName,
  branch,
  mod,
  shownParts,
  canEdit,
  onNavigate,
  c,
}: {
  readonly projectName: string;
  readonly branch: ExplorerBranch;
  readonly mod: ExplorerModule;
  readonly shownParts: ReadonlyArray<ExplorerPart>;
  readonly canEdit: boolean;
  /** 表示していないブランチの中のリンクを開く (そのブランチを表示してから開く) */
  readonly onNavigate: () => void;
  readonly c: TreeControls;
}): JSX.Element {
  const mKey = moduleKey(projectName, branch.name, mod.name);
  const moduleOpen = c.query !== "" || c.isOpen(mKey, branch.displayed);
  const moduleTypeErrorCount = branch.displayed
    ? mod.parts.filter((p) => c.typeErrorOf(p) !== null).length
    : 0;
  const moduleHref = `/module/${encodeURIComponent(mod.name)}`;
  return (
    <div className="sidebar-module-group">
      <TreeRow
        level="module"
        open={moduleOpen}
        onToggle={() => {
          c.toggle(mKey);
        }}
        href={moduleHref}
        icon={ModuleIcon}
        text={mod.name}
        current={branch.displayed && c.currentPath === moduleHref}
        typeErrorCount={moduleTypeErrorCount}
        count={mod.parts.length}
        onNavigate={onNavigate}
        language={c.language}
      />
      {moduleOpen && (
        <div className="sidebar-module-parts">
          {canEdit && (
            <AddRow
              level="part"
              href={`/new-part?module=${encodeURIComponent(mod.name)}`}
              text={label(
                c.language,
                "Add part",
                "パーツの追加",
                "Aldoni parton",
              )}
              onNavigate={onNavigate}
            />
          )}
          {shownParts.map((part) => {
            // 作業中の変更は表示しているブランチに重ねている
            const change = branch.displayed
              ? c.workingChanges.parts.get(part.partId)
              : undefined;
            return (
              <PartNode
                key={part.partId}
                partId={part.partId}
                name={change?.name ?? part.name}
                deleted={change?.deleted === true}
                isChanged={change !== undefined}
                typeError={branch.displayed ? c.typeErrorOf(part) : null}
                isSelected={
                  branch.displayed && part.partId === c.selectedPartId
                }
                onNavigate={branch.displayed ? c.closeSidebar : onNavigate}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
