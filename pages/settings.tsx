import { useState, type JSX } from "react";
import { label, languageNativeName } from "../src/language.ts";
import { useDefiny } from "../src/state.tsx";
import type { LanguageCode } from "../src/types.ts";
import { submitInvalidSignatureSamples } from "../src/invalid_signature_samples.ts";

export default function SettingsPage(): JSX.Element {
  const {
    language,
    setLanguage,
    connectionStatus,
    currentAccount,
    refreshEvents,
  } = useDefiny();
  const [submitting, setSubmitting] = useState(false);
  const [resultMessage, setResultMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleInsertSamples = async () => {
    setSubmitting(true);
    setResultMessage(null);
    setErrorMessage(null);
    try {
      const results = await submitInvalidSignatureSamples({
        impersonatedAccountId: currentAccount?.accountId,
      });
      await refreshEvents();
      setResultMessage(
        label(
          language,
          `Inserted ${results.length} samples`,
          `${results.length} 件投入しました`,
          `Enmetis ${results.length} specimenojn`,
        ),
      );
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : String(error));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="settings-view">
      <div className="view-header">
        <h2 className="view-title">
          {label(language, "Settings", "設定", "Agordoj")}
        </h2>
      </div>

      <div className="card settings-card">
        <div className="setting-row">
          <label htmlFor="settings-lang">
            {label(language, "Display Language", "表示言語", "Montra lingvo")}
          </label>
          <select
            id="settings-lang"
            className="input select select-sm"
            value={language}
            onChange={(e) => {
              setLanguage(e.target.value as LanguageCode);
            }}
          >
            <option value="en">{languageNativeName("en")}</option>
            <option value="ja">{languageNativeName("ja")}</option>
            <option value="eo">{languageNativeName("eo")}</option>
          </select>
        </div>

        <div className="setting-row">
          <span>
            {label(
              language,
              "Connection Status",
              "接続ステータス",
              "Konektostato",
            )}
          </span>
          <span className="badge badge-neutral">{connectionStatus}</span>
        </div>
      </div>

      <div className="card settings-card">
        <h3>
          {label(language, "Developer", "開発者向け", "Por programistoj")}
        </h3>
        <p className="text-muted" style={{ margin: 0, fontSize: "0.88rem" }}>
          {label(
            language,
            "Save test events with invalid signatures to the server to check that the browser displays warning badges. Requires DEFINY_ALLOW_UNVERIFIED_EVENTS=true on the server.",
            "署名が不正なテストイベントをサーバーに保存し、ブラウザ側の署名チェックで警告表示されるか確認します。サーバーで DEFINY_ALLOW_UNVERIFIED_EVENTS=true が必要です。",
            "Konservas testajn eventojn kun nevalidaj subskriboj en la servilo por kontroli, ĉu la retumilo montras avertajn insignojn. Postulas DEFINY_ALLOW_UNVERIFIED_EVENTS=true en la servilo.",
          )}
        </p>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.75rem",
            flexWrap: "wrap",
          }}
        >
          <button
            type="button"
            className="btn btn-secondary"
            disabled={submitting}
            onClick={handleInsertSamples}
          >
            {label(
              language,
              "Insert invalid signature samples",
              "不正署名のサンプルを投入",
              "Enmeti nevalidajn subskribojn",
            )}
          </button>
          {resultMessage && (
            <span style={{ color: "var(--green-text)", fontSize: "0.88rem" }}>
              {resultMessage}
            </span>
          )}
          {errorMessage && (
            <span style={{ color: "var(--red-text)", fontSize: "0.88rem" }}>
              {errorMessage}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
