module Html.Data
  ( HtmlChildren(..)
  , RawHtmlElement(..)
  , htmlElement
  ) where

import Data.Map as Map
import Data.Maybe as Maybe
import Data.String.NonEmpty as NonEmptyString

newtype RawHtmlElement
  = RawHtmlElement
  { name :: NonEmptyString.NonEmptyString
  , attributes :: Map.Map NonEmptyString.NonEmptyString (Maybe.Maybe String)
  , children :: HtmlChildren
  }

data HtmlChildren
  = ElementList (Array RawHtmlElement)
  | Text String
  | RawText String
  | NoEndTag

htmlElement :: NonEmptyString.NonEmptyString -> Map.Map NonEmptyString.NonEmptyString (Maybe.Maybe String) -> HtmlChildren -> RawHtmlElement
htmlElement name attributes children = RawHtmlElement { name, attributes, children }
