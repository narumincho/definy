module Vdom.Render where

import Prelude
import Color as Color
import Console as Console
import Data.Array.NonEmpty as NonEmptyArray
import Data.Nullable (Nullable)
import Data.Nullable as Nullable
import Data.String.NonEmpty as NonEmptyString
import Data.Tuple as Tuple
import Data.UInt as UInt
import Effect as Effect
import Language as Language
import Vdom.Data as Vdom
import Vdom.Data as View
import Vdom.RenderState as RenderState

elementToHtmlOrSvgElement ::
  forall message.
  { element :: View.Element message
  , path :: View.Path
  , renderState :: RenderState.RenderState message
  } ->
  Effect.Effect HtmlOrSvgElement
elementToHtmlOrSvgElement { element: View.ElementDiv (View.Div rec), path, renderState } = do
  div <-
    createDiv
      { id: Nullable.toNullable (map NonEmptyString.toString rec.id)
      , class: Nullable.toNullable (map NonEmptyString.toString rec.class)
      , dataPath: View.pathToString path
      }
  applyChildren { htmlOrSvgElement: div, children: rec.children, path: path, renderState }
  pure div

elementToHtmlOrSvgElement _ = createDiv { id: Nullable.null, class: Nullable.null, dataPath: "notSupport" }

-- | HTMLElment か SVGElement の子要素を設定する
applyChildren ::
  forall message.
  { htmlOrSvgElement :: HtmlOrSvgElement
  , children :: View.Children message
  , path :: View.Path
  , renderState :: RenderState.RenderState message
  } ->
  Effect.Effect Unit
applyChildren { htmlOrSvgElement, children: View.ChildrenText text } = setTextContent text htmlOrSvgElement

applyChildren { htmlOrSvgElement, children: View.ChildrenElementList list, path, renderState } =
  Effect.foreachE (NonEmptyArray.toArray list)
    ( \(Tuple.Tuple key child) -> do
        element <-
          elementToHtmlOrSvgElement
            { element: child
            , path: View.pathAppendKey path key
            , renderState
            }
        appendChild htmlOrSvgElement element
    )

renderElement :: forall message. HtmlOrSvgElement -> View.ElementUpdateDiff message -> RenderState.RenderState message -> View.Path -> Effect.Effect Unit
renderElement htmlOrSvgElement diff renderState path = Console.logValue "run renderElement" { htmlOrSvgElement, diff, renderState, path }

-- | HTMLElment か SVGElement の子要素に対して差分データの分を反映する
renderChildren :: forall message. { htmlOrSvgElement :: HtmlOrSvgElement, childrenDiff :: View.ChildrenDiff message, renderState :: RenderState.RenderState message, path :: View.Path } -> Effect.Effect Unit
renderChildren { childrenDiff: View.ChildrenDiffSkip } = pure unit

renderChildren { htmlOrSvgElement, childrenDiff: View.ChildrenDiffSetText newText } = setTextContent newText htmlOrSvgElement

renderChildren { htmlOrSvgElement, childrenDiff: View.ChildrenDiffResetAndInsert list, renderState, path } = do
  setTextContent "" htmlOrSvgElement
  applyChildren { htmlOrSvgElement, children: View.ChildrenElementList list, renderState, path }

renderChildren { childrenDiff: View.ChildDiffList _ } = pure unit

renderChild :: forall message. HtmlOrSvgElement -> UInt.UInt -> View.ElementDiff message -> View.Path -> RenderState.RenderState message -> Effect.Effect UInt.UInt
renderChild htmlOrSvgElement index childDiff path renderState = do
  Console.logValue "run renderChild" { htmlOrSvgElement, index, childDiff, path, renderState }
  pure (UInt.fromInt 0)

themeColorName :: String
themeColorName = "theme-color"

-- | すべてをリセットして再描画する. 最初に1回呼ぶと良い.
resetAndRenderView :: forall message. View.Vdom message -> RenderState.RenderState message -> Effect.Effect Unit
resetAndRenderView (View.Vdom view) renderState = do
  Effect.foreachE
    [ Vdom.ChangePageName view.pageName
    , Vdom.ChangeThemeColor view.themeColor
    , Vdom.ChangeLanguage view.language
    , Vdom.ChangeBodyClass view.bodyClass
    ]
    viewPatchOperationToEffect
  bodyElement <- getBodyElement
  renderChildren
    { htmlOrSvgElement: bodyElement
    , childrenDiff:
        case view.children of
          View.ChildrenElementList list -> View.ChildrenDiffResetAndInsert list
          View.ChildrenText text -> View.ChildrenDiffSetText text
    , renderState
    , path: View.rootPath
    }

-- | 差分データから実際のDOMを操作して表示に反映させる
renderView :: forall message. View.ViewDiff message -> RenderState.RenderState message -> Effect.Effect Unit
renderView (View.ViewDiff viewDiff) renderState = do
  Effect.foreachE viewDiff.patchOperationList viewPatchOperationToEffect
  bodyElement <- getBodyElement
  renderChildren
    { htmlOrSvgElement: bodyElement
    , childrenDiff: viewDiff.childrenDiff
    , renderState
    , path: View.rootPath
    }
  Console.logValue "run renderView" { viewDiff, renderState }

viewPatchOperationToEffect :: View.ViewPatchOperation -> Effect.Effect Unit
viewPatchOperationToEffect = case _ of
  View.ChangePageName newPageName -> changePageName (NonEmptyString.toString newPageName)
  View.ChangeThemeColor colorMaybe ->
    changeThemeColor
      (Color.toHexString colorMaybe)
  View.ChangeLanguage languageMaybe ->
    changeLanguage
      (Nullable.toNullable (map Language.toIETFLanguageTag languageMaybe))
  View.ChangeBodyClass classNameOrEmpty -> changeBodyClass (Nullable.toNullable (map NonEmptyString.toString classNameOrEmpty))

foreign import changePageName :: String -> Effect.Effect Unit

foreign import changeThemeColor :: String -> Effect.Effect Unit

foreign import changeLanguage :: Nullable.Nullable String -> Effect.Effect Unit

foreign import changeBodyClass :: Nullable String -> Effect.Effect Unit

foreign import getBodyElement :: Effect.Effect HtmlOrSvgElement

foreign import setTextContent :: String -> HtmlOrSvgElement -> Effect.Effect Unit

foreign import data HtmlOrSvgElement :: Type

foreign import createDiv :: { id :: Nullable.Nullable String, class :: Nullable.Nullable String, dataPath :: String } -> Effect.Effect HtmlOrSvgElement

foreign import appendChild :: HtmlOrSvgElement -> HtmlOrSvgElement -> Effect.Effect Unit
