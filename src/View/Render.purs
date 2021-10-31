module View.Render (render) where

import Prelude
import Data.Maybe as Maybe
import Effect as Effect
import Effect.Console as Console
import Web.DOM.Node as Node
import Web.HTML as Html
import Web.HTML.HTMLDocument as Document
import Web.HTML.Window as Window
import Web.HTML.HTMLElement as HtmlElement

render :: Effect.Effect Unit
render = do
  window <- Html.window
  document <- Window.document window
  bodyMaybe <- Document.body document
  case bodyMaybe of
    Maybe.Just body -> Node.setTextContent "書き換えたぜ" (HtmlElement.toNode body)
    Maybe.Nothing -> Console.log "body を取得できなかった"
  pure unit
