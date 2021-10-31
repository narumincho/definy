module Language (Language(..)) where

import Prelude as Prelude

-- | 英語,日本語,エスペラント語
-- |
-- | ナルミンチョが使える? プログラミングじゃない 人間が会話で話したりする言語
data Language
  = Japanese
  | English
  | Esperanto

derive instance languageEq :: Prelude.Eq Language
