import type { JSX } from "react";
import { label } from "../src/language.ts";
import { useDefiny } from "../src/state.tsx";

export default function AboutPage(): JSX.Element {
  const { language } = useDefiny();

  return (
    <div className="about-view">
      <div className="card about-card">
        <h2>definy</h2>
        <p className="lead">
          {label(
            language,
            "A purely functional, self-hosted WebAssembly programming environment.",
            "自己ホストされた WebAssembly 純粋関数型プログラミング環境",
            "Memgastigata funkcia programmedio por WebAssembly",
          )}
        </p>

        <div className="about-pillars">
          <div className="pillar">
            <h3>1. WebAssembly Native</h3>
            <p>
              {label(
                language,
                "Compiled directly to WebAssembly and executed with native browser/edge V8 JIT performance.",
                "ブラウザやエッジワーカーの V8 でネイティブ実行される Wasm バイナリを動的に生成します。",
                "Kompilita rekte al WebAssembly por maksimuma rapideco.",
              )}
            </p>
          </div>
          <div className="pillar">
            <h3>2. Self-Hosted</h3>
            <p>
              {label(
                language,
                "The type checker, evaluator, and compiler (stage1) are written in definy itself.",
                "型検査器・評価器・Wasm コンパイラ (stage1) はすべて definy 自身で記述されています。",
                "La tipkontrolilo, taksilo kaj kompililo estas skribitaj en definy mem.",
              )}
            </p>
          </div>
          <div className="pillar">
            <h3>3. Event Sourced & Content Addressed</h3>
            <p>
              {label(
                language,
                "Deterministic CBOR serialization and Ed25519 cryptographic signatures ensure verifiable audit trails.",
                "決定論的 CBOR と Ed25519 署名により、すべてのコード変更が暗号学的に追跡・検証されます。",
                "Determinisma CBOR kaj Ed25519 subskriboj garantias sekurecon.",
              )}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
