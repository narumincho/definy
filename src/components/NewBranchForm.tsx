import { useState, type FormEvent, type JSX } from "react";
import { label } from "../language.ts";
import { useDefiny } from "../state.tsx";
import { unusedBranchName } from "../branches.ts";
import type { ProjectSnapshot } from "../types.ts";

/**
 * プロジェクトのページの「新しいブランチ」(`/project/{名前}?add=branch`. docs/branch.md「ブランチの作成」).
 * 表示しているブランチの最新のコミットを親に, 同じ中身 (とこのプロジェクトの作業中の変更) を新しいブランチにコミットする
 */
export function NewBranchForm({
  project,
  autoFocus,
}: {
  readonly project: ProjectSnapshot;
  readonly autoFocus: boolean;
}): JSX.Element | null {
  const {
    language,
    currentAccount,
    setAccountModalOpen,
    commitWorkingChanges,
  } = useDefiny();
  const [name, setName] = useState<string | null>(null);
  const [status, setStatus] = useState<
    | { readonly kind: "idle" }
    | { readonly kind: "submitting" }
    | { readonly kind: "error"; readonly message: string }
  >({ kind: "idle" });

  if (project.branches.length === 0) return null;

  const branchName = (
    name ??
    unusedBranchName(project.branches, currentAccount?.accountName ?? "")
  ).trim();
  const exists = project.branches.some((b) => b.name === branchName);

  const handleSubmit = (e: FormEvent): void => {
    e.preventDefault();
    if (branchName === "" || exists) return;
    setStatus({ kind: "submitting" });
    commitWorkingChanges({
      projectName: project.name,
      message: `Create branch ${branchName} from ${project.branch}`,
      newBranchName: branchName,
      createBranch: true,
    }).then(
      () => {
        setName(null);
        setStatus({ kind: "idle" });
      },
      (error: unknown) => {
        setStatus({
          kind: "error",
          message: error instanceof Error ? error.message : String(error),
        });
      },
    );
  };

  return (
    <section className="module-parts-section new-branch-section">
      <h3>{label(language, "New branch", "新しいブランチ", "Nova branĉo")}</h3>
      {currentAccount === null ? (
        <button
          type="button"
          className="btn btn-primary btn-sm"
          onClick={() => {
            setAccountModalOpen(true);
          }}
        >
          {label(
            language,
            "Log in to create a branch",
            "ログインしてブランチを作る",
            "Ensalutu por krei branĉon",
          )}
        </button>
      ) : (
        <form className="new-branch-form" onSubmit={handleSubmit}>
          <label htmlFor="new-branch-name" className="text-muted">
            {label(
              language,
              `Branch off from the latest commit of ${project.branch}. Uncommitted changes of this project are included.`,
              `${project.branch} の最新のコミットから分けます。このプロジェクトの作業中の変更も入ります。`,
              `Disbranĉigi de la lasta enmeto de ${project.branch}. Neenmetitaj ŝanĝoj de ĉi tiu projekto estas inkluzivitaj.`,
            )}
          </label>
          <div className="new-branch-row">
            <input
              id="new-branch-name"
              type="text"
              value={branchName}
              autoFocus={autoFocus}
              onChange={(e) => {
                setName(e.target.value);
              }}
            />
            <button
              type="submit"
              className="btn btn-primary btn-sm"
              disabled={
                branchName === "" || exists || status.kind === "submitting"
              }
            >
              {label(
                language,
                "Sign & Create Branch",
                "署名してブランチを作る",
                "Subskribi kaj krei branĉon",
              )}
            </button>
          </div>
          {exists && (
            <p className="alert alert-danger" role="alert">
              {label(
                language,
                "This branch already exists",
                "このブランチはすでにあります",
                "Ĉi tiu branĉo jam ekzistas",
              )}
            </p>
          )}
          {status.kind === "error" && (
            <p className="alert alert-danger" role="alert">
              {status.message}
            </p>
          )}
        </form>
      )}
    </section>
  );
}
