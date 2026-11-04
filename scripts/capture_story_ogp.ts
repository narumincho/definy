/**
 * 紹介スライドの表紙を撮って, /about の OGP 画像 (1200x675) を作る.
 * dev サーバー (npm run dev, http://localhost:5173) を動かしてから
 *
 *   node scripts/capture_story_ogp.ts
 *
 * 出力: public/story/ogp-{en,ja,eo}.png (pages/about.server.ts が og:image に使う)
 */
import { join, resolve } from "node:path";
import { chromium } from "@playwright/test";

const ROOT = resolve(import.meta.dirname, "..");
const BASE_URL = process.env["STORY_BASE_URL"] ?? "http://localhost:5173";
const WIDTH = 1200;
const HEIGHT = 675;
const LANGUAGES = ["en", "ja", "eo"] as const;

const browser = await chromium.launch();
try {
  const page = await browser.newPage({
    viewport: { width: WIDTH, height: HEIGHT },
    colorScheme: "dark",
  });
  for (const language of LANGUAGES) {
    await page.goto(`${BASE_URL}/about?lang=${language}`);
    await page.locator(".story-slide").first().waitFor();
    // ステージを画面いっぱいに置き, 字幕とずんだもんの場所を空けずにスライドだけを出す
    await page.evaluate(
      ({ width, height }) => {
        const stage = document.querySelector<HTMLElement>(".story-stage");
        const layout = document.querySelector<HTMLElement>(".story-layout");
        if (stage === null || layout === null) {
          throw new Error("紹介スライドが見つからない");
        }
        Object.assign(stage.style, {
          position: "fixed",
          left: "0",
          top: "0",
          width: `${width}px`,
          height: `${height}px`,
          zIndex: "2147483647",
          border: "none",
          borderRadius: "0",
        });
        layout.style.setProperty("--story-band", "0");
        layout.style.setProperty("--story-side", "0");
        for (const element of document.querySelectorAll<HTMLElement>(
          ".story-narrator",
        )) {
          element.style.display = "none";
        }
        const area = document.querySelector<HTMLElement>(".story-slide-area");
        if (area !== null) {
          area.style.transition = "none";
          area.style.borderRadius = "0";
          area.style.boxShadow = "none";
        }
      },
      { width: WIDTH, height: HEIGHT },
    );
    await page.evaluate(() => document.fonts.ready);
    // 表紙の登場のアニメーションが終わるのを待つ
    await page.waitForTimeout(1500);
    const path = join(ROOT, "public", "story", `ogp-${language}.png`);
    await page.screenshot({
      path,
      clip: { x: 0, y: 0, width: WIDTH, height: HEIGHT },
    });
    console.log(path);
  }
} finally {
  await browser.close();
}
