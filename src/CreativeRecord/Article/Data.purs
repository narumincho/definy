module CreativeRecord.Article.Data
  ( Article(..)
  ) where

import CreativeRecord.Location as Location
import CreativeRecord.Message as Message
import Data.String.NonEmpty (NonEmptyString)
import StructuredUrl as StructuredUrl
import View.Data as View

newtype Article
  = Article
  { title :: NonEmptyString
  , children :: Array (View.ElementAndStyle Message.Message Location.Location)
  , imagePath :: StructuredUrl.PathAndSearchParams
  }
