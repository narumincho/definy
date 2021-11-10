module Vdom.Render where

import Prelude
import Console as Console
import Data.UInt as UInt
import Effect as Effect
import Vdom.RenderState as RenderState
import Vdom.View as View

foreign import data HtmlOrSvgElement :: Type

foreign import createDiv :: { id :: String, class :: String } -> Effect.Effect HtmlOrSvgElement

elementToHtmlOrSvgElement :: forall message. View.Element message -> View.Path -> RenderState.RenderState message -> Effect.Effect HtmlOrSvgElement
elementToHtmlOrSvgElement (View.ElementDiv (View.Div rec)) _patch _patchState = createDiv { id: rec.id, class: rec.class }

elementToHtmlOrSvgElement _ _ _ = createDiv { id: "", class: "sampleClass" }

applyChildren ::
  forall message.
  HtmlOrSvgElement ->
  View.Children message ->
  View.Path ->
  RenderState.RenderState message -> Effect.Effect Unit
applyChildren htmlOrSvgElement children path renderState = Console.logValue "run applyChildren" { htmlOrSvgElement, children, renderState, path }

renderElement :: forall message. HtmlOrSvgElement -> View.ElementUpdateDiff message -> RenderState.RenderState message -> View.Path -> Effect.Effect Unit
renderElement htmlOrSvgElement diff renderState path = Console.logValue "run renderElement" { htmlOrSvgElement, diff, renderState, path }

renderChildren :: forall message. HtmlOrSvgElement -> View.ChildrenDiff message -> RenderState.RenderState message -> View.Path -> Effect.Effect Unit
renderChildren htmlOrSvgElement diff renderState path = Console.logValue "run renderChildren" { htmlOrSvgElement, diff, renderState, path }

renderChild :: forall message. HtmlOrSvgElement -> UInt.UInt -> View.ElementDiff message -> View.Path -> RenderState.RenderState message -> Effect.Effect UInt.UInt
renderChild htmlOrSvgElement index childDiff path renderState = do
  Console.logValue "run renderChild" { htmlOrSvgElement, index, childDiff, path, renderState }
  pure (UInt.fromInt 0)

themeColorName :: String
themeColorName = "theme-color"

-- | すべてをリセットして再描画する. 最初に1回呼ぶと良い.
resetAndRenderView :: forall message. View.View message -> RenderState.RenderState message -> Effect.Effect Unit
resetAndRenderView view renderState = Console.logValue "run resetAndRenderView" { view, renderState }

-- | 差分データから実際のDOMを操作して表示に反映させる
renderView :: forall message. View.ViewDiff message -> RenderState.RenderState message -> Effect.Effect Unit
renderView viewDiff renderState = Console.logValue "run renderView" { viewDiff, renderState }
