module Vdom.Path
  ( Path
  , appendKey
  , root
  , toString
  ) where

import Data.String as String

-- | vdom の要素の位置を表現するパス
-- | `/0/2/32`
-- | `/a/list-container/list/item/name/text`
newtype Path
  = Path String

root :: Path
root = Path ""

appendKey :: Path -> String -> Path
appendKey (Path path) key = Path (String.joinWith "/" [ path, key ])

toString :: Path -> String
toString (Path str) = str
