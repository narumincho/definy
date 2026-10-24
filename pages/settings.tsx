import { useEffect, useState, type JSX } from "react";
import { label, languageNativeName } from "../src/language.ts";
import { useDefiny } from "../src/state.tsx";
import type { LanguageCode } from "../src/types.ts";
import { submitInvalidSignatureSamples } from "../src/invalid_signature_samples.ts";
import {
  loadWasiIoSettings,
  saveWasiIoSettings,
} from "../src/wasi_io_browser.ts";
import { usePageTitle } from "../src/page_title.ts";

export default function SettingsPage(): JSX.Element {
  const {
    language,
    setLanguage,
    connectionStatus,
    currentAccount,
    refreshEvents,
  } = useDefiny();
  usePageTitle(label(language, "Settings", "設定", "Agordoj"));
  const [submitting, setSubmitting] = useState(false);
  const [resultMessage, setResultMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [ipVersion, setIpVersion] = useState<string | null>(null);
  // wasi.io のプログラム (definy.deploy-to-cloudflare-workers など) を動かすときの設定
  const [wasiIoSettings, setWasiIoSettings] = useState(loadWasiIoSettings);

  // サーバーから見た接続元が IPv4 / IPv6 のどちらか (`/healthz` の `ipVersion`)
  useEffect(() => {
    let cancelled = false;
    fetch("/healthz")
      .then((res) => res.json() as Promise<{ readonly ipVersion?: string }>)
      .then((json) => {
        if (!cancelled) setIpVersion(json.ipVersion ?? "unknown");
      })
      .catch(() => {
        if (!cancelled) setIpVersion("unknown");
      });
    return () => {
      cancelled = true;
    };
  }, []);

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

        <div className="setting-row">
          <span>
            {label(language, "IP Version", "IP バージョン", "IP-versio")}
          </span>
          <span className="badge badge-neutral">
            {ipVersion === null
              ? "..."
              : ipVersion === "ipv6"
                ? "IPv6"
                : ipVersion === "ipv4"
                  ? "IPv4"
                  : label(language, "Unknown", "不明", "Nekonata")}
          </span>
        </div>
      </div>

      <div className="card settings-card">
        <h3>
          {label(
            language,
            "Running I/O programs (wasi.io)",
            "I/O をするプログラムの実行 (wasi.io)",
            "Rulado de I/O-programoj (wasi.io)",
          )}
        </h3>
        <p className="text-muted" style={{ margin: 0, fontSize: "0.88rem" }}>
          {label(
            language,
            "API tokens and other secrets are entered on the page of each secret part (for example definy.cloudflare-api-token) and saved only in this browser.",
            "API トークンなどのシークレットは, シークレットのパーツ (definy.cloudflare-api-token など) のページで値を入れます. 値はこのブラウザにだけ保存します.",
            "API-ĵetonoj kaj aliaj sekretoj estas enigataj en la paĝo de ĉiu sekreta parto (ekzemple definy.cloudflare-api-token) kaj konservataj nur en ĉi tiu retumilo.",
          )}
        </p>
        <label style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <input
            type="checkbox"
            checked={wasiIoSettings.relayOnCorsError}
            onChange={(e) => {
              const next = {
                ...wasiIoSettings,
                relayOnCorsError: e.target.checked,
              };
              setWasiIoSettings(next);
              saveWasiIoSettings(next);
            }}
          />
          {label(
            language,
            "Relay through the server when the browser hits a CORS error (allowed accounts only)",
            "CORS エラーのときサーバーで仲介する (許可されたアカウントのみ)",
            "Peri la servilo, kiam la retumilo renkontas CORS-eraron (nur por permesitaj kontoj)",
          )}
        </label>
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
