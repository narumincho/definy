import { describe, expect, test } from "vitest";
import { buildExplorerTree } from "./explorer_tree.ts";
import type { DecodedProjectCommit } from "./cbor.ts";
import type { ModuleSnapshot, PartSnapshot, ProjectSnapshot } from "./types.ts";

const branch = (name: string, latestEventHash: string) => ({
  name,
  creatorAccountId: `${name}-creator`,
  latestEventHash,
  latestTimeMs: 0,
  commitCount: 1,
});

const project: ProjectSnapshot = {
  name: "app",
  branch: "main",
  branches: [branch("main", "h-main"), branch("bob", "h-bob")],
  description: [],
  latestEventHash: "h-main",
  parentCommitHash: null,
  message: "main commit",
  moduleNames: ["app"],
  updatedAtMs: 0,
};

const moduleOf = (name: string, projectName: string): ModuleSnapshot => ({
  moduleId: name,
  name,
  projectName,
  branch: "main",
  branches: [],
  description: [],
  visibility: "public",
  latestEventHash: "",
  parentCommitHash: null,
  message: "",
  parts: [],
  updatedAtMs: 0,
});

const partOf = (moduleName: string, name: string): PartSnapshot => ({
  partId: `${moduleName}.${name}`,
  moduleId: moduleName,
  moduleName,
  name,
  description: [],
  visibility: "public",
  partType: null,
  contentHash: null,
  partIdHash: null,
  expression: null,
  updatedAtMs: 0,
});

const bobCommit: DecodedProjectCommit = {
  projectName: "app",
  branch: "bob",
  projectDescription: [],
  message: "bob commit",
  parentCommitHash: "h-main",
  mergedCommitHash: null,
  modules: [
    {
      name: "app",
      moduleIdHash: null,
      description: [],
      visibility: "public",
      parts: [{ name: "b", description: [], partType: null }],
    },
  ],
};

describe("buildExplorerTree", () => {
  test("表示しているブランチは作業中の変更を重ねたパーツ, 他のブランチは読んだコミットから作る", () => {
    const tree = buildExplorerTree({
      projects: [project],
      modules: [moduleOf("app", "app")],
      parts: [partOf("app", "a")],
      commitByHash: (hash) => (hash === "h-bob" ? bobCommit : null),
    });
    expect(tree).toEqual([
      {
        name: "app",
        branches: [
          {
            name: "main",
            creatorAccountId: "main-creator",
            displayed: true,
            latestEventHash: "h-main",
            commit: {
              eventHash: "h-main",
              message: "main commit",
              modules: [
                {
                  name: "app",
                  parts: [{ partId: "app.a", name: "a", partIdHash: null }],
                },
              ],
            },
          },
          {
            name: "bob",
            creatorAccountId: "bob-creator",
            displayed: false,
            latestEventHash: "h-bob",
            commit: {
              eventHash: "h-bob",
              message: "bob commit",
              modules: [
                {
                  name: "app",
                  parts: [{ partId: "app.b", name: "b", partIdHash: null }],
                },
              ],
            },
          },
        ],
      },
    ]);
  });

  test("読んでいないコミットは null, 作業中の変更だけのプロジェクトは main の未コミットになる", () => {
    const tree = buildExplorerTree({
      projects: [project],
      modules: [moduleOf("app", "app"), moduleOf("fresh", "fresh")],
      parts: [partOf("fresh", "x")],
      commitByHash: () => null,
    });
    expect(tree[0]?.branches[1]?.commit).toBeNull();
    expect(tree[1]).toEqual({
      name: "fresh",
      branches: [
        {
          name: "main",
          creatorAccountId: null,
          displayed: true,
          latestEventHash: "",
          commit: {
            eventHash: "",
            message: "",
            modules: [
              {
                name: "fresh",
                parts: [{ partId: "fresh.x", name: "x", partIdHash: null }],
              },
            ],
          },
        },
      ],
    });
  });
});
