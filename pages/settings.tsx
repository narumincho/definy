import { useEffect, useState, type JSX } from "react";
import { Link } from "../src/components/Link.tsx";
import { fetchIpVersion, type IpVersion } from "../src/healthz.ts";
import { AboutIcon } from "../src/icons.tsx";
import { label, languageNativeName } from "../src/language.ts";
import { useDefiny } from "../src/state.tsx";
import type { LanguageCode } from "../src/types.ts";
import {
  loadWasiIoSettings,
  saveWasiIoSettings,
} from "../src/wasi_io_browser.ts";

export default function SettingsPage(): JSX.Element {
  const { language, setLanguage, connectionStatus } = useDefiny();
  const [ipVersion, setIpVersion] = useState<IpVersion | null>(null);
  // wasi.io のプログラム (definy.deploy-to-cloudflare-workers など) を動かすときの設定
  const [wasiIoSettings, setWasiIoSettings] = useState(loadWasiIoSettings);

  // サーバーから見た接続元が IPv4 / IPv6 のどちらか (`/healthz` の `ipVersion`).
  // 取れない・時間内に返らない場合も `unknown` になるので「...」のまま止まらない (src/healthz.ts)
  useEffect(() => {
    let cancelled = false;
    void fetchIpVersion().then((version) => {
      if (!cancelled) setIpVersion(version);
    });
    return () => {
      cancelled = true;
    };
  }, []);

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

      <Link href="/about" className="card settings-card settings-about-link">
        <AboutIcon size={22} />
        <span className="settings-about-text">
          <strong>
            {label(language, "About definy", "definy について", "Pri definy")}
          </strong>
          <span className="text-muted">
            {label(
              language,
              "What definy is, how it compares, and the built-in modules",
              "definy とは何か, 他との比較, ビルトインモジュールなど",
              "Kio estas definy, komparoj kaj la enkonstruitaj moduloj",
            )}
          </span>
        </span>
        <span aria-hidden="true">→</span>
      </Link>

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
        <Link href="/settings/secrets" className="settings-secrets-link">
          {label(
            language,
            "List of secrets →",
            "シークレットの一覧 →",
            "Listo de sekretoj →",
          )}
        </Link>
        <fieldset
          style={{
            border: "none",
            margin: 0,
            padding: 0,
            display: "grid",
            gap: "0.3rem",
          }}
        >
          <legend style={{ padding: 0, marginBottom: "0.3rem" }}>
            {label(
              language,
              "Where to run the programs",
              "プログラムを実行する場所",
              "Kie ruli la programojn",
            )}
          </legend>
          {(
            [
              [
                "browser",
                label(
                  language,
                  "Browser: HTTP requests are sent by this browser (servers that do not allow CORS cannot be reached) and the secrets of this browser are used",
                  "ブラウザ: HTTP リクエストはこのブラウザが送ります (CORS を許可しないサーバーには届きません). シークレットはこのブラウザの値を使います",
                  "Retumilo: HTTP-petojn sendas ĉi tiu retumilo (serviloj, kiuj ne permesas CORS, ne estas atingeblaj), kaj la sekretoj de ĉi tiu retumilo estas uzataj",
                ),
              ],
              [
                "server",
                label(
                  language,
                  "Server: the whole program runs on the server with its secrets (only administrators of a definy server on Node.js, such as npm run serve)",
                  "サーバー: プログラム全体をサーバーで動かし, シークレットもサーバーの値を使います (npm run serve など Node.js の definy サーバーの管理者だけ)",
                  "Servilo: la tuta programo ruliĝas en la servilo kun ĝiaj sekretoj (nur administrantoj de definy-servilo en Node.js, kiel npm run serve)",
                ),
              ],
            ] as const
          ).map(([location, text]) => (
            <label
              key={location}
              style={{ display: "flex", alignItems: "baseline", gap: "0.5rem" }}
            >
              <input
                type="radio"
                name="run-location"
                checked={wasiIoSettings.runLocation === location}
                onChange={() => {
                  const next = { ...wasiIoSettings, runLocation: location };
                  setWasiIoSettings(next);
                  saveWasiIoSettings(next);
                }}
              />
              {text}
            </label>
          ))}
        </fieldset>
      </div>
    </div>
  );
}
