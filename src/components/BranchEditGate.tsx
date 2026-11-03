import { useState, type JSX } from "react";
import { label } from "../language.ts";
import { useDefiny } from "../state.tsx";

/**
 * 表示しているブランチで編集できないときの案内 (docs/branch.md「ドラフトコミット」).
 * 編集は自分のブランチに属するドラフトとして持つので, 他のアカウントのブランチでは
 * 自分のブランチを作るまで編集できない. 編集できる状態では何も出さない
 */
export function BranchEditGate({
  projectName,
}: {
  readonly projectName: string;
}): JSX.Element | null {
  const { language, editStateFor, createEditingBranch, setAccountModalOpen } =
    useDefiny();
  const state = editStateFor(projectName);
  const [branchName, setBranchName] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (state.kind === "own_branch" || state.kind === "new_project") {
    return null;
  }

  if (state.kind === "no_account") {
    return (
      <div className="alert alert-warning branch-edit-gate" role="status">
        <p>
          {label(
            language,
            "Log in to edit. Edits are kept as a draft commit on your own branch.",
            "編集するにはログインが必要です。編集は自分のブランチに属するドラフトコミットとして保存されます。",
            "Ensalutu por redakti. Redaktoj estas konservataj kiel malneta enmeto en via branĉo.",
          )}
        </p>
        <button
          type="button"
          className="btn btn-primary btn-sm"
          onClick={() => {
            setAccountModalOpen(true);
          }}
        >
          {label(
            language,
            "Log In or Create Account",
            "ログイン / アカウント作成",
            "Ensaluti / Krei konton",
          )}
        </button>
      </div>
    );
  }

  const name = branchName ?? state.suggestedName;
  return (
    <div className="alert alert-warning branch-edit-gate" role="status">
      <p>
        {label(
          language,
          `The branch '${state.branch}' was created by another account, so you cannot edit it. Create your own branch to edit as a draft commit on it.`,
          `ブランチ「${state.branch}」は他のアカウントが作ったので編集できません。自分のブランチを作ると、そのブランチに属するドラフトコミットとして編集できます。`,
          `La branĉo '${state.branch}' estis kreita de alia konto, do vi ne povas redakti ĝin. Kreu vian propran branĉon por redakti.`,
        )}
      </p>
      <div className="branch-edit-gate-form">
        <label htmlFor="branch-edit-gate-name">
          {label(
            language,
            "New branch name",
            "新しいブランチ名",
            "Nomo de la nova branĉo",
          )}
        </label>
        <input
          id="branch-edit-gate-name"
          type="text"
          value={name}
          disabled={creating}
          onChange={(e) => {
            setBranchName(e.target.value);
          }}
        />
        <button
          type="button"
          className="btn btn-primary btn-sm"
          disabled={creating || name.trim() === ""}
          onClick={() => {
            setCreating(true);
            setError(null);
            createEditingBranch(projectName, name.trim()).then(
              () => {
                setCreating(false);
              },
              (e: unknown) => {
                setCreating(false);
                setError(e instanceof Error ? e.message : String(e));
              },
            );
          }}
        >
          {creating
            ? label(language, "Creating...", "作成中...", "Kreante...")
            : label(
                language,
                "Create my branch",
                "自分のブランチを作る",
                "Krei mian branĉon",
              )}
        </button>
      </div>
      <p className="text-muted">
        {label(
          language,
          "Creating a branch signs and submits an initial commit with the current contents of the project.",
          "ブランチを作ると、今のプロジェクトの内容で初期コミットに署名して提出します。",
          "Krei branĉon subskribas kaj sendas komencan enmeton kun la nuna enhavo de la projekto.",
        )}
      </p>
      {error !== null && (
        <p className="text-danger" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
