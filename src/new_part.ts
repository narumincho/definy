/**
 * UI で新しいパーツを作る・パーツを削除するときの純粋関数 (docs/ui.md「パーツの作成と削除」).
 * 新しいパーツは作業中の変更 (`PartChange`) として作り, コミットしたときにモジュールに入る.
 * まだ無いモジュールの名前を指定すれば, そのコミットでモジュールができる
 */
import { variant } from "./definy_value.ts";
import { hole } from "./tree_layout/expression.ts";
import {
  deriveModuleIdBytesSync,
  deriveModulePartIdSync,
  type DecodedPart,
} from "./cbor.ts";
import { DEFAULT_VISIBILITY, MAIN_BRANCH } from "./event_content.ts";
import type {
  ModulePartSnapshot,
  ModuleSnapshot,
  PartChange,
  PartSnapshot,
  WorkingChanges,
} from "./types.ts";

/** 作るパーツの種類 */
export type NewPartKind =
  /** 値 (型は後で決める. 式は未入力) */
  | "value"
  /** 関数 (引数は数値型, 戻り値も数値型で始め, 型の行で変える. 式は引数付きのラムダ式) */
  | "function"
  /** 型パーツ (式が型の宣言. 未入力で始める) */
  | "type";

export type NewPartInput = {
  readonly moduleName: string;
  readonly name: string;
  readonly kind: NewPartKind;
  /** `kind` が `function` のときの引数名 */
  readonly parameterNames: ReadonlyArray<string>;
};

/** 作業中の変更のキー (`モジュール名.パーツ名`) */
export function newPartId(input: {
  readonly moduleName: string;
  readonly name: string;
}): string {
  return `${input.moduleName.trim()}.${input.name.trim()}`;
}

/** 名前に使えない文字 (`.` はパーツ ID の区切り, 空白は前後を除いた後に残るもの) */
const INVALID_NAME = /[.\s]/u;

/** 新しいパーツを作れない理由. 作れるなら `null` */
export type NewPartError =
  | "empty_module_name"
  | "invalid_module_name"
  | "empty_project_name"
  | "invalid_project_name"
  | "empty_part_name"
  | "invalid_part_name"
  | "duplicate_part_name"
  | "duplicate_parameter_name";

/**
 * 新しいパーツの入力を確かめる. コミット済みのパーツと作業中の変更 (名前を変えたもの・新しいものを含む) の
 * どちらとも同じモジュールで名前が重ならないこと
 */
export function validateNewPart(
  input: NewPartInput,
  parts: ReadonlyArray<Pick<PartSnapshot, "moduleName" | "name" | "partId">>,
  workingChanges: WorkingChanges,
): NewPartError | null {
  const moduleName = input.moduleName.trim();
  const name = input.name.trim();
  if (moduleName === "") return "empty_module_name";
  if (INVALID_NAME.test(moduleName)) return "invalid_module_name";
  if (name === "") return "empty_part_name";
  if (INVALID_NAME.test(name)) return "invalid_part_name";
  if (partNamesInModule(moduleName, parts, workingChanges).has(name)) {
    return "duplicate_part_name";
  }
  if (input.kind === "function") {
    const names = input.parameterNames.map((p) => p.trim());
    if (new Set(names).size !== names.length) {
      return "duplicate_parameter_name";
    }
  }
  return null;
}

/** 新しいモジュールを入れるプロジェクトの名前を確かめる (モジュール名と同じ規則. docs/project.md) */
export function validateProjectName(
  projectName: string,
): "empty_project_name" | "invalid_project_name" | null {
  const name = projectName.trim();
  if (name === "") return "empty_project_name";
  if (INVALID_NAME.test(name)) return "invalid_project_name";
  return null;
}

/** モジュール `moduleName` の (作業中の変更を重ねた) パーツ名 */
export function partNamesInModule(
  moduleName: string,
  parts: ReadonlyArray<Pick<PartSnapshot, "moduleName" | "name" | "partId">>,
  workingChanges: WorkingChanges,
): ReadonlySet<string> {
  const names = new Set<string>();
  for (const part of parts) {
    if (part.moduleName !== moduleName) continue;
    const change = workingChanges.parts.get(part.partId);
    if (change?.deleted === true) continue;
    names.add(change?.name ?? part.name);
  }
  for (const [partId, change] of workingChanges.parts) {
    if (moduleOfPartId(partId) === moduleName && change.deleted !== true) {
      names.add(change.name);
    }
  }
  return names;
}

