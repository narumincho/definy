module Vdom.Render (render, resetAndRender) where

import Prelude
import Color as Color
import Console as Console
import Data.Array.NonEmpty as NonEmptyArray
import Data.Maybe (Maybe(..))
import Data.Maybe as Maybe
import Data.Nullable (Nullable)
import Data.Nullable as Nullable
import Data.String.NonEmpty as NonEmptyString
import Data.Tuple as Tuple
import Effect (Effect)
import Effect as Effect
import Effect.Uncurried as EffectUncurried
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
  EffectUncurried.runEffectFn2
    setDataPath
    htmlOrSvgElement
    (Vdom.pathToString path)
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
      EffectUncurried.runEffectFn1 createDiv
        { id: Nullable.toNullable (map NonEmptyString.toString rec.id)
        , class: Nullable.toNullable (map NonEmptyString.toString rec.class)
        }
    applyChildren { htmlOrSvgElement: div, children: rec.children, path: path, renderState }
    pure div
  Vdom.ElementH1 (Vdom.H1 rec) -> do
    h1 <-
      EffectUncurried.runEffectFn1 createH1
        { id: Nullable.toNullable (map NonEmptyString.toString rec.id)
        , class: Nullable.toNullable (map NonEmptyString.toString rec.class)
        }
    applyChildren { htmlOrSvgElement: h1, children: rec.children, path: path, renderState }
    pure h1
  Vdom.ElementH2 (Vdom.H2 rec) -> do
    h2 <-
      EffectUncurried.runEffectFn1 createH2
        { id: Nullable.toNullable (map NonEmptyString.toString rec.id)
        , class: Nullable.toNullable (map NonEmptyString.toString rec.class)
        }
    applyChildren { htmlOrSvgElement: h2, children: rec.children, path: path, renderState }
    pure h2
  Vdom.ElementExternalLink (Vdom.ExternalLink rec) -> do
    anchor <-
      EffectUncurried.runEffectFn1 createA
        { id: Nullable.toNullable (map NonEmptyString.toString rec.id)
        , class: Nullable.toNullable (map NonEmptyString.toString rec.class)
        , href: NonEmptyString.toString (StructuredUrl.toString rec.href)
        }
    applyChildren { htmlOrSvgElement: anchor, children: rec.children, path: path, renderState }
    pure anchor
  Vdom.ElementLocalLink (Vdom.LocalLink rec) -> do
    anchor <-
      EffectUncurried.runEffectFn1 createA
        { id: Nullable.toNullable (map NonEmptyString.toString rec.id)
        , class: Nullable.toNullable (map NonEmptyString.toString rec.class)
        , href: NonEmptyString.toString (StructuredUrl.toString rec.href)
        }
    applyChildren { htmlOrSvgElement: anchor, children: rec.children, path: path, renderState }
    pure anchor
  Vdom.ElementButton (Vdom.Button rec) -> do
    button <-
      EffectUncurried.runEffectFn1 createButton
        { id: Nullable.toNullable (map NonEmptyString.toString rec.id)
        , class: Nullable.toNullable (map NonEmptyString.toString rec.class)
        }
    applyChildren { htmlOrSvgElement: button, children: rec.children, path: path, renderState }
    pure button
  Vdom.ElementImg (Vdom.Img rec) -> do
    image <-
      EffectUncurried.runEffectFn1 createImg
        { id: Nullable.toNullable (map NonEmptyString.toString rec.id)
        , class: Nullable.toNullable (map NonEmptyString.toString rec.class)
        , alt: rec.alt
        , src: NonEmptyString.toString (StructuredUrl.pathAndSearchParamsToString rec.src)
        }
    pure image
  Vdom.ElementInputRadio (Vdom.InputRadio rec) -> do
    div <-
      EffectUncurried.runEffectFn1 createInputRadio
        { id: Nullable.toNullable (map NonEmptyString.toString rec.id)
        , class: Nullable.toNullable (map NonEmptyString.toString rec.class)
        , checked: rec.checked
        , name: NonEmptyString.toString rec.name
        }
    pure div
  Vdom.ElementInputText (Vdom.InputText rec) -> do
    div <-
      EffectUncurried.runEffectFn1 createInputText
        { id: Nullable.toNullable (map NonEmptyString.toString rec.id)
        , class: Nullable.toNullable (map NonEmptyString.toString rec.class)
        , readonly: Maybe.isNothing rec.inputOrReadonly
        , value: rec.value
        }
    applyChildren { htmlOrSvgElement: div, children: Vdom.ChildrenText "notSupported", path: path, renderState }
    pure div
  Vdom.ElementTextArea (Vdom.TextArea rec) -> do
    div <-
      EffectUncurried.runEffectFn1 createDiv
        { id: Nullable.toNullable (map NonEmptyString.toString rec.id)
        , class: Nullable.toNullable (map NonEmptyString.toString rec.class)
        }
    applyChildren { htmlOrSvgElement: div, children: Vdom.ChildrenText "notSupported", path: path, renderState }
    pure div
  Vdom.ElementLabel (Vdom.Label rec) -> do
    div <-
      EffectUncurried.runEffectFn1 createDiv
        { id: Nullable.toNullable (map NonEmptyString.toString rec.id)
        , class: Nullable.toNullable (map NonEmptyString.toString rec.class)
        }
    applyChildren { htmlOrSvgElement: div, children: Vdom.ChildrenText "notSupported", path: path, renderState }
    pure div
  Vdom.ElementSvg (Vdom.Svg rec) -> do
    div <-
      EffectUncurried.runEffectFn1 createDiv
        { id: Nullable.toNullable (map NonEmptyString.toString rec.id)
        , class: Nullable.toNullable (map NonEmptyString.toString rec.class)
        }
    applyChildren { htmlOrSvgElement: div, children: Vdom.ChildrenText "notSupported", path: path, renderState }
    pure div
  Vdom.ElementSvgPath (Vdom.SvgPath rec) -> do
    div <-
      EffectUncurried.runEffectFn1 createDiv
        { id: Nullable.toNullable (map NonEmptyString.toString rec.id)
        , class: Nullable.toNullable (map NonEmptyString.toString rec.class)
        }
    applyChildren { htmlOrSvgElement: div, children: Vdom.ChildrenText "notSupported", path: path, renderState }
    pure div
  Vdom.ElementSvgCircle (Vdom.SvgCircle rec) -> do
    div <-
      EffectUncurried.runEffectFn1 createDiv
        { id: Nullable.toNullable (map NonEmptyString.toString rec.id)
        , class: Nullable.toNullable (map NonEmptyString.toString rec.class)
        }
    applyChildren { htmlOrSvgElement: div, children: Vdom.ChildrenText "notSupported", path: path, renderState }
    pure div
  Vdom.ElementSvgAnimate (Vdom.SvgAnimate _) -> do
    div <-
      EffectUncurried.runEffectFn1 createDiv
        { id: Nullable.null
        , class: Nullable.null
        }
    applyChildren { htmlOrSvgElement: div, children: Vdom.ChildrenText "notSupported", path: path, renderState }
    pure div
  Vdom.ElementSvgG (Vdom.SvgG _) -> do
    div <-
      EffectUncurried.runEffectFn1 createDiv
        { id: Nullable.null
        , class: Nullable.null
        }
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
  { htmlOrSvgElement, children: Vdom.ChildrenText text } ->
    EffectUncurried.runEffectFn2 setTextContent
      text
      htmlOrSvgElement
  { htmlOrSvgElement, children: Vdom.ChildrenElementList list, path, renderState } ->
    Effect.foreachE (NonEmptyArray.toArray list)
      ( \(Tuple.Tuple key child) -> do
          element <-
            elementToHtmlOrSvgElement
              { element: child
              , path: Vdom.pathAppendKey path key
              , renderState
              }
          EffectUncurried.runEffectFn2 appendChild htmlOrSvgElement element
      )

