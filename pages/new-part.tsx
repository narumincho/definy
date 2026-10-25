import { useState, type FormEvent, type JSX } from "react";
import { useRouter } from "@void/react";
import { label, withLanguage } from "../src/language.ts";
import { useDefiny } from "../src/state.tsx";
import {
  newPartChange,
  newPartId,
  parseParameterNames,
  validateNewPart,
  validateProjectName,
  type NewPartError,
  type NewPartKind,
} from "../src/new_part.ts";
import type { LanguageCode } from "../src/types.ts";

/**
 * 新しいパーツを作るページ (`/new-part?module=モジュール名`. docs/ui.md「パーツの作成と削除」).
 * パーツは作業中の変更として作り, そのままパーツのページで編集する. コミットするとモジュールに入る
 */
export default function NewPartPage(): JSX.Element {
  const router = useRouter();
  const {
    language,
    projects,
    modules,
    parts,
    workingChanges,
    updateWorkingPart,
    setNewModuleProject,
    projectOfModule,
  } = useDefiny();
  const [moduleName, setModuleName] = useState(
    () => router.query.get("module") ?? "",
  );
  const [name, setName] = useState("");
  const [kind, setKind] = useState<NewPartKind>("function");
  const [parameters, setParameters] = useState("x");
  const [submitted, setSubmitted] = useState(false);
  /** 新しいモジュールを入れるプロジェクト. 決めていなければモジュール名と同じ名前のプロジェクト */
  const [chosenProject, setChosenProject] = useState<string | null>(null);

  const input = {
    moduleName,
    name,
    kind,
    parameterNames: parseParameterNames(parameters),
  };
  const error = validateNewPart(input, parts, workingChanges);
  const isNewModule =
    moduleName.trim() !== "" &&
    !modules.some((m) => m.name === moduleName.trim());
  const projectName = (
    chosenProject ??
    projectOfModule(moduleName.trim()) ??
    moduleName
  ).trim();
  const projectError =
    isNewModule && error === null ? validateProjectName(projectName) : null;
  const isNewProject =
    isNewModule &&
    projectName !== "" &&
    !projects.some((p) => p.name === projectName) &&
    ![...(workingChanges.newModuleProjects?.values() ?? [])].includes(
      projectName,
    );

  const shownError = error ?? projectError;

  const handleSubmit = (e: FormEvent): void => {
    e.preventDefault();
    setSubmitted(true);
    if (shownError !== null) return;
    const partId = newPartId(input);
    if (isNewModule) {
      setNewModuleProject(moduleName.trim(), projectName);
    }
    updateWorkingPart(partId, newPartChange(input));
    router.visit(withLanguage(`/part/${partId}`, language));
  };

  return (
    <div className="changes-view new-part-view">
      <div className="view-header">
        <h2 className="view-title">
          {label(language, "New Part", "新しいパーツ", "Nova parto")}
        </h2>
      </div>
      <form className="card new-part-form" onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="new-part-module">
            {label(language, "Module", "モジュール", "Modulo")}
          </label>
          <input
            id="new-part-module"
            type="text"
            list="new-part-module-list"
            value={moduleName}
            onChange={(e) => {
              setModuleName(e.target.value);
            }}
            placeholder="e.g. sample, my_module"
            required
          />
          <datalist id="new-part-module-list">
            {modules.map((m) => (
              <option key={m.name} value={m.name} />
            ))}
          </datalist>
          {isNewModule && (
            <p className="text-muted">
              {label(
                language,
                "This module does not exist yet. It is created when you commit.",
                "まだ無いモジュールです。コミットすると作られます。",
                "Ĉi tiu modulo ankoraŭ ne ekzistas. Ĝi estos kreita kiam vi enmetos.",
              )}
            </p>
          )}
        </div>

        {isNewModule && (
          <div className="form-group">
            <label htmlFor="new-part-project">
              {label(language, "Project", "プロジェクト", "Projekto")}
            </label>
            <input
              id="new-part-project"
              type="text"
              list="new-part-project-list"
              value={projectName}
              onChange={(e) => {
                setChosenProject(e.target.value);
              }}
              required
            />
            <datalist id="new-part-project-list">
              {projects.map((p) => (
                <option key={p.name} value={p.name} />
              ))}
            </datalist>
            <p className="text-muted">
              {isNewProject
                ? label(
                    language,
                    "This project does not exist yet. It is created with the module when you commit.",
                    "まだ無いプロジェクトです。コミットするとモジュールと一緒に作られます。",
                    "Ĉi tiu projekto ankoraŭ ne ekzistas.",
                  )
                : label(
                    language,
                    "The module is added to this project. A commit contains every module of the project.",
                    "モジュールはこのプロジェクトに入ります。コミットにはプロジェクトの全モジュールが入ります。",
                    "La modulo estas aldonita al ĉi tiu projekto.",
                  )}
            </p>
          </div>
        )}

        <div className="form-group">
          <label htmlFor="new-part-name">
            {label(language, "Part name", "パーツ名", "Nomo de la parto")}
          </label>
          <input
            id="new-part-name"
            type="text"
            value={name}
            onChange={(e) => {
              setName(e.target.value);
            }}
            placeholder="e.g. square"
            required
          />
        </div>

        <fieldset className="form-group new-part-kind">
          <legend>{label(language, "Kind", "種類", "Speco")}</legend>
          {(
            [
              ["function", "Function", "関数", "Funkcio"],
              ["value", "Value", "値", "Valoro"],
              ["type", "Type", "型", "Tipo"],
            ] as const
          ).map(([value, en, ja, eo]) => (
            <label key={value}>
              <input
                type="radio"
                name="new-part-kind"
                value={value}
                checked={kind === value}
                onChange={() => {
                  setKind(value);
                }}
              />
              {label(language, en, ja, eo)}
            </label>
          ))}
        </fieldset>

        {kind === "function" && (
          <div className="form-group">
            <label htmlFor="new-part-parameters">
              {label(
                language,
                "Parameters (comma separated)",
                "引数 (カンマ区切り)",
                "Parametroj (apartigitaj per komoj)",
              )}
            </label>
            <input
              id="new-part-parameters"
              type="text"
              value={parameters}
              onChange={(e) => {
                setParameters(e.target.value);
              }}
              placeholder="e.g. x, y"
            />
            <p className="text-muted">
              {label(
                language,
                "Parameters and the result start as numbers. Change their types in the type row of the part.",
                "引数と戻り値の型は数値で始まります。パーツの型の行で変えられます。",
                "Parametroj kaj la rezulto komenciĝas kiel nombroj.",
              )}
            </p>
          </div>
        )}

        {submitted && shownError !== null && (
          <div className="alert alert-danger" role="alert">
            {newPartErrorMessage(shownError, language)}
          </div>
        )}

        <button type="submit" className="btn btn-primary btn-sm">
          {label(language, "Create", "作成", "Krei")}
        </button>
      </form>
    </div>
  );
}