/** `モジュール名.パーツ名` のモジュール名 */
export function moduleOfPartId(partId: string): string {
  const dot = partId.indexOf(".");
  return dot < 0 ? partId : partId.slice(0, dot);
}

/** 新しいパーツの作業中の変更 */
export function newPartChange(input: NewPartInput): PartChange {
  const moduleName = input.moduleName.trim();
  const base = {
    moduleDefinitionEventHash: moduleName,
    partDefinitionEventHash: newPartId(input),
    name: input.name.trim(),
    description: [],
  };
  switch (input.kind) {
    case "value":
      return { ...base, partType: null, expression: hole() };
    case "type":
      return { ...base, partType: variant("type", null), expression: hole() };
    case "function": {
      const names = input.parameterNames
        .map((p) => p.trim())
        .filter((p) => p !== "");
      return {
        ...base,
        partType: variant("function", {
          parameters: names.map((name) => ({
            name,
            type: variant("number", null),
          })),
          return_type: variant("number", null),
        }),
        expression: variant("function", {
          parameters: names.map((name, index) => ({
            parameter_id: index,
            parameter_name: name,
          })),
          body: hole(),
        }),
      };
    }
  }
}

/** "a, b c" のような入力を引数名の並びにする (カンマか空白で区切る) */
export function parseParameterNames(text: string): ReadonlyArray<string> {
  return text.split(/[,\s]+/u).filter((name) => name !== "");
}

/**
 * パーツ (`partIdHash`) を参照しているパーツ (`module.name`). 削除する前に知らせる.
 * 作業中の変更があればその式を見る. 自分自身 (再帰) は除く
 */
export function partsReferencing(
  partIdHash: string,
  selfPartId: string,
  parts: ReadonlyArray<
    Pick<
      PartSnapshot,
      "partId" | "moduleName" | "name" | "partType" | "expression"
    >
  >,
  workingChanges: WorkingChanges,
): ReadonlyArray<string> {
  const result: string[] = [];
  const seen = new Set<string>();
  const check = (
    partId: string,
    label: string,
    partType: unknown,
    expression: unknown,
  ): void => {
    if (partId === selfPartId || seen.has(partId)) return;
    seen.add(partId);
    if (
      references(partType, partIdHash) ||
      references(expression, partIdHash)
    ) {
      result.push(label);
    }
  };
  for (const part of parts) {
    const change = workingChanges.parts.get(part.partId);
    if (change?.deleted === true) {
      seen.add(part.partId);
      continue;
    }
    check(
      part.partId,
      `${part.moduleName}.${change?.name ?? part.name}`,
      change?.partType ?? part.partType,
      change?.expression ?? part.expression,
    );
  }
  for (const [partId, change] of workingChanges.parts) {
    if (change.deleted === true) continue;
    check(
      partId,
      `${moduleOfPartId(partId)}.${change.name}`,
      change.partType,
      change.expression,
    );
  }
  return result;
}

/** 式・型の中に `partIdHash` への参照 (パーツ参照・型の参照) があるか */
function references(value: unknown, partIdHash: string): boolean {
  if (typeof value === "string") {
    return value === partIdHash;
  }
  if (Array.isArray(value)) {
    return value.some((item) => references(item, partIdHash));
  }
  if (value !== null && typeof value === "object") {
    return Object.values(value).some((item) => references(item, partIdHash));
  }
  return false;
}

/**
 * モジュール `moduleName` のパーツに, そのモジュールの作業中の変更 (キーは `モジュール名.元のパーツ名`) を重ねた,
 * コミットするパーツ. 名前を変えたパーツは元の名前を外してから新しい名前で入れ, 削除したパーツは外す.
 * 他のモジュールの変更は入れない
 */
