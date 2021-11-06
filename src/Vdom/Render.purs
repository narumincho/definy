module Vdom.Render (renderView) where

import Prelude
import Data.UInt as UInt
import Effect as Effect
import Vdom.RenderState as RenderState
import Vdom.View as View

foreign import data HtmlOrSvgElement :: Type

foreign import createDiv :: { id :: String, class :: String } -> Effect.Effect HtmlOrSvgElement

elementToHtmlOrSvgElement :: forall message. View.Element message -> View.Path -> RenderState.RenderState message -> Effect.Effect HtmlOrSvgElement
elementToHtmlOrSvgElement (View.ElementDiv (View.Div rec)) patch patchState = createDiv { id: rec.id, class: rec.class }

elementToHtmlOrSvgElement _ _ _ = createDiv { id: "", class: "sampleClass" }

applyChildren ::
  forall message.
  HtmlOrSvgElement ->
  View.Children message ->
  View.Path ->
  RenderState.RenderState message -> Effect.Effect Unit
applyChildren htmlOrSvgElement children path renderState = pure unit

renderElement :: forall message. HtmlOrSvgElement -> View.ElementUpdateDiff message -> RenderState.RenderState message -> View.Path -> Effect.Effect Unit
renderElement htmlOrSvgElement diff renderState path = pure unit

renderChildren :: forall message. HtmlOrSvgElement -> View.ChildrenDiff message -> RenderState.RenderState message -> View.Path -> Effect.Effect Unit
renderChildren htmlOrSvgElement diff renderState path = pure unit

renderChild :: forall message. HtmlOrSvgElement -> UInt.UInt -> View.ElementDiff message -> View.Path -> RenderState.RenderState message -> Effect.Effect UInt.UInt
renderChild htmlOrSvgElement index childDiff path renderState = pure (UInt.fromInt 0)

themeColorName :: String
themeColorName = "theme-color"

-- | すべてをリセットして再描画する. 最初に1回呼ぶと良い.
resetAndRenderView :: forall message. View.View message -> RenderState.RenderState message -> Effect.Effect Unit
resetAndRenderView view renderState = pure unit

-- | 差分データから実際のDOMを操作して表示に反映させる
renderView :: forall message. View.ViewDiff message -> RenderState.RenderState message -> Effect.Effect Unit
renderView viewDiff renderState = pure unit
