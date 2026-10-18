import { useState, useCallback, type JSX } from "react";
import { label } from "../src/language.ts";
import { useDefiny } from "../src/state.tsx";

export default function DeploymentsPage(): JSX.Element {
  const { language } = useDefiny();
  const [apiToken, setApiToken] = useState(() => {
    return typeof window !== "undefined"
      ? (localStorage.getItem("definy_cf_api_token") ?? "")
      : "";
  });
  const [accountId, setAccountId] = useState(() => {
    return typeof window !== "undefined"
      ? (localStorage.getItem("definy_cf_account_id") ?? "")
      : "";
  });
  const [scriptName, setScriptName] = useState(() => {
    return typeof window !== "undefined"
      ? (localStorage.getItem("definy_cf_script_name") ?? "definy-app")
      : "definy-app";
  });
  const [deploying, setDeploying] = useState(false);
  const [deployResult, setDeployResult] = useState<{
    readonly url?: string;
    readonly error?: string;
  } | null>(null);

  const handleDeploy = useCallback(async () => {
    setDeploying(true);
    setDeployResult(null);
    try {
      if (typeof window !== "undefined") {
        localStorage.setItem("definy_cf_api_token", apiToken);
        localStorage.setItem("definy_cf_account_id", accountId);
        localStorage.setItem("definy_cf_script_name", scriptName);
      }
      const res = await fetch("/definy.v1.DeployService/DeployCloudflare", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          apiToken,
          accountId,
          scriptName,
        }),
      });
      const data = (await res.json()) as {
        readonly deployedUrl?: string;
        readonly message?: string;
      };
      if (res.ok && data.deployedUrl) {
        setDeployResult({ url: data.deployedUrl });
      } else {
        setDeployResult({ error: data.message ?? "Deploy failed" });
      }
    } catch (err) {
      setDeployResult({
        error: err instanceof Error ? err.message : String(err),
      });
    } finally {
      setDeploying(false);
    }
  }, [apiToken, accountId, scriptName]);

  return (
    <div className="deployments-view">
      <div className="view-header">
        <h2 className="view-title">
          {label(
            language,
            "Deploy to Cloudflare Workers",
            "Cloudflare Workers へのデプロイ",
            "Deploji al Cloudflare Workers",
          )}
        </h2>
      </div>

      <div className="card deploy-form-card">
        <div className="form-group">
          <label htmlFor="cf-token">
            {label(
              language,
              "Cloudflare API Token",
              "Cloudflare API トークン",
              "Cloudflare API-ĵetono",
            )}
          </label>
          <input
            id="cf-token"
            type="password"
            className="input"
            value={apiToken}
            onChange={(e) => {
              setApiToken(e.target.value);
            }}
            placeholder="Cloudflare API Token..."
          />
        </div>

        <div className="form-group">
          <label htmlFor="cf-account">
            {label(
              language,
              "Account ID (optional)",
              "アカウント ID (任意)",
              "Konto-ID (laŭvola)",
            )}
          </label>
          <input
            id="cf-account"
            type="text"
            className="input"
            value={accountId}
            onChange={(e) => {
              setAccountId(e.target.value);
            }}
            placeholder="Account ID..."
          />
        </div>

        <div className="form-group">
          <label htmlFor="cf-script">
            {label(
              language,
              "Worker Script Name",
              "Worker スクリプト名",
              "Skriptonomo",
            )}
          </label>
          <input
            id="cf-script"
            type="text"
            className="input"
            value={scriptName}
            onChange={(e) => {
              setScriptName(e.target.value);
            }}
            placeholder="definy-app"
          />
        </div>

        <button
          type="button"
          className="btn btn-primary"
          onClick={handleDeploy}
          disabled={deploying || !apiToken}
        >
          {deploying
            ? label(language, "Deploying...", "デプロイ中...", "Deplojante...")
            : label(language, "Deploy Now", "今すぐデプロイ", "Deploji nun")}
        </button>

        {deployResult?.url && (
          <div className="alert alert-success mt-4">
            <p>
              {label(
                language,
                "Successfully deployed to:",
                "デプロイが成功しました:",
                "Sukcese deplojita:",
              )}{" "}
              <a
                href={deployResult.url}
                target="_blank"
                rel="noreferrer"
                className="font-bold underline"
              >
                {deployResult.url}
              </a>
            </p>
          </div>
        )}

        {deployResult?.error && (
          <div className="alert alert-error mt-4">
            <p>{deployResult.error}</p>
          </div>
        )}
      </div>
    </div>
  );
}