-- | HTMLElment か SVGElement の子要素に対して差分データの分を反映する
renderChildren :: forall message. { htmlOrSvgElement :: HtmlOrSvgElement, childrenDiff :: Vdom.ChildrenDiff message, renderState :: RenderState.RenderState message, path :: Vdom.Path } -> Effect.Effect Unit
renderChildren = case _ of
  { childrenDiff: Vdom.ChildrenDiffSkip } -> pure unit
  { htmlOrSvgElement, childrenDiff: Vdom.ChildrenDiffSetText newText } ->
    EffectUncurried.runEffectFn2 setTextContent
      newText
      htmlOrSvgElement
  { htmlOrSvgElement, childrenDiff: Vdom.ChildrenDiffResetAndInsert list, renderState, path } -> do
    EffectUncurried.runEffectFn2 setTextContent "" htmlOrSvgElement
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
  Vdom.ChangePageName newPageName ->
    EffectUncurried.runEffectFn1
      changePageName
      (NonEmptyString.toString newPageName)
  Vdom.ChangeThemeColor colorMaybe ->
    EffectUncurried.runEffectFn1 changeThemeColor
      (Color.toHexString colorMaybe)
  Vdom.ChangeLanguage languageMaybe ->
    EffectUncurried.runEffectFn1 changeLanguage
      (Nullable.toNullable (map Language.toIETFLanguageTag languageMaybe))
  Vdom.ChangeBodyClass classNameOrEmpty ->
    EffectUncurried.runEffectFn1 changeBodyClass
      (Nullable.toNullable (map NonEmptyString.toString classNameOrEmpty))

