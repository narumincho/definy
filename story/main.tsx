/**
 * 紹介スライド (/about/) だけの静的なページ (docs/story.md).
 * definy の UI は html-ui (docs/html-ui.md) で, React を使うのはこのページだけ
 */
import { StrictMode, useState, type JSX } from "react";
import { createRoot } from "react-dom/client";
import { languageNativeName } from "../src/language.ts";
import { StoryPlayer } from "../src/story/StoryPlayer.tsx";
import type { LanguageCode } from "../src/types.ts";
import "../src/main.css";

const LANGUAGES: ReadonlyArray<LanguageCode> = ["ja", "en", "eo"];

/** `?lang=` があればそれ, 無ければブラウザの言語から決める */
function initialLanguage(): LanguageCode {
  const query = new URLSearchParams(location.search).get("lang");
  const found = LANGUAGES.find((lang) => lang === query);
  if (found !== undefined) {
    return found;
  }
  for (const preferred of navigator.languages) {
    const code = LANGUAGES.find((lang) => preferred.startsWith(lang));
    if (code !== undefined) {
      return code;
    }
  }
  return "en";
}

function App(): JSX.Element {
  const [lang, setLang] = useState(initialLanguage);
  return (
    <div
      className="about-view page-shell"
      style={{ maxWidth: 960, margin: "0 auto", padding: "1rem" }}
    >
      <nav
        style={{
          display: "flex",
          gap: "0.75rem",
          justifyContent: "flex-end",
          marginBottom: "1rem",
        }}
      >
        <a href="/">definy</a>
        {LANGUAGES.map((code) => (
          <button
            key={code}
            type="button"
            aria-pressed={code === lang}
            onClick={() => {
              document.documentElement.lang = code;
              history.replaceState(null, "", `?lang=${code}`);
              setLang(code);
            }}
          >
            {languageNativeName(code)}
          </button>
        ))}
      </nav>
      {/* 表示言語が変わったら作り直す (1 つのプレイヤーの中では時間軸は変わらない) */}
      <StoryPlayer key={lang} lang={lang} />
    </div>
  );
}

const root = document.getElementById("root");
if (root !== null) {
  document.documentElement.lang = initialLanguage();
  createRoot(root).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
}
