import * as React from "react";
import { Button } from "../client/ui/Button";
import { Link } from "../components/Link";
import { Text } from "../components/Text";
import { WithHeader } from "../components/WithHeader";
import { useAccountToken } from "../client/hook/useAccountToken";
import { useLanguage } from "../client/hook/useLanguage";

const SettingPage = (): React.ReactElement => {
  const language = useLanguage();
  const useAccountTokenResult = useAccountToken();

  return (
    <WithHeader
      title={{
        japanese: "設定",
        english: "Setting",
        esperanto: "Agordo",
      }}
      useAccountTokenResult={useAccountTokenResult}
      titleItemList={[]}
      location={{ type: "home" }}
      language={language}
    >
      <div css={{ padding: 16 }}>
        <h1 css={{ margin: 0 }}>
          <Text
            language={language}
            japanese="設定"
            english="Setting"
            esperanto="Agordo"
          />
        </h1>
        <div css={{ padding: 16 }}>
          <h2 css={{ margin: 0 }}>
            <Text
              language={language}
              japanese="言語"
              english="Language"
              esperanto="Lingvo"
            />
          </h2>
          <Link
            language="japanese"
            location={{ type: "setting" }}
            isActive={language === "japanese"}
            style={{ height: 32, padding: 8 }}
          >
            <Text
              language={language}
              japanese="日本語"
              english="日本語 - Japanese"
              esperanto="日本語 - Japanoj"
            />
          </Link>
          <Link
            language="english"
            location={{ type: "setting" }}
            isActive={language === "english"}
            style={{ height: 32, padding: 8 }}
          >
            <Text
              language={language}
              japanese="English - 英語"
              english="English"
              esperanto="English - la angla"
            />
          </Link>
          <Link
            language="esperanto"
            location={{ type: "setting" }}
            isActive={language === "esperanto"}
            style={{ height: 32, padding: 8 }}
          >
            <Text
              language={language}
              japanese="Esperanto - エスペラント語"
              english="Esperanto - Esperanto"
              esperanto="Esperanto - Esperanto"
            />
          </Link>
        </div>

        {useAccountTokenResult.accountToken !== undefined && (
          <Button
            onClick={() => {
              useAccountTokenResult.deleteAccountToken();
            }}
          >
            <Text
              language={language}
              japanese="ログアウト"
              english="logout"
              esperanto="elsaluti"
            />
          </Button>
        )}
      </div>
    </WithHeader>
  );
};

export default SettingPage;
