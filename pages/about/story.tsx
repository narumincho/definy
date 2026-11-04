import type { JSX } from "react";
import { Link } from "../../src/components/Link.tsx";
import { label } from "../../src/language.ts";
import { useDefiny } from "../../src/state.tsx";
import { StoryPlayer } from "../../src/story/StoryPlayer.tsx";

/** definy の紹介とこれからの計画のスライド (docs/story.md) */
export default function AboutStoryPage(): JSX.Element {
  const { language } = useDefiny();
  return (
    <div className="page-shell story-page">
      <div className="story-page-header">
        <Link href="/about">
          ← {label(language, "About definy", "definy について", "Pri definy")}
        </Link>
      </div>
      <StoryPlayer lang={language} />
    </div>
  );
}
