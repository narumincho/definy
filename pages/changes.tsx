import {
  useState,
  useCallback,
  useEffect,
  type JSX,
  type FormEvent,
} from "react";
import { Link } from "../src/components/Link.tsx";
import { label, localizedText } from "../src/language.ts";
import { useDefiny, type CommitTypeError } from "../src/state.tsx";

export default function ChangesPage(): JSX.Element {
  const {
    language,
    workingChanges,
    discardWorkingPart,
    discardAllWorkingChanges,
    currentAccount,
    setAccountModalOpen,
    commitWorkingChanges,
    commitTargetFor,
    checkCommitTypes,
    parts,
  } = useDefiny();

  const [commitMessage, setCommitMessage] = useState("");
  const [committing, setCommitting] = useState(false);
  const [commitError, setCommitError] = useState<string | null>(null);
  const [committedHash, setCommittedHash] = useState<string | null>(null);

  const changeEntries = Array.from(workingChanges.parts.entries());

  // Determine affected modules from part IDs
  const affectedModules: ReadonlyArray<string> = Array.from(
    new Set(
      changeEntries.map(([partId]) =>
        partId.includes(".") ? partId.slice(0, partId.indexOf(".")) : "core",
      ),
    ),
  );

  // 作業中の変更は localStorage からマウント後に読むので, 初期値を useState で決めると変更の無い状態 ("core") になる.
  // 選んでいなければ, 変更のあるモジュールの先頭を使う
  const [chosenModule, setSelectedModule] = useState<string | null>(null);
  const selectedModule = chosenModule ?? affectedModules[0] ?? "core";

  // コミット先のブランチ (docs/branch.md). 他のアカウントのブランチからは新しいブランチを作るので名前を決める
  const target = commitTargetFor(selectedModule);
  const [newBranchName, setNewBranchName] = useState<string | null>(null);
  const branchName =
    target?.kind === "new_branch"
      ? (newBranchName ?? target.suggestedName)
      : null;

  // コミットする前に, サーバーと同じ definy 製の型チェッカーで検査する.
  // 変更・対象モジュール・取得済みのイベントが変わったら 300ms 待ってから検査し直す
  const [typeCheck, setTypeCheck] = useState<
    | { readonly status: "idle" | "checking" }
    | {
        readonly status: "done";
        readonly errors: ReadonlyArray<CommitTypeError>;
      }
    | { readonly status: "failed"; readonly message: string }
  >({ status: "idle" });
  useEffect(() => {
    if (!currentAccount || workingChanges.parts.size === 0) {
      setTypeCheck({ status: "idle" });
      return;
    }
    let cancelled = false;
    setTypeCheck({ status: "checking" });
    const timer = setTimeout(() => {
      checkCommitTypes(selectedModule).then(
        (errors) => {
          if (!cancelled) setTypeCheck({ status: "done", errors });
        },
        (e: unknown) => {
          if (!cancelled) {
            setTypeCheck({
              status: "failed",
              message: e instanceof Error ? e.message : String(e),
            });
          }
        },
      );
    }, 300);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [checkCommitTypes, selectedModule, currentAccount, workingChanges]);
  const hasTypeErrors =
    typeCheck.status === "done" && typeCheck.errors.length > 0;

  const handleCommit = useCallback(
    async (e: FormEvent) => {
      e.preventDefault();
      if (!commitMessage.trim()) return;

      setCommitting(true);
      setCommitError(null);
      setCommittedHash(null);

      try {
        const hash = await commitWorkingChanges({
          moduleName: selectedModule || "core",
          message: commitMessage.trim(),
          ...(branchName === null ? {} : { newBranchName: branchName }),
        });
        setCommittedHash(hash);
        setCommitMessage("");
        setNewBranchName(null);
      } catch (err) {
        setCommitError(err instanceof Error ? err.message : String(err));
      } finally {
        setCommitting(false);
      }
    },
    [commitMessage, selectedModule, branchName, commitWorkingChanges],
  );

  return (
    <div className="changes-view">
      <div className="view-header">
        <h2 className="view-title">
          {label(
            language,
            "Working Changes",
            "作業中の変更",
            "Laborkontrolaj ŝanĝoj",
          )}
        </h2>
        {changeEntries.length > 0 && (
          <div className="view-actions">
            <button
              type="button"
              className="btn btn-danger btn-sm"
              onClick={discardAllWorkingChanges}
              disabled={committing}
            >
              {label(language, "Discard all", "すべて破棄", "Forĵeti ĉiujn")}
            </button>
          </div>
        )}
      </div>

      {committedHash && (
        <div
          className="alert alert-success card"
          style={{ marginBottom: "1rem" }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <div>
              <strong>
                🎉{" "}
                {label(
                  language,
                  "Changes committed successfully!",
                  "変更をコミットしました！",
                  "Ŝanĝoj sukcese enmetitaj!",
                )}
              </strong>
              <div style={{ marginTop: "0.2rem" }}>
                <span className="text-muted" style={{ fontSize: "0.85rem" }}>
                  {label(
                    language,
                    "Event Hash:",
                    "イベントハッシュ:",
                    "Eventa haketo:",
                  )}{" "}
                </span>
                <Link
                  href={`/event/${committedHash}`}
                  className="font-mono"
                  style={{ textDecoration: "underline" }}
                >
                  {committedHash}
                </Link>
              </div>
            </div>
            <button
              type="button"
              className="btn btn-ghost btn-xs"
              onClick={() => {
                setCommittedHash(null);
              }}
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {commitError && (
        <div
          className="alert alert-danger card"
          style={{ marginBottom: "1rem" }}
        >
          <strong>
            {label(
              language,
              "Failed to commit changes:",
              "コミットに失敗しました:",
              "Malsukcesis enmeti ŝanĝojn:",
            )}
          </strong>{" "}
          {commitError}
        </div>
      )}

      {changeEntries.length === 0 ? (
        <div className="empty-state">
          <p>
            {label(
              language,
              "No uncommitted changes",
              "未コミットの変更はありません",
              "Neniuj neenmetitaj ŝanĝoj",
            )}
          </p>
        </div>
      ) : (
        <div className="changes-layout">
          <div className="changes-list">
            {changeEntries.map(([partId, change]) => (
              <div
                key={partId}
                className="card change-card"
                data-deleted={change.deleted === true ? "" : undefined}
              >
                <div className="change-card-header">
                  <strong>{change.name}</strong>
                  {change.deleted === true ? (
                    <span className="badge badge-invalid-signature">
                      {label(language, "Delete", "削除", "Forigi")}
                    </span>
                  ) : (
                    !parts.some((p) => p.partId === partId) && (
                      <span className="badge badge-success">
                        {label(language, "New", "新規", "Nova")}
                      </span>
                    )
                  )}
                  <button
                    type="button"
                    className="btn btn-ghost btn-xs text-danger"
                    onClick={() => {
                      discardWorkingPart(partId);
                    }}
                    disabled={committing}
                  >
                    {label(language, "Discard", "破棄", "Forĵeti")}
                  </button>
                </div>
                <p className="change-desc">
                  {localizedText(change.description, language)}
                </p>
                <div className="change-card-footer">
                  <Link
                    href={`/part/${partId}`}
                    className="btn btn-primary btn-xs"
                  >
                    {label(language, "Edit →", "編集 →", "Redakti →")}
                  </Link>
                </div>
              </div>
            ))}
          </div>

          <div className="card commit-panel" style={{ marginTop: "1.2rem" }}>
            <h3 style={{ marginBottom: "0.8rem", fontSize: "1.1rem" }}>
              {label(
                language,
                "Commit Changes",
                "変更をコミット",
                "Enmeti ŝanĝojn",
              )}
            </h3>

            {!currentAccount ? (
              <div className="auth-required-banner">
                <p className="text-muted" style={{ marginBottom: "0.8rem" }}>
                  {label(
                    language,
                    "You need to log in or create an account with an Ed25519 key to sign and submit this commit.",
                    "コミットに暗号署名して提出するには、アカウントの作成またはログインが必要です。",
                    "Vi devas ensaluti aŭ krei konton por subskribi ĉi tiun enmeton.",
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
            ) : (
              <form onSubmit={handleCommit}>
                <div className="form-group">
                  <label htmlFor="commit-module-select">
                    {label(
                      language,
                      "Target Module",
                      "対象モジュール",
                      "Cela modulo",
                    )}
                  </label>
                  {affectedModules.length > 1 ? (
                    <select
                      id="commit-module-select"
                      value={selectedModule}
                      onChange={(e) => {
                        setSelectedModule(e.target.value);
                      }}
                      disabled={committing}
                    >
                      {affectedModules.map((m) => (
                        <option key={m} value={m}>
                          {m}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      id="commit-module-select"
                      type="text"
                      value={selectedModule}
                      onChange={(e) => {
                        setSelectedModule(e.target.value);
                      }}
                      placeholder="e.g. core, sample, my_module"
                      disabled={committing}
                      required
                    />
                  )}
                </div>

                <div className="form-group commit-branch">
                  <label htmlFor="commit-branch-input">
                    {label(language, "Branch", "ブランチ", "Branĉo")}
                  </label>
                  {target?.kind === "new_branch" ? (
                    <>
                      <input
                        id="commit-branch-input"
                        type="text"
                        value={branchName ?? ""}
                        onChange={(e) => {
                          setNewBranchName(e.target.value);
                        }}
                        disabled={committing}
                        required
                      />
                      <p className="text-muted">
                        {label(
                          language,
                          `The branch '${target.fromBranch}' was created by another account, so a new branch is created from it.`,
                          `ブランチ「${target.fromBranch}」は他のアカウントが作ったので, そこから新しいブランチを作ります。`,
                          `La branĉo '${target.fromBranch}' estis kreita de alia konto, do nova branĉo estas kreita el ĝi.`,
                        )}
                      </p>
                    </>
                  ) : (
                    <p id="commit-branch-input" className="text-muted">
                      {target?.kind === "own_branch"
                        ? label(
                            language,
                            `Commit to your branch '${target.branch}'`,
                            `自分のブランチ「${target.branch}」にコミットします`,
                            `Enmeti al via branĉo '${target.branch}'`,
                          )
                        : label(
                            language,
                            "Create the module with the branch 'main'",
                            "モジュールを作り, ブランチ「main」にコミットします",
                            "Krei la modulon kun la branĉo 'main'",
                          )}
                    </p>
                  )}
                </div>

                <div className="form-group">
                  <label htmlFor="commit-message-input">
                    {label(
                      language,
                      "Commit Message",
                      "コミットメッセージ",
                      "Enmeta mesaĝo",
                    )}
                  </label>
                  <input
                    id="commit-message-input"
                    type="text"
                    placeholder={label(
                      language,
                      "e.g. Add triangle-area computation",
                      "例: 三角形の面積計算パーツを追加",
                      "Ekz: Aldoni novan funkcion",
                    )}
                    value={commitMessage}
                    onChange={(e) => {
                      setCommitMessage(e.target.value);
                    }}
                    disabled={committing}
                    required
                  />
                </div>

                <div className="commit-type-check" aria-live="polite">
                  {typeCheck.status === "checking" && (
                    <p className="text-muted">
                      {label(
                        language,
                        "Type checking with the definy type checker...",
                        "definy 製の型チェッカーで検査しています...",
                        "Tipkontrolado per la definy-tipkontrolilo...",
                      )}
                    </p>
                  )}
                  {typeCheck.status === "done" && !hasTypeErrors && (
                    <p className="text-muted">
                      {label(
                        language,
                        "No type errors",
                        "型エラーはありません",
                        "Neniuj tiperaroj",
                      )}
                    </p>
                  )}
                  {typeCheck.status === "failed" && (
                    <p className="text-muted">
                      {label(
                        language,
                        "Could not run the type checker:",
                        "型チェッカーを実行できませんでした:",
                        "Ne eblis ruli la tipkontrolilon:",
                      )}{" "}
                      {typeCheck.message}
                    </p>
                  )}
                  {typeCheck.status === "done" && hasTypeErrors && (
                    <div className="alert alert-danger">
                      <strong>
                        {label(
                          language,
                          "Type errors (the server will reject this commit):",
                          "型エラー (サーバーがこのコミットを拒否します):",
                          "Tiperaroj (la servilo rifuzos ĉi tiun enmeton):",
                        )}
                      </strong>
                      <ul>
                        {typeCheck.errors.map((error) => (
                          <li key={error.partName}>{error.message}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>

                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginTop: "1rem",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "0.5rem",
                    }}
                  >
                    <span
                      className="account-avatar"
                      style={{
                        width: "20px",
                        height: "20px",
                        fontSize: "0.75rem",
                      }}
                    >
                      {currentAccount.accountName.slice(0, 1).toUpperCase()}
                    </span>
                    <span
                      className="text-muted"
                      style={{ fontSize: "0.85rem" }}
                    >
                      {label(
                        language,
                        "Signing as",
                        "署名アカウント:",
                        "Subskribante kiel",
                      )}{" "}
                      <strong>{currentAccount.accountName}</strong>
                    </span>
                  </div>

                  <button
                    type="submit"
                    className="btn btn-primary btn-sm"
                    disabled={
                      committing || !commitMessage.trim() || hasTypeErrors
                    }
                  >
                    {committing
                      ? label(
                          language,
                          "Signing & Submitting...",
                          "署名・送信中...",
                          "Subskribante...",
                        )
                      : label(
                          language,
                          "Sign & Commit",
                          "署名してコミット",
                          "Subskribi kaj enmeti",
                        )}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
