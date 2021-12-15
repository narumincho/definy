module CreativeRecord.Article
  ( Article(..)
  ) where

import CreativeRecord.Location as Location
import CreativeRecord.Messgae as Message
import Data.Maybe (Maybe)
import Data.String.NonEmpty (NonEmptyString)
import View.Data as View

newtype Article
  = Article
  { title :: Maybe NonEmptyString
  , children :: Array (View.Element Message.Message Location.Location)
  }