export function overlayWorkingChanges(
  moduleName: string,
  moduleParts: ReadonlyArray<ModulePartSnapshot>,
  workingChanges: WorkingChanges,
): {
  readonly partsList: ReadonlyArray<DecodedPart>;
  /** コミットに入れた作業中の変更のキー (コミットしたら消す) */
  readonly committedPartIds: ReadonlySet<string>;
} {
  const partMap = new Map<string, DecodedPart>();
  for (const p of moduleParts) {
    partMap.set(p.name, {
      name: p.name,
      description: p.description,
      visibility: p.visibility,
      partType: p.partType,
      expression: p.expression,
      contentHash: p.contentHash,
      partIdHash: p.partIdHash,
      ...(p.unresolved === true ? { unresolved: true } : {}),
    });
  }
  const committedPartIds = new Set<string>();
  for (const [partId, change] of workingChanges.parts) {
    if (moduleOfPartId(partId) !== moduleName) continue;
    committedPartIds.add(partId);
    const originalName = partId.slice(moduleName.length + 1);
    const visibility =
      change.visibility ??
      partMap.get(originalName)?.visibility ??
      DEFAULT_VISIBILITY;
    partMap.delete(originalName);
    if (change.deleted === true) {
      partMap.delete(change.name);
      continue;
    }
    partMap.set(change.name, {
      name: change.name,
      description: change.description,
      visibility,
      partType: change.partType,
      expression: change.expression,
      contentHash: null,
      partIdHash: null,
      ...(change.definition !== undefined
        ? { definition: change.definition }
        : {}),
    });
  }
  return { partsList: [...partMap.values()], committedPartIds };
}

/** 作業中の変更だけにある新しいパーツ. パーツ ID は元の名前 (`partId` の `.` の後) から決まる */
export function newPartSnapshot(
  partId: string,
  change: PartChange,
): PartSnapshot {
  const moduleName = moduleOfPartId(partId);
  return {
    partId,
    moduleId: moduleName,
    moduleName,
    name: change.name,
    description: change.description,
    visibility: change.visibility ?? DEFAULT_VISIBILITY,
    partType: change.partType,
    contentHash: null,
    partIdHash: deriveModulePartIdSync(
      deriveModuleIdBytesSync(moduleName),
      partId.slice(moduleName.length + 1),
    ),
    expression: change.expression,
    updatedAtMs: 0,
  };
}

/**
 * エクスプローラーに出すモジュールとパーツ: コミット済みのものに, 作業中の変更だけにある新しいパーツと
 * そのモジュール (まだ無ければ空のモジュール) を足す
 */
export function withNewParts(
  modules: ReadonlyArray<ModuleSnapshot>,
  parts: ReadonlyArray<PartSnapshot>,
  workingChanges: WorkingChanges,
): {
  readonly modules: ReadonlyArray<ModuleSnapshot>;
  readonly parts: ReadonlyArray<PartSnapshot>;
} {
  const committedIds = new Set(parts.map((p) => p.partId));
  const newParts = [...workingChanges.parts]
    .filter(([partId]) => !committedIds.has(partId))
    .map(([partId, change]) => newPartSnapshot(partId, change));
  if (newParts.length === 0) {
    return { modules, parts };
  }
  const moduleNames = new Set(modules.map((m) => m.name));
  const newModules = [...new Set(newParts.map((p) => p.moduleName))].filter(
    (name) => !moduleNames.has(name),
  );
  return {
    modules: [
      ...modules,
      ...newModules.map((name): ModuleSnapshot => ({
        moduleId: name,
        name,
        projectName: workingChanges.newModuleProjects?.get(name) ?? name,
        branch: MAIN_BRANCH,
        branches: [],
        description: [],
        visibility:
          workingChanges.moduleVisibilities?.get(name) ?? DEFAULT_VISIBILITY,
        latestEventHash: "",
        parentCommitHash: null,
        message: "",
        parts: [],
        updatedAtMs: 0,
      })),
    ],
    parts: [...parts, ...newParts],
  };
}

/**
 * パーツ ID → パーツの式. 作業中の変更 (コミットしていない新しいパーツも) を優先する.
 * エディタで書いた定義の式を評価するのに使う (docs/part-definition.md)
 */
export function workingExpressionResolver(
  partsByIdHash: ReadonlyMap<
    string,
    Pick<PartSnapshot, "partId" | "expression">
  >,
  workingChanges: WorkingChanges,
): (partIdHash: string) => unknown {
  const working = new Map<string, unknown>();
  for (const [partId, change] of workingChanges.parts) {
    if (change.deleted !== true) {
      const id = newPartSnapshot(partId, change).partIdHash;
      if (id !== null) {
        working.set(id, change.expression);
      }
    }
  }
  return (partIdHash) =>
    working.has(partIdHash)
      ? working.get(partIdHash)
      : partsByIdHash.get(partIdHash)?.expression;
}
