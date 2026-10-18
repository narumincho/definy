import { useState, useCallback, type JSX, type FormEvent } from "react";
import { Link } from "@void/react";
import { label } from "../src/language.ts";
import { useDefiny } from "../src/state.tsx";

export default function ChangesPage(): JSX.Element {
  const {
    language,
    workingChanges,
    discardWorkingPart,
    discardAllWorkingChanges,
    currentAccount,
    setAccountModalOpen,
    commitWorkingChanges,
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

  const [selectedModule, setSelectedModule] = useState<string>(
    affectedModules[0] ?? "core",
  );

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
        });
        setCommittedHash(hash);
        setCommitMessage("");
      } catch (err) {
        setCommitError(err instanceof Error ? err.message : String(err));
      } finally {
        setCommitting(false);
      }
    },
    [commitMessage, selectedModule, commitWorkingChanges],
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
              <div key={partId} className="card change-card">
                <div className="change-card-header">
                  <strong>{change.name}</strong>
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
                <p className="change-desc">{change.description}</p>
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
                    disabled={committing || !commitMessage.trim()}
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
