/**
 * モジュールとパーツの公開/非公開 (docs/visibility.md).
 *
 * 非公開のモジュールのパーツは同じプロジェクトのパーツからだけ, 非公開のパーツは同じモジュールのパーツからだけ参照できる.
 * イベントは誰でも読めるので, 読み取りを隠すものではなく参照できるかの決まり.
 * サーバー (`checkSubmittedProjectCommit`) と UI のコミット前の検査 (`checkCommitTypes`) が同じ関数で確かめる
 */
import { variantPayload } from "./definy_value.ts";
import type { Visibility } from "./event_content.ts";

/** 参照されるパーツ */
export type VisibilityTarget = {
  /** `モジュール名.パーツ名` */
  readonly name: string;
  readonly moduleName: string;
  readonly projectName: string;
  readonly visibility: Visibility;
  readonly moduleVisibility: Visibility;
};

/** 参照できない理由 */
export type VisibilityViolationReason = "private_part" | "private_module";

/** 参照できないパーツへの参照 */
export type VisibilityViolation = {
  /** 参照しているパーツ (`モジュール名.パーツ名`) */
  readonly partName: string;
  /** 参照されているパーツ (`モジュール名.パーツ名`) */
  readonly targetName: string;
  readonly reason: VisibilityViolationReason;
};

/** プロジェクト `projectName` のモジュール `moduleName` のパーツから `target` を参照できなければその理由, できれば `null` */
export function referenceViolation(
  from: { readonly projectName: string; readonly moduleName: string },
  target: VisibilityTarget,
): VisibilityViolationReason | null {
  if (target.moduleName === from.moduleName) {
    return null;
  }
  if (target.visibility === "private") {
    return "private_part";
  }
  if (
    target.projectName !== from.projectName &&
    target.moduleVisibility === "private"
  ) {
    return "private_module";
  }
  return null;
}

/** 式・型の中のパーツ参照 (`#part_reference` の `part_definition_event_hash`) のパーツ ID */
export function referencedPartIds(value: unknown): ReadonlySet<string> {
  const ids = new Set<string>();
  const visit = (v: unknown): void => {
    if (Array.isArray(v)) {
      v.forEach(visit);
      return;
    }
    if (v === null || typeof v !== "object" || v instanceof Uint8Array) {
      return;
    }
    const reference = variantPayload(v, "part_reference");
    if (reference !== undefined) {
      const id = (
        reference as { readonly part_definition_event_hash?: unknown }
      )?.part_definition_event_hash;
      if (typeof id === "string") {
        ids.add(id);
      }
    }
    Object.values(v).forEach(visit);
  };
  visit(value);
  return ids;
}

/** コミットするパーツ */
export type VisibilityCheckedPart = Omit<VisibilityTarget, "projectName"> & {
  readonly partId: string;
  readonly partType: unknown;
  /** 式. 読めていなければ `null` (検査しない) */
  readonly expression: unknown;
};

/**
 * プロジェクト `projectName` へのコミットのパーツ `committed` が, 参照できないパーツを参照していないか.
 * `environment` は他のプロジェクトのパーツ (キーはパーツ ID). コミットのパーツは `environment` より優先する.
 * 見つからないパーツへの参照は型チェッカーが拒否するのでここでは見ない
 */
export function checkReferenceVisibility({
  projectName,
  committed,
  environment,
}: {
  readonly projectName: string;
  readonly committed: ReadonlyArray<VisibilityCheckedPart>;
  readonly environment: ReadonlyMap<string, VisibilityTarget>;
}): ReadonlyArray<VisibilityViolation> {
  const targets = new Map(environment);
  for (const part of committed) {
    targets.set(part.partId, { ...part, projectName });
  }
  const violations: VisibilityViolation[] = [];
  for (const part of committed) {
    const ids = new Set([
      ...referencedPartIds(part.partType),
      ...referencedPartIds(part.expression),
    ]);
    for (const id of ids) {
      const target = targets.get(id);
      const reason =
        target === undefined
          ? null
          : referenceViolation(
              { projectName, moduleName: part.moduleName },
              target,
            );
      if (target !== undefined && reason !== null) {
        violations.push({
          partName: part.name,
          targetName: target.name,
          reason,
        });
      }
    }
  }
  return violations;
}

/** 拒否の理由の 1 行 (サーバーの `SubmitEvent` のメッセージ. UI もそのまま出す) */
export function visibilityViolationMessage(
  violation: VisibilityViolation,
): string {
  switch (violation.reason) {
    case "private_part":
      return `part '${violation.partName}': cannot reference the private part '${violation.targetName}'`;
    case "private_module":
      return `part '${violation.partName}': cannot reference '${violation.targetName}' of a private module in another project`;
  }
}
