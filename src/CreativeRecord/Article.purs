module CreativeRecord.Article
  ( articleLocationToArticle
  ) where

import CreativeRecord.Article.CpsLabAdventCalendar2021 as CpsLabAdventCalendar2021
import CreativeRecord.Article.Data as Data
import CreativeRecord.Article.NotFound as NotFound
import CreativeRecord.Article.PowershellRecursion as PowershellRecursion
import CreativeRecord.Article.SvgBasic as SvgBasic
import CreativeRecord.Article.SvgStandaloneEmbed as SvgStandaloneEmbed
import CreativeRecord.Article.AboutDesiredRoute as AboutDesiredRoute
import CreativeRecord.Article.MessageWindow as MessageWindow
import CreativeRecord.Article.DesiredRouteFont as DesiredRouteFont
import CreativeRecord.Article.ListSelectionBehavior as ListSelectionBehavior
import CreativeRecord.Article.UiColor as UiColor
import CreativeRecord.Article.DesiredRouteEncounter as DesiredRouteEncounter
import CreativeRecord.Article.Star as Star
import CreativeRecord.Article.DesiredRouteMonster as DesiredRouteMonster
import CreativeRecord.Article.NPetitcomIme as NPetitcomIme
import CreativeRecord.Location as Location

articleLocationToArticle :: Location.ArticleLocation -> Data.Article
articleLocationToArticle = case _ of
  Location.PowershellRecursion -> PowershellRecursion.view
  Location.SvgBasic -> SvgBasic.view
  Location.SvgStandaloneEmbed -> SvgStandaloneEmbed.view
  Location.AboutDesiredRoute -> AboutDesiredRoute.view
  Location.MessageWindow -> MessageWindow.view
  Location.DesiredRouteFont -> DesiredRouteFont.view
  Location.ListSelectionBehavior -> ListSelectionBehavior.view
  Location.UiColor -> UiColor.view
  Location.DesiredRouteEncounter -> DesiredRouteEncounter.view
  Location.Star -> Star.view
  Location.DesiredRouteMonster -> DesiredRouteMonster.view
  Location.NPetitcomIme -> NPetitcomIme.view
  Location.CpsLabAdventCalendar2021 -> CpsLabAdventCalendar2021.view
  Location.NotFound _ -> NotFound.view
