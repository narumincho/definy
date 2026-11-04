/**
 * definy のコードのうち, どれだけを definy 自身で書いているかを数え, 紹介スライド (/about/story) の円グラフに使う.
 *
 *   node scripts/measure_self_hosting.ts
 *
 * 言語が違うので, どちらも「語の数」で比べる (おおよその目安).
 * - TypeScript: コメント・括弧・区切り記号を除いた, 識別子・キーワード・リテラル・演算子の数.
 *   テストと, スクリプトが作るファイルは数えない
 * - definy: seed のパーツの式と型の木のノード (`#call` や `#variable` など) の数. 1 つのノードを 1 語とする.
 *   ID・名前・リテラルの中身は別に数えないので, TypeScript より少なめに出る.
 *   組み込みのパーツ (`#builtin`) と sample モジュールは数えない
 * 出力: src/story/self_hosting_stats.ts
 */
import { readdir, readFile, writeFile } from "node:fs/promises";
import { join, relative, resolve } from "node:path";

const ROOT = resolve(import.meta.dirname, "..");
const OUTPUT_PATH = join(ROOT, "src", "story", "self_hosting_stats.ts");

/** TypeScript を数えるディレクトリ */
const TYPESCRIPT_DIRS = ["src", "worker", "middleware", "pages"];
/** 数えないファイル (スクリプトが作るもの) */
const GENERATED_FILES = new Set([
  "src/story/voice_manifest.ts",
  "src/story/zundamon_parts.ts",
  "src/story/self_hosting_stats.ts",
]);
/** UI として分けて数えるもの */
function isUiFile(path: string): boolean {
  return (
    path.endsWith(".tsx") ||
    path.startsWith("src/components/") ||
    path.startsWith("src/story/") ||
    path.startsWith("src/tree_layout/") ||
    path.startsWith("pages/")
  );
}

const DEFINY_MODULES = ["core", "std", "wasi", "wasm", "definy"];

async function listFiles(dir: string): Promise<string[]> {
  const entries = await readdir(dir, { withFileTypes: true, recursive: true });
  return entries
    .filter((entry) => entry.isFile())
    .map((entry) => join(entry.parentPath, entry.name));
}

/** コメントを除いて, 括弧・区切り以外の語を数える */
function countTypeScriptWords(source: string): number {
  const withoutComments = source
    .replace(/\/\*[\s\S]*?\*\//g, " ")
    .replace(/(^|[^:"'`])\/\/.*$/gm, "$1");
  const words = withoutComments.match(
    /"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|`(?:\\.|[^`\\])*`|[A-Za-z_$][\w$]*|\d[\d_]*(?:\.\d+)?|[=!<>]=?=?|&&|\|\||\?\?|=>|\+\+|--|[+\-*/%&|^~?]/g,
  );
  return words?.length ?? 0;
}

/** 式・型の木のノード (`#` で始まるキー) を数える */
function countDefinyWords(value: unknown): number {
  if (Array.isArray(value)) {
    return value.reduce<number>((sum, item) => sum + countDefinyWords(item), 0);
  }
  if (typeof value === "object" && value !== null) {
    let count = 0;
    for (const [key, child] of Object.entries(value)) {
      if (key.startsWith("#")) {
        count += 1;
      }
      count += countDefinyWords(child);
    }
    return count;
  }
  return 0;
}

function isBuiltin(expression: unknown): boolean {
  return (
    typeof expression === "object" &&
    expression !== null &&
    "#builtin" in expression
  );
}

async function main(): Promise<void> {
  let ui = 0;
  let host = 0;
  for (const dir of TYPESCRIPT_DIRS) {
    for (const file of await listFiles(join(ROOT, dir))) {
      const path = relative(ROOT, file);
      if (
        !/\.tsx?$/.test(path) ||
        /\.test\.tsx?$/.test(path) ||
        GENERATED_FILES.has(path)
      ) {
        continue;
      }
      const words = countTypeScriptWords(await readFile(file, "utf8"));
      if (isUiFile(path)) {
        ui += words;
      } else {
        host += words;
      }
    }
  }

  const modules: Record<string, number> = {};
  for (const name of DEFINY_MODULES) {
    const seed = JSON.parse(
      await readFile(join(ROOT, "seeds", `${name}.json`), "utf8"),
    ) as {
      parts: ReadonlyArray<{ expression?: unknown; part_type?: unknown }>;
    };
    modules[name] = seed.parts
      .filter((part) => !isBuiltin(part.expression))
      .reduce(
        (sum, part) =>
          sum +
          countDefinyWords(part.expression ?? null) +
          countDefinyWords(part.part_type ?? null),
        0,
      );
  }
  const definy = Object.values(modules).reduce((a, b) => a + b, 0);
  const total = definy + ui + host;
  const date = new Date().toISOString().slice(0, 10);

  await writeFile(
    OUTPUT_PATH,
    `/**
 * definy のコードのうち definy 自身で書いている割合 (語の数). scripts/measure_self_hosting.ts が作るので手で直さない.
 * ${date} 時点
 */
export const SELF_HOSTING_STATS = ${JSON.stringify(
      {
        measuredAt: date,
        definy,
        definyModules: modules,
        typescriptHost: host,
        typescriptUi: ui,
      },
      null,
      2,
    )} as const;
`,
  );
  console.log(
    `definy ${definy} (${((definy / total) * 100).toFixed(1)}%) / TypeScript ホスト ${host} / TypeScript UI ${ui}`,
  );
  console.log(modules);
}

await main();
