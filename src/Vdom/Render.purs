module Vdom.Render (render, resetAndRender) where

import Prelude
import Color as Color
import Console as Console
import Data.Array.NonEmpty as NonEmptyArray
import Data.Maybe (Maybe(..))
import Data.Nullable (Nullable)
import Data.Nullable as Nullable
import Data.String.NonEmpty as NonEmptyString
import Data.Tuple as Tuple
import Effect (Effect)
import Effect as Effect
import Language as Language
import StructuredUrl as StructuredUrl
import Vdom.Data as Vdom
import Vdom.RenderState as RenderState

-- | Vdom の Element から DOM API から HtmlElement か SvgElement を生成する
elementToHtmlOrSvgElement ::
  forall message.
  { element :: Vdom.Element message
  , path :: Vdom.Path
  , renderState :: RenderState.RenderState message
  } ->
  Effect HtmlOrSvgElement
elementToHtmlOrSvgElement { element, path, renderState } = do
  htmlOrSvgElement <-
    elementToHtmlOrSvgElementWithoutDataPath { element, path, renderState }
  setDataPath htmlOrSvgElement (Vdom.pathToString path)
  pure htmlOrSvgElement

elementToHtmlOrSvgElementWithoutDataPath ::
  forall message.
  { element :: Vdom.Element message
  , path :: Vdom.Path
  , renderState :: RenderState.RenderState message
  } ->
  Effect HtmlOrSvgElement
elementToHtmlOrSvgElementWithoutDataPath { element, path, renderState } = case element of
  Vdom.ElementDiv (Vdom.Div rec) -> do
    div <-
      createDiv
        { id: Nullable.toNullable (map NonEmptyString.toString rec.id)
        , class: Nullable.toNullable (map NonEmptyString.toString rec.class)
        }
    applyChildren { htmlOrSvgElement: div, children: rec.children, path: path, renderState }
    pure div
  Vdom.ElementH1 (Vdom.H1 rec) -> do
    h1 <-
      createH1
        { id: Nullable.toNullable (map NonEmptyString.toString rec.id)
        , class: Nullable.toNullable (map NonEmptyString.toString rec.class)
        }
    applyChildren { htmlOrSvgElement: h1, children: rec.children, path: path, renderState }
    pure h1
  Vdom.ElementH2 (Vdom.H2 rec) -> do
    h2 <-
      createH2
        { id: Nullable.toNullable (map NonEmptyString.toString rec.id)
        , class: Nullable.toNullable (map NonEmptyString.toString rec.class)
        }
    applyChildren { htmlOrSvgElement: h2, children: rec.children, path: path, renderState }
    pure h2
  Vdom.ElementExternalLink (Vdom.ExternalLink rec) -> do
    anchor <-
      createA
        { id: Nullable.toNullable (map NonEmptyString.toString rec.id)
        , class: Nullable.toNullable (map NonEmptyString.toString rec.class)
        , href: NonEmptyString.toString (StructuredUrl.toString rec.href)
        }
    applyChildren { htmlOrSvgElement: anchor, children: rec.children, path: path, renderState }
    pure anchor
  _ -> do
    div <- createDiv { id: Nullable.null, class: Nullable.null }
    applyChildren { htmlOrSvgElement: div, children: Vdom.ChildrenText "notSupported", path: path, renderState }
    pure div

-- | HTMLElment か SVGElement の子要素を設定する
applyChildren ::
  forall message.
  { htmlOrSvgElement :: HtmlOrSvgElement
  , children :: Vdom.Children message
  , path :: Vdom.Path
  , renderState :: RenderState.RenderState message
  } ->
  Effect.Effect Unit
applyChildren = case _ of
  { htmlOrSvgElement, children: Vdom.ChildrenText text } -> setTextContent text htmlOrSvgElement
  { htmlOrSvgElement, children: Vdom.ChildrenElementList list, path, renderState } ->
    Effect.foreachE (NonEmptyArray.toArray list)
      ( \(Tuple.Tuple key child) -> do
          element <-
            elementToHtmlOrSvgElement
              { element: child
              , path: Vdom.pathAppendKey path key
              , renderState
              }
          appendChild htmlOrSvgElement element
      )

