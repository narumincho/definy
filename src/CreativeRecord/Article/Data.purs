module CreativeRecord.Article.Data
  ( Article(..)
  ) where

import CreativeRecord.Location as Location
import CreativeRecord.Message as Message
import Data.String.NonEmpty (NonEmptyString)
import View.Data as View
import StructuredUrl as StructuredUrl

newtype Article
  = Article
  { title :: NonEmptyString
  , children :: Array (View.Element Message.Message Location.Location)
  , imagePath :: StructuredUrl.PathAndSearchParams
  }