function newPartErrorMessage(
  error: NewPartError,
  language: LanguageCode,
): string {
  switch (error) {
    case "empty_module_name":
      return label(
        language,
        "Enter a module name",
        "モジュール名を入力してください",
        "Enigu nomon de modulo",
      );
    case "invalid_module_name":
      return label(
        language,
        "A module name cannot contain '.' or spaces",
        "モジュール名に「.」や空白は使えません",
        "Nomo de modulo ne povas enhavi '.' aŭ spacojn",
      );
    case "empty_project_name":
      return label(
        language,
        "Enter a project name",
        "プロジェクト名を入力してください",
        "Enigu nomon de projekto",
      );
    case "invalid_project_name":
      return label(
        language,
        "A project name cannot contain '.' or spaces",
        "プロジェクト名に「.」や空白は使えません",
        "Nomo de projekto ne povas enhavi '.' aŭ spacojn",
      );
    case "empty_part_name":
      return label(
        language,
        "Enter a part name",
        "パーツ名を入力してください",
        "Enigu nomon de parto",
      );
    case "invalid_part_name":
      return label(
        language,
        "A part name cannot contain '.' or spaces",
        "パーツ名に「.」や空白は使えません",
        "Nomo de parto ne povas enhavi '.' aŭ spacojn",
      );
    case "duplicate_part_name":
      return label(
        language,
        "The module already has a part with this name",
        "このモジュールには同じ名前のパーツがあります",
        "La modulo jam havas parton kun ĉi tiu nomo",
      );
    case "duplicate_parameter_name":
      return label(
        language,
        "Parameter names must be different",
        "引数名が重なっています",
        "Nomoj de parametroj devas esti malsamaj",
      );
  }
}
