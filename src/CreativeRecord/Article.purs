module CreativeRecord.Article
  ( locationToArticleOrTop
  ) where

import CreativeRecord.Article.CpsLabAdventCalendar2021 as CpsLabAdventCalendar2021
import CreativeRecord.Article.Data as Data
import CreativeRecord.Article.NotFound as NotFound
import CreativeRecord.Article.PowershellRecursion as PowershellRecursion
import CreativeRecord.Article.Wip as Wip
import CreativeRecord.Location as Location

locationToArticleOrTop :: Location.ArticleLocation -> Data.Article
locationToArticleOrTop = case _ of
  Location.PowershellRecursion -> PowershellRecursion.view
  Location.CpsLabAdventCalendar2021 -> CpsLabAdventCalendar2021.view
  Location.NotFound _ -> NotFound.view
  _ -> Wip.view
