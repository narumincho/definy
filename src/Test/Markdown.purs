module Test.Markdown where

import Prelude
import Data.String.NonEmpty as NonEmptyString
import Data.UInt as UInt
import Markdown as Markdown
import Test.Unit as TestUnit
import Test.Util (assertEqual)
import Type.Proxy (Proxy(..))

test :: TestUnit.Test
test = do
  assertEqual
    "codeBlock"
    { actual:
        Markdown.toMarkdownString
          ( Markdown.Markdown
              [ Markdown.CodeBlock """const value = "text";""" ]
          )
    , expected:
        """```
const value = "text";
```
"""
    }
  assertEqual
    "countMaxLengthGraveAccent"
    { actual: Markdown.countMaxLengthGraveAccent "``sore````fwafa`"
    , expected: UInt.fromInt 4
    }
  assertEqual
    "codeBlock escape"
    { actual:
        Markdown.toMarkdownString
          ( Markdown.Markdown
              [ Markdown.Paragraph
                  ( NonEmptyString.nes
                      (Proxy :: Proxy "Markdownはこのようにしてコードブロックを指定することができます")
                  )
              , Markdown.CodeBlock
                  """```ts
const value = 123;
```"""
              ]
          )
    , expected:
        """Markdownはこのようにしてコードブロックを指定することができます

````
```ts
const value = 123;
```
````
"""
    }
