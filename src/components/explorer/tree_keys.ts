/** 木の段. 字下げとアイコンの色に使う */
export type TreeLevel = "project" | "branch" | "commit" | "module" | "part";

/** 段ごとの開閉のキー (同じ名前のモジュールでもブランチが違えば別のノード) */
export const projectKey = (project: string): string => `p:${project}`;
export const branchKey = (project: string, branch: string): string =>
  `b:${project}/${branch}`;
export const commitKey = (project: string, branch: string): string =>
  `c:${project}/${branch}`;
export const moduleKey = (
  project: string,
  branch: string,
  module: string,
): string => `m:${project}/${branch}/${module}`;

/** `/part/{id}` のパスから id を取り出す. パーツ詳細ページでなければ null */
export function partIdFromPath(path: string): string | null {
  const match = /^\/part\/([^/?#]+)/.exec(path);
  const encoded = match?.[1];
  if (encoded === undefined) return null;
  try {
    return decodeURIComponent(encoded);
  } catch {
    return encoded;
  }
}
