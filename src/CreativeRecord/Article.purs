module CreativeRecord.Article
  ( articleLocationToArticle
  ) where

import CreativeRecord.Article.CpsLabAdventCalendar2021 as CpsLabAdventCalendar2021
import CreativeRecord.Article.Data as Data
import CreativeRecord.Article.NotFound as NotFound
import CreativeRecord.Article.PowershellRecursion as PowershellRecursion
import CreativeRecord.Article.Wip as Wip
import CreativeRecord.Article.SvgBasic as SvgBasic
import CreativeRecord.Location as Location

articleLocationToArticle :: Location.ArticleLocation -> Data.Article
articleLocationToArticle = case _ of
  Location.PowershellRecursion -> PowershellRecursion.view
  Location.CpsLabAdventCalendar2021 -> CpsLabAdventCalendar2021.view
  Location.SvgBasic -> SvgBasic.view
  Location.NotFound _ -> NotFound.view
  _ -> Wip.view