-- | HTMLElment か SVGElement の子要素に対して差分データの分を反映する
renderChildren :: forall message. { htmlOrSvgElement :: HtmlOrSvgElement, childrenDiff :: Vdom.ChildrenDiff message, renderState :: RenderState.RenderState message, path :: Vdom.Path } -> Effect.Effect Unit
renderChildren = case _ of
  { childrenDiff: Vdom.ChildrenDiffSkip } -> pure unit
  { htmlOrSvgElement, childrenDiff: Vdom.ChildrenDiffSetText newText } -> setTextContent newText htmlOrSvgElement
  { htmlOrSvgElement, childrenDiff: Vdom.ChildrenDiffResetAndInsert list, renderState, path } -> do
    setTextContent "" htmlOrSvgElement
    applyChildren
      { htmlOrSvgElement
      , children: Vdom.ChildrenElementList list
      , renderState
      , path
      }
  { childrenDiff: Vdom.ChildDiffList _ } -> pure unit

-- | すべてをリセットして再描画する. 最初に1回呼ぶと良い.
resetAndRender :: forall message. Vdom.Vdom message -> RenderState.RenderState message -> Effect.Effect Unit
resetAndRender (Vdom.Vdom view) renderState = do
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
        case NonEmptyArray.fromArray view.children of
          Just list -> Vdom.ChildrenDiffResetAndInsert list
          Nothing -> Vdom.ChildrenDiffSetText ""
    , renderState
    , path: Vdom.rootPath
    }

-- | 差分データから実際のDOMを操作して表示に反映させる
render :: forall message. Vdom.ViewDiff message -> RenderState.RenderState message -> Effect.Effect Unit
render (Vdom.ViewDiff viewDiff) renderState = do
  Effect.foreachE viewDiff.patchOperationList viewPatchOperationToEffect
  bodyElement <- getBodyElement
  renderChildren
    { htmlOrSvgElement: bodyElement
    , childrenDiff: viewDiff.childrenDiff
    , renderState
    , path: Vdom.rootPath
    }
  Console.logValue "run renderView" { viewDiff, renderState }

viewPatchOperationToEffect :: Vdom.ViewPatchOperation -> Effect.Effect Unit
viewPatchOperationToEffect = case _ of
  Vdom.ChangePageName newPageName -> changePageName (NonEmptyString.toString newPageName)
  Vdom.ChangeThemeColor colorMaybe ->
    changeThemeColor
      (Color.toHexString colorMaybe)
  Vdom.ChangeLanguage languageMaybe ->
    changeLanguage
      (Nullable.toNullable (map Language.toIETFLanguageTag languageMaybe))
  Vdom.ChangeBodyClass classNameOrEmpty -> changeBodyClass (Nullable.toNullable (map NonEmptyString.toString classNameOrEmpty))

foreign import changePageName :: String -> Effect.Effect Unit

foreign import changeThemeColor :: String -> Effect.Effect Unit

foreign import changeLanguage :: Nullable String -> Effect.Effect Unit

foreign import changeBodyClass :: Nullable String -> Effect.Effect Unit

foreign import getBodyElement :: Effect.Effect HtmlOrSvgElement

foreign import setTextContent :: String -> HtmlOrSvgElement -> Effect.Effect Unit

foreign import data HtmlOrSvgElement :: Type

foreign import createDiv ::
  { id :: Nullable String
  , class :: Nullable String
  } ->
  Effect.Effect HtmlOrSvgElement

foreign import createH1 ::
  { id :: Nullable String
  , class :: Nullable String
  } ->
  Effect.Effect HtmlOrSvgElement

foreign import createH2 ::
  { id :: Nullable String
  , class :: Nullable String
  } ->
  Effect.Effect HtmlOrSvgElement

foreign import createA ::
  { id :: Nullable String
  , class :: Nullable String
  , href :: String
  } ->
  Effect.Effect HtmlOrSvgElement

foreign import setDataPath :: HtmlOrSvgElement -> String -> Effect.Effect Unit

foreign import appendChild :: HtmlOrSvgElement -> HtmlOrSvgElement -> Effect.Effect Unit
