module CreativeRecord.Page
  ( locationToArticleOrTop
  ) where

import CreativeRecord.Article as Article
import CreativeRecord.Location as Location
import CreativeRecord.Page.CpsLabAdventCalendar2021 as CpsLabAdventCalendar2021
import CreativeRecord.Page.NotFound as NotFound
import CreativeRecord.Page.PowershellRecursion as PowershellRecursion
import CreativeRecord.Page.Top as Top
import CreativeRecord.Page.Wip as Wip
import CreativeRecord.State as State

locationToArticleOrTop :: State.State -> Location.Location -> Article.ArticleOrTop
locationToArticleOrTop state = case _ of
  Location.Top -> Top.view (State.getCount state)
  Location.PowershellRecursion -> Article.toArticleOrTop PowershellRecursion.view
  Location.CpsLabAdventCalendar2021 -> Article.toArticleOrTop CpsLabAdventCalendar2021.view
  Location.NotFound _ -> Article.toArticleOrTop NotFound.view
  _ -> Article.toArticleOrTop Wip.view
