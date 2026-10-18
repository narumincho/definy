import type { JSX } from "react";
import { label, languageNativeName } from "../src/language.ts";
import { useDefiny } from "../src/state.tsx";
import type { LanguageCode } from "../src/types.ts";

export default function SettingsPage(): JSX.Element {
  const { language, setLanguage, connectionStatus } = useDefiny();

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
    </div>
  );
}