foreign import changePageName :: EffectUncurried.EffectFn1 String Unit

foreign import changeThemeColor :: EffectUncurried.EffectFn1 String Unit

foreign import changeLanguage :: EffectUncurried.EffectFn1 (Nullable String) Unit

foreign import changeBodyClass :: EffectUncurried.EffectFn1 (Nullable String) Unit

foreign import getBodyElement :: Effect HtmlOrSvgElement

foreign import setTextContent :: EffectUncurried.EffectFn2 String HtmlOrSvgElement Unit

foreign import data HtmlOrSvgElement :: Type

foreign import createDiv ::
  EffectUncurried.EffectFn1
    { id :: Nullable String
    , class :: Nullable String
    }
    HtmlOrSvgElement

foreign import createH1 ::
  EffectUncurried.EffectFn1
    { id :: Nullable String
    , class :: Nullable String
    }
    HtmlOrSvgElement

foreign import createH2 ::
  EffectUncurried.EffectFn1
    { id :: Nullable String
    , class :: Nullable String
    }
    HtmlOrSvgElement

foreign import createA ::
  EffectUncurried.EffectFn1
    { id :: Nullable String
    , class :: Nullable String
    , href :: String
    }
    HtmlOrSvgElement

foreign import createButton ::
  EffectUncurried.EffectFn1
    { id :: Nullable String
    , class :: Nullable String
    }
    HtmlOrSvgElement

foreign import createImg ::
  EffectUncurried.EffectFn1
    { id :: Nullable String
    , class :: Nullable String
    , alt :: String
    , src :: String
    }
    HtmlOrSvgElement

foreign import createInputRadio ::
  EffectUncurried.EffectFn1
    { id :: Nullable String
    , class :: Nullable String
    , checked :: Boolean
    , name :: String
    }
    HtmlOrSvgElement

foreign import createInputText ::
  EffectUncurried.EffectFn1
    { id :: Nullable String
    , class :: Nullable String
    , readonly :: Boolean
    , value :: String
    }
    HtmlOrSvgElement

foreign import appendChild :: EffectUncurried.EffectFn2 HtmlOrSvgElement HtmlOrSvgElement Unit

foreign import setDataPath :: EffectUncurried.EffectFn2 HtmlOrSvgElement String Unit
