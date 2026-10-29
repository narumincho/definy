import { MAIN_BRANCH } from "./event_content.ts";
import type { DecodedProjectCommit } from "./cbor.ts";
import type { BranchSummary } from "./branches.ts";
import type { ModuleSnapshot, PartSnapshot, ProjectSnapshot } from "./types.ts";

/**
 * エクスプローラーの木 (docs/ui.md「エクスプローラー」): プロジェクト ▸ ブランチ ▸ コミット ▸ モジュール ▸ パーツ.
 * コミットは各ブランチの最新のコミット (ブランチが今指しているもの) だけを出す
 */
export type ExplorerProject = {
  readonly name: string;
  readonly branches: ReadonlyArray<ExplorerBranch>;
};

export type ExplorerBranch = {
  readonly name: string;
  /** 作成者. まだコミットの無い新しいプロジェクトの `main` では `null` */
  readonly creatorAccountId: string | null;
  /** プロジェクトで表示しているブランチか (モジュール・パーツのページはこのブランチを出す) */
  readonly displayed: boolean;
  /** 最新のコミット. まだ読んでいなければ `null` */
  readonly commit: ExplorerCommit | null;
  /** 最新のコミットのハッシュ. まだコミットの無い新しいプロジェクトでは空文字 */
  readonly latestEventHash: string;
};

export type ExplorerCommit = {
  /** まだコミットしていない (新しいプロジェクトの作業中の変更だけ) なら空文字 */
  readonly eventHash: string;
  readonly message: string;
  readonly modules: ReadonlyArray<ExplorerModule>;
};

export type ExplorerModule = {
  readonly name: string;
  readonly parts: ReadonlyArray<ExplorerPart>;
};

export type ExplorerPart = {
  /** `/part/{partId}` の ID (`モジュール名.パーツ名`) */
  readonly partId: string;
  readonly name: string;
  readonly partIdHash: string | null;
};

/**
 * 表示しているブランチは `modules` / `parts` (作業中の変更を重ねたもの) から,
 * 他のブランチは読んだコミット `commitByHash` から作る.
 * `modules` にだけあるプロジェクト (作業中の変更で作った新しいプロジェクト) は `main` の未コミットのコミットにする
 */
export function buildExplorerTree({
  projects,
  modules,
  parts,
  commitByHash,
}: {
  readonly projects: ReadonlyArray<ProjectSnapshot>;
  readonly modules: ReadonlyArray<ModuleSnapshot>;
  readonly parts: ReadonlyArray<PartSnapshot>;
  readonly commitByHash: (eventHash: string) => DecodedProjectCommit | null;
}): ReadonlyArray<ExplorerProject> {
  const displayedModules = (projectName: string): ExplorerModule[] =>
    modules
      .filter((m) => m.projectName === projectName)
      .map((m) => ({
        name: m.name,
        parts: parts
          .filter((p) => p.moduleId === m.moduleId)
          .map((p) => ({
            partId: p.partId,
            name: p.name,
            partIdHash: p.partIdHash,
          })),
      }));

  const branchNode = (
    project: ProjectSnapshot,
    branch: BranchSummary,
  ): ExplorerBranch => {
    const displayed = branch.name === project.branch;
    const decoded = displayed ? null : commitByHash(branch.latestEventHash);
    return {
      name: branch.name,
      creatorAccountId: branch.creatorAccountId,
      displayed,
      latestEventHash: branch.latestEventHash,
      commit: displayed
        ? {
            eventHash: branch.latestEventHash,
            message: project.message,
            modules: displayedModules(project.name),
          }
        : decoded === null
          ? null
          : {
              eventHash: branch.latestEventHash,
              message: decoded.message,
              modules: decoded.modules.map((m) => ({
                name: m.name,
                parts: m.parts.map((p) => ({
                  partId: `${m.name}.${p.name}`,
                  name: p.name,
                  partIdHash: p.partIdHash ?? null,
                })),
              })),
            },
    };
  };

  const committed = projects.map((project): ExplorerProject => ({
    name: project.name,
    // ブランチの一覧をまだ受け取っていなければ, 表示しているブランチだけを出す
    branches: (project.branches.length > 0
      ? project.branches
      : [
          {
            name: project.branch,
            creatorAccountId: "",
            latestEventHash: project.latestEventHash,
            latestTimeMs: project.updatedAtMs,
            commitCount: 0,
          },
        ]
    ).map((branch) => branchNode(project, branch)),
  }));
  const committedNames = new Set(projects.map((p) => p.name));
  const newProjects = [
    ...new Set(
      modules
        .map((m) => m.projectName)
        .filter((name) => !committedNames.has(name)),
    ),
  ].map((name): ExplorerProject => ({
    name,
    branches: [
      {
        name: MAIN_BRANCH,
        creatorAccountId: null,
        displayed: true,
        latestEventHash: "",
        commit: {
          eventHash: "",
          message: "",
          modules: displayedModules(name),
        },
      },
    ],
  }));
  return [...committed, ...newProjects];
}
