/**
 * プロジェクトごとに最新のコミットを選ぶ純粋関数。
 */

export type TimedProjectCommit = {
  readonly projectName: string;
  readonly timeMs: number;
};

/**
 * コミットの候補から、projectName ごとに timeMs が最大のコミットを選ぶ。
 * timeMs が既存のものより厳密に大きい場合に最新として更新する。
 */
export function pickLatestCommitPerProject<T extends TimedProjectCommit>(
  commits: Iterable<T>,
): ReadonlyMap<string, T> {
  const result = new Map<string, T>();
  for (const commit of commits) {
    const existing = result.get(commit.projectName);
    if (existing === undefined || existing.timeMs < commit.timeMs) {
      result.set(commit.projectName, commit);
    }
  }
  return result;
}
