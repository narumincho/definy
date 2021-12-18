module CreativeRecord.Article
  ( Article(..)
  , ArticleOrTop(..)
  , getTitle
  , toArticleOrTop
  ) where

import CreativeRecord.Location as Location
import CreativeRecord.Messgae as Message
import Data.Maybe (Maybe(..))
import Data.String.NonEmpty (NonEmptyString)
import View.Data as View

newtype Article
  = Article
  { title :: NonEmptyString
  , children :: Array (View.Element Message.Message Location.Location)
  }

getTitle :: Article -> NonEmptyString
getTitle (Article { title }) = title

toArticleOrTop :: Article -> ArticleOrTop
toArticleOrTop (Article rec) =
  ArticleOrTop
    { title: Just rec.title, children: rec.children }

newtype ArticleOrTop
  = ArticleOrTop
  { title :: Maybe NonEmptyString
  , children :: Array (View.Element Message.Message Location.Location)
  }
