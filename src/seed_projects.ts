import { readdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import type { LocalizedText } from "./cbor.ts";

/** seeds/projects/*.json に書く, ビルトインのプロジェクト (docs/project.md) */
export type ProjectSeedData = {
  readonly project_name: string;
  readonly project_description: LocalizedText;
  readonly message: string;
  /** プロジェクトのモジュール. 各モジュールの正本は seeds/<モジュール名>.json */
  readonly modules: ReadonlyArray<string>;
};

/** ビルトインのプロジェクトを置くディレクトリ (seeds/*.json と分ける. seeds/*.json はモジュールだけ) */
export const PROJECT_SEEDS_DIR = "projects";

/** `seedsDir`/projects/*.json のプロジェクト (ファイル名順) */
export function loadProjectSeeds(
  seedsDir: string = "seeds",
): ReadonlyArray<ProjectSeedData> {
  const dir = resolve(seedsDir, PROJECT_SEEDS_DIR);
  return readdirSync(dir)
    .filter((file) => file.endsWith(".json"))
    .sort()
    .map(
      (file) =>
        JSON.parse(readFileSync(resolve(dir, file), "utf8")) as ProjectSeedData,
    );
}

/** プロジェクトの seed を JSON 文字列にする (キー順: project_name, project_description, message, modules. 末尾改行あり) */
export function projectSeedToJson(seed: ProjectSeedData): string {
  return `${JSON.stringify(
    {
      project_name: seed.project_name,
      project_description: seed.project_description,
      message: seed.message,
      modules: seed.modules,
    },
    null,
    2,
  )}\n`;
}
