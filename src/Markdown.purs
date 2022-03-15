module Markdown
  ( Block(..)
  , Markdown(..)
  , toMarkdownString
  ) where

import Data.String as String
import Data.String.NonEmpty (NonEmptyString)
import Data.String.NonEmpty as NonEmptyString
import Prelude as Prelude

newtype Markdown
  = Markdown (Array Block)

data Block
  = Paragraph NonEmptyString
  | Header2 NonEmptyString
  | CodeBlock String
  | Raw String

toMarkdownString :: Markdown -> String
toMarkdownString (Markdown blockList) =
  Prelude.append
    (String.joinWith "\n\n" (Prelude.map blockToString blockList))
    "\n"

blockToString :: Block -> String
blockToString = case _ of
  Paragraph str -> escape (NonEmptyString.toString str)
  Header2 value ->
    Prelude.append "## "
      (escape (NonEmptyString.toString value))
  CodeBlock code ->
    String.joinWith ""
      [ "```\n"
      , code
      , "\n```"
      ]
  Raw value -> value

-- | markdown の特殊文字をエスケープする
-- | **sorena** → \*\*sorena\*\*
escape :: String -> String
escape str =
  ( String.replaceAll
      (String.Pattern "~")
      (String.Replacement "\\~")
      ( String.replaceAll
          (String.Pattern "*")
          (String.Replacement "\\*")
          ( String.replaceAll
              (String.Pattern "\n")
              (String.Replacement " ")
              ( String.replaceAll
                  (String.Pattern "\\")
                  (String.Replacement "\\\\")
                  str
              )
          )
      )
  )
