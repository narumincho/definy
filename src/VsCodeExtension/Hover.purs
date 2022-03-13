module VsCodeExtension.Hover
  ( getHoverData
  ) where

import VsCodeExtension.Evaluate as Evaluate
import VsCodeExtension.LanguageServerLib as Lib
import VsCodeExtension.Range as Range

getHoverData :: Range.Position -> Evaluate.EvaluatedTree -> Lib.Hover
getHoverData position (Evaluate.EvaluatedTree { nameRange, item, children }) =
  Lib.Hover
    { contents:
        Lib.MarkupContent
          { kind: Lib.Markdown
          , value: "作成中...."
          }
    , range: Range.Range { start: position, end: position }
    }
