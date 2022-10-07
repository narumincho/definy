import * as React from "react";
import { Link } from "../components/Link";
import { Text } from "../components/Text";
import { WithHeader } from "../components/WithHeader";
import { useAccountToken } from "../client/hook/useAccountToken";
import { useLanguage } from "../client/hook/useLanguage";

export const ToolListPage = (): React.ReactElement => {
  const language = useLanguage();
  const useAccountTokenResult = useAccountToken();

  return (
    <WithHeader
      title={{
        japanese: "definy とは直接関係ないツールたち",
        english: "Tools not directly related to definy",
        esperanto: "Iloj ne rekte rilataj al definy",
      }}
      location={{ type: "tools" }}
      language={language}
      useAccountTokenResult={useAccountTokenResult}
      titleItemList={[]}
    >
      <h2>
        <Text
          language={language}
          japanese="definy とは直接関係ないツールたち"
          english="Tools not directly related to definy"
          esperanto="Iloj ne rekte rilataj al definy"
        />
      </h2>
      <div css={{ display: "grid", gap: 8, padding: 8 }}>
        <Link
          location={{ type: "tool", value: "themeColorRainbow" }}
          language={language}
          style={{ padding: 8 }}
        >
          <Text
            language={language}
            japanese="テーマカラーレインボー"
            english="theme color rainbow"
            esperanto="temo koloro ĉielarko"
          />
        </Link>
        <Link
          location={{ type: "tool", value: "soundQuiz" }}
          language={language}
          style={{ padding: 8 }}
        >
          <Text
            language={language}
            japanese="音の周波数クイズ"
            english="sound frequency quiz"
            esperanto="sonfrekvenca kvizo"
          />
        </Link>
      </div>
    </WithHeader>
  );
};

export default ToolListPage;
