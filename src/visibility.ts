/**
 * モジュールとパーツの公開/非公開 (docs/visibility.md).
 *
 * 非公開のモジュールのパーツは同じプロジェクトのパーツからだけ, 非公開のパーツは同じモジュールのパーツからだけ参照できる.
 * イベントは誰でも読めるので, 読み取りを隠すものではなく参照できるかの決まり.
 * サーバー (`checkSubmittedProjectCommit`) と UI のコミット前の検査 (`checkCommitTypes`) が, 同じ definy 製の
 * `core.check-reference-visibility` (`npm run build:seeds` がコンパイルした `wasm/visibility_checker.wasm`) で確かめる
 */
import { none, some, variant, variantOf } from "./definy_value.ts";
import type { Visibility } from "./event_content.ts";
import { instantiateCompiledFunction } from "./stage1_compiler.ts";

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

/**
 * プロジェクト `projectName` のモジュール `moduleName` のパーツから `target` を参照できなければその理由, できれば `null`.
 * 定義は definy の `core.reference-violation` で, これはエディタがパーツの候補を絞るのに使う同じ決まり
 */
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
 * パーツの型と式 (型パーツの宣言, quote の中を含む) の両方の参照を見る.
 * 見つからないパーツへの参照は型チェッカーが拒否するのでここでは見ない.
 * 決まりは definy の `core.check-reference-visibility` で, コンパイルした `checker` (`wasm/visibility_checker.wasm`) で確かめる
 */
export function checkReferenceVisibility(
  checker: WebAssembly.Module,
  {
    projectName,
    committed,
    environment,
  }: {
    readonly projectName: string;
    readonly committed: ReadonlyArray<VisibilityCheckedPart>;
    readonly environment: ReadonlyMap<string, VisibilityTarget>;
  },
): ReadonlyArray<VisibilityViolation> {
  const instance = instantiateCompiledFunction(checker);
  const result = instance.read(
    instance.call([
      instance.writeArgument(projectName),
      instance.writeArgument(
        committed.map((part) => ({
          id: part.partId,
          name: part.name,
          module_name: part.moduleName,
          visibility: variant(part.visibility),
          module_visibility: variant(part.moduleVisibility),
          part_type: optionValue(part.partType),
          expression: optionValue(part.expression),
        })),
      ),
      instance.writeArgument(
        Array.from(environment, ([id, target]) => ({
          id,
          name: target.name,
          module_name: target.moduleName,
          project_name: target.projectName,
          visibility: variant(target.visibility),
          module_visibility: variant(target.moduleVisibility),
        })),
      ),
    ]),
  );
  if (!Array.isArray(result)) {
    throw new Error(
      "core.check-reference-visibility returned a non-list value",
    );
  }
  return result.map((item) => {
    const violation = item as {
      readonly part_name: string;
      readonly target_name: string;
      readonly reason: unknown;
    };
    const reason = variantOf(violation.reason)?.tag;
    if (reason !== "private_part" && reason !== "private_module") {
      throw new Error(
        `core.check-reference-visibility returned an unknown reason: ${String(reason)}`,
      );
    }
    return {
      partName: violation.part_name,
      targetName: violation.target_name,
      reason,
    };
  });
}

function optionValue(value: unknown): unknown {
  return value === null || value === undefined ? none() : some(value);
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
