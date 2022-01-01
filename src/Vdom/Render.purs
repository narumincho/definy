module Vdom.Render (render, resetAndRender) where

import Prelude
import Color as Color
import Console as Console
import Css as Css
import Data.Array.NonEmpty as NonEmptyArray
import Data.Maybe (Maybe(..))
import Data.Maybe as Maybe
import Data.Nullable (Nullable)
import Data.Nullable as Nullable
import Data.String as String
import Data.String.NonEmpty as NonEmptyString
import Data.Tuple as Tuple
import Effect (Effect)
import Effect as Effect
import Effect.Uncurried as EffectUncurried
import Language as Language
import StructuredUrl as StructuredUrl
import Vdom.CollectEvents as CollectEvents
import Vdom.VdomPicked as Vdom
import Vdom.PatchState as VdomPatchState
import Vdom.Path as Path

-- | Vdom の Element から DOM API から HtmlElement か SvgElement を生成する
elementToHtmlOrSvgElement ::
  forall message location.
  { element :: Vdom.Element message location
  , path :: Path.Path
  , patchState :: VdomPatchState.PatchState message
  , locationToPathAndSearchParams :: location -> StructuredUrl.PathAndSearchParams
  } ->
  Effect HtmlOrSvgElement
elementToHtmlOrSvgElement { element, path, patchState, locationToPathAndSearchParams } = do
  htmlOrSvgElement <-
    elementToHtmlOrSvgElementWithoutDataPath { element, path, patchState, locationToPathAndSearchParams }
  EffectUncurried.runEffectFn2
    setDataPath
    htmlOrSvgElement
    (Path.toString path)
  pure htmlOrSvgElement

elementToHtmlOrSvgElementWithoutDataPath ::
  forall message location.
  { element :: Vdom.Element message location
  , path :: Path.Path
  , patchState :: VdomPatchState.PatchState message
  , locationToPathAndSearchParams :: location -> StructuredUrl.PathAndSearchParams
  } ->
  Effect HtmlOrSvgElement
elementToHtmlOrSvgElementWithoutDataPath { element, path, patchState, locationToPathAndSearchParams } = case element of
  Vdom.ElementDiv (Vdom.Div rec) -> do
    div <-
      EffectUncurried.runEffectFn1 createDiv
        { id: Nullable.toNullable (map NonEmptyString.toString rec.id)
        , class: Nullable.toNullable (map NonEmptyString.toString rec.class)
        , click:
            EffectUncurried.mkEffectFn1
              ( EffectUncurried.runEffectFn2
                  (VdomPatchState.getClickEventHandler patchState)
                  (Path.toString path)
              )
        }
    applyChildren { htmlOrSvgElement: div, children: rec.children, path, patchState, locationToPathAndSearchParams }
    pure div
  Vdom.ElementSpan (Vdom.Span rec) -> do
    span <-
      EffectUncurried.runEffectFn1 createSpan
        { id: Nullable.toNullable (map NonEmptyString.toString rec.id)
        , class: Nullable.toNullable (map NonEmptyString.toString rec.class)
        , click:
            EffectUncurried.mkEffectFn1
              ( EffectUncurried.runEffectFn2
                  (VdomPatchState.getClickEventHandler patchState)
                  (Path.toString path)
              )
        }
    applyChildren { htmlOrSvgElement: span, children: rec.children, path, patchState, locationToPathAndSearchParams }
    pure span
  Vdom.ElementH1 (Vdom.H1 rec) -> do
    h1 <-
      EffectUncurried.runEffectFn1 createH1
        { id: Nullable.toNullable (map NonEmptyString.toString rec.id)
        , class: Nullable.toNullable (map NonEmptyString.toString rec.class)
        , click:
            EffectUncurried.mkEffectFn1
              ( EffectUncurried.runEffectFn2
                  (VdomPatchState.getClickEventHandler patchState)
                  (Path.toString path)
              )
        }
    applyChildren { htmlOrSvgElement: h1, children: rec.children, path, patchState, locationToPathAndSearchParams }
    pure h1
  Vdom.ElementH2 (Vdom.H2 rec) -> do
    h2 <-
      EffectUncurried.runEffectFn1 createH2
        { id: Nullable.toNullable (map NonEmptyString.toString rec.id)
        , class: Nullable.toNullable (map NonEmptyString.toString rec.class)
        , click:
            EffectUncurried.mkEffectFn1
              ( EffectUncurried.runEffectFn2
                  (VdomPatchState.getClickEventHandler patchState)
                  (Path.toString path)
              )
        }
    applyChildren { htmlOrSvgElement: h2, children: rec.children, path, patchState, locationToPathAndSearchParams }
    pure h2
  Vdom.ElementCode (Vdom.Code rec) -> do
    code <-
      EffectUncurried.runEffectFn1 createCode
        { id: Nullable.toNullable (map NonEmptyString.toString rec.id)
        , class: Nullable.toNullable (map NonEmptyString.toString rec.class)
        , click:
            EffectUncurried.mkEffectFn1
              ( EffectUncurried.runEffectFn2
                  (VdomPatchState.getClickEventHandler patchState)
                  (Path.toString path)
              )
        }
    applyChildren { htmlOrSvgElement: code, children: rec.children, path, patchState, locationToPathAndSearchParams }
    pure code
  Vdom.ElementExternalLink (Vdom.ExternalLink rec) -> do
    anchor <-
      EffectUncurried.runEffectFn1 createExternalAnchor
        { id: Nullable.toNullable (map NonEmptyString.toString rec.id)
        , class: Nullable.toNullable (map NonEmptyString.toString rec.class)
        , href: NonEmptyString.toString (StructuredUrl.toString rec.href)
        }
    applyChildren { htmlOrSvgElement: anchor, children: rec.children, path, patchState, locationToPathAndSearchParams }
    pure anchor
  Vdom.ElementSameOriginLink (Vdom.SameOriginLink rec) -> do
    anchor <-
      EffectUncurried.runEffectFn1 createSameOriginAnchor
        { id: Nullable.toNullable (map NonEmptyString.toString rec.id)
        , class: Nullable.toNullable (map NonEmptyString.toString rec.class)
        , href: NonEmptyString.toString (StructuredUrl.pathAndSearchParamsToString (locationToPathAndSearchParams rec.href))
        , click:
            EffectUncurried.mkEffectFn1
              ( EffectUncurried.runEffectFn2
                  (VdomPatchState.getClickEventHandler patchState)
                  (Path.toString path)
              )
        }
    applyChildren { htmlOrSvgElement: anchor, children: rec.children, path, patchState, locationToPathAndSearchParams }
    pure anchor
  Vdom.ElementButton (Vdom.Button rec) -> do
    button <-
      EffectUncurried.runEffectFn1 createButton
        { id: Nullable.toNullable (map NonEmptyString.toString rec.id)
        , class: Nullable.toNullable (map NonEmptyString.toString rec.class)
        }
    applyChildren { htmlOrSvgElement: button, children: rec.children, path, patchState, locationToPathAndSearchParams }
    pure button
  Vdom.ElementImg (Vdom.Img rec) ->
    EffectUncurried.runEffectFn1 createImg
      { id: Nullable.toNullable (map NonEmptyString.toString rec.id)
      , class: Nullable.toNullable (map NonEmptyString.toString rec.class)
      , alt: rec.alt
      , src: NonEmptyString.toString (StructuredUrl.pathAndSearchParamsToString rec.src)
      }
  Vdom.ElementInputRadio (Vdom.InputRadio rec) ->
    EffectUncurried.runEffectFn1 createInputRadio
      { id: Nullable.toNullable (map NonEmptyString.toString rec.id)
      , class: Nullable.toNullable (map NonEmptyString.toString rec.class)
      , checked: rec.checked
      , name: NonEmptyString.toString rec.name
      }
  Vdom.ElementInputText (Vdom.InputText rec) ->
    EffectUncurried.runEffectFn1 createInputText
      { id: Nullable.toNullable (map NonEmptyString.toString rec.id)
      , class: Nullable.toNullable (map NonEmptyString.toString rec.class)
      , readonly: Maybe.isNothing rec.inputOrReadonly
      , value: rec.value
      }
  Vdom.ElementTextArea (Vdom.TextArea rec) ->
    EffectUncurried.runEffectFn1 createTextArea
      { id: Nullable.toNullable (map NonEmptyString.toString rec.id)
      , class: Nullable.toNullable (map NonEmptyString.toString rec.class)
      , readonly: Maybe.isNothing rec.inputOrReadonly
      , value: rec.value
      }
  Vdom.ElementLabel (Vdom.Label rec) -> do
    label <-
      EffectUncurried.runEffectFn1 createLabel
        { id: Nullable.toNullable (map NonEmptyString.toString rec.id)
        , class: Nullable.toNullable (map NonEmptyString.toString rec.class)
        , for: NonEmptyString.toString rec.for
        }
    applyChildren { htmlOrSvgElement: label, children: rec.children, path, patchState, locationToPathAndSearchParams }
    pure label
  Vdom.ElementSvg (Vdom.Svg rec) -> do
    svg <-
      EffectUncurried.runEffectFn1 createSvg
        { id: Nullable.toNullable (map NonEmptyString.toString rec.id)
        , class: Nullable.toNullable (map NonEmptyString.toString rec.class)
        , viewBox:
            String.joinWith " "
              [ show rec.viewBoxX
              , show rec.viewBoxY
              , show rec.viewBoxWidth
              , show rec.viewBoxHeight
              ]
        }
    applyChildList { htmlOrSvgElement: svg, childList: rec.children, path, patchState, locationToPathAndSearchParams }
    pure svg
  Vdom.ElementSvgPath (Vdom.SvgPath rec) ->
    EffectUncurried.runEffectFn1 createSvgPath
      { id: Nullable.toNullable (map NonEmptyString.toString rec.id)
      , class: Nullable.toNullable (map NonEmptyString.toString rec.class)
      , d: rec.d
      , fill: Color.toHexString rec.fill
      }
  Vdom.ElementSvgCircle (Vdom.SvgCircle rec) -> do
    svgCircle <-
      EffectUncurried.runEffectFn1 createSvgCircle
        { id: Nullable.toNullable (map NonEmptyString.toString rec.id)
        , class: Nullable.toNullable (map NonEmptyString.toString rec.class)
        , fill: Color.toHexString rec.fill
        , stroke: Nullable.toNullable (map Color.toHexString rec.stroke)
        , cx: rec.cx
        , cy: rec.cy
        , r: rec.r
        }
    applyChildList { htmlOrSvgElement: svgCircle, childList: rec.children, path, patchState, locationToPathAndSearchParams }
    pure svgCircle
  Vdom.ElementSvgAnimate (Vdom.SvgAnimate rec) ->
    EffectUncurried.runEffectFn1 createSvgAnimate
      { attributeName: NonEmptyString.toString rec.attributeName
      , dur: rec.dur
      , repeatCount: rec.repeatCount
      , from: rec.from
      , to: rec.to
      }
  Vdom.ElementSvgG (Vdom.SvgG rec) -> do
    svgG <-
      EffectUncurried.runEffectFn1 createSvgG
        { id: Nullable.null
        , class: Nullable.null
        , transform: NonEmptyString.joinWith " " rec.transform
        }
    applyChildList { htmlOrSvgElement: svgG, childList: rec.children, path, patchState, locationToPathAndSearchParams }
    pure svgG
  Vdom.ElementSvgPolygon (Vdom.SvgPolygon rec) ->
    EffectUncurried.runEffectFn1 createSvgPolygon
      { points:
          String.joinWith " "
            ( NonEmptyArray.toArray
                ( map
                    (\{ x, y } -> String.joinWith "," [ show x, show y ])
                    rec.points
                )
            )
      , fill: Color.toHexString rec.fill
      , stroke: Color.toHexString rec.stroke
      }
  Vdom.ElementSvgEllipse (Vdom.SvgEllipse rec) ->
    EffectUncurried.runEffectFn1 createSvgEllipse
      { cx: rec.cx
      , cy: rec.cy
      , rx: rec.rx
      , ry: rec.ry
      , fill: Color.toHexString rec.fill
      }

-- | HTMLElment か SVGElement の子要素を設定する
applyChildren ::
  forall message location.
  { htmlOrSvgElement :: HtmlOrSvgElement
  , children :: Vdom.Children message location
  , path :: Path.Path
  , patchState :: VdomPatchState.PatchState message
  , locationToPathAndSearchParams :: location -> StructuredUrl.PathAndSearchParams
  } ->
  Effect.Effect Unit
applyChildren = case _ of
  { htmlOrSvgElement, children: Vdom.ChildrenText text } ->
    EffectUncurried.runEffectFn2 setTextContent
      text
      htmlOrSvgElement
  { htmlOrSvgElement, children: Vdom.ChildrenElementList list, path, patchState, locationToPathAndSearchParams } ->
    applyChildList
      { htmlOrSvgElement
      , childList: NonEmptyArray.toArray list
      , path
      , patchState
      , locationToPathAndSearchParams
      }

applyChildList ::
  forall message location.
  { htmlOrSvgElement :: HtmlOrSvgElement
  , childList :: Array (Tuple.Tuple String (Vdom.Element message location))
  , path :: Path.Path
  , patchState :: VdomPatchState.PatchState message
  , locationToPathAndSearchParams :: location -> StructuredUrl.PathAndSearchParams
  } ->
  Effect.Effect Unit
applyChildList { htmlOrSvgElement, childList, path, patchState, locationToPathAndSearchParams } =
  Effect.foreachE childList
    ( \(Tuple.Tuple key child) -> do
        element <-
          elementToHtmlOrSvgElement
            { element: child
            , path: Path.appendKey path key
            , patchState
            , locationToPathAndSearchParams
            }
        EffectUncurried.runEffectFn2 appendChild htmlOrSvgElement element
    )

-- | HTMLElment か SVGElement の子要素に対して差分データの分を反映する
renderChildren ::
  forall message location.
  { htmlOrSvgElement :: HtmlOrSvgElement
  , childrenDiff :: Vdom.ChildrenDiff message location
  , patchState :: VdomPatchState.PatchState message
  , path :: Path.Path
  , locationToPathAndSearchParams :: location -> StructuredUrl.PathAndSearchParams
  } ->
  Effect.Effect Unit
renderChildren = case _ of
  { childrenDiff: Vdom.ChildrenDiffSkip } -> pure unit
  { htmlOrSvgElement, childrenDiff: Vdom.ChildrenDiffSetText newText } ->
    EffectUncurried.runEffectFn2 setTextContent
      newText
      htmlOrSvgElement
  { htmlOrSvgElement, childrenDiff: Vdom.ChildrenDiffResetAndInsert list, patchState, path, locationToPathAndSearchParams } -> do
    EffectUncurried.runEffectFn2 setTextContent "" htmlOrSvgElement
    applyChildren
      { htmlOrSvgElement
      , children: Vdom.ChildrenElementList list
      , patchState
      , path
      , locationToPathAndSearchParams
      }
  { childrenDiff: Vdom.ChildDiffList _ } -> pure unit

-- | すべてをリセットして再描画する. 最初に1回呼ぶと良い.
resetAndRender ::
  forall message location.
  { vdom :: Vdom.VdomPicked message location
  , patchState :: VdomPatchState.PatchState message
  , locationToPathAndSearchParams :: location -> StructuredUrl.PathAndSearchParams
  , urlChangeMessageData :: location -> message
  } ->
  Effect.Effect Unit
resetAndRender { vdom: Vdom.Vdom vdom, patchState, locationToPathAndSearchParams, urlChangeMessageData } = do
  Effect.foreachE
    [ Vdom.ChangePageName vdom.pageName
    , Vdom.ChangeThemeColor vdom.themeColor
    , Vdom.ChangeLanguage vdom.language
    , Vdom.ChangeBodyClass vdom.bodyClass
    ]
    viewPatchOperationToEffect
  VdomPatchState.setMessageDataMap
    patchState
    ( CollectEvents.collectMessageDataMapInChildList
        { childList: vdom.children
        , path: Path.root
        , locationToPathAndSearchParams
        , urlChangeMessageData
        }
    )
  bodyElement <- getBodyElement
  renderChildren
    { htmlOrSvgElement: bodyElement
    , childrenDiff:
        case NonEmptyArray.fromArray vdom.children of
          Just list -> Vdom.ChildrenDiffResetAndInsert list
          Nothing -> Vdom.ChildrenDiffSetText ""
    , patchState
    , path: Path.root
    , locationToPathAndSearchParams
    }
  EffectUncurried.runEffectFn1 setStyle (Css.ruleListToString vdom.style)

-- | 差分データから実際のDOMを操作して表示に反映させる
render ::
  forall message location.
  { viewDiff :: Vdom.ViewDiff message location
  , patchState :: VdomPatchState.PatchState message
  , locationToPathAndSearchParams :: location -> StructuredUrl.PathAndSearchParams
  } ->
  Effect.Effect Unit
render { viewDiff: Vdom.ViewDiff viewDiff, patchState, locationToPathAndSearchParams } = do
  Effect.foreachE viewDiff.patchOperationList viewPatchOperationToEffect
  bodyElement <- getBodyElement
  renderChildren
    { htmlOrSvgElement: bodyElement
    , childrenDiff: viewDiff.childrenDiff
    , patchState
    , path: Path.root
    , locationToPathAndSearchParams
    }
  Console.logValue "run renderView" { viewDiff, patchState }

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
    , click :: EffectUncurried.EffectFn1 VdomPatchState.MouseEvent Unit
    }
    HtmlOrSvgElement

foreign import createSpan ::
  EffectUncurried.EffectFn1
    { id :: Nullable String
    , class :: Nullable String
    , click :: EffectUncurried.EffectFn1 VdomPatchState.MouseEvent Unit
    }
    HtmlOrSvgElement

foreign import createH1 ::
  EffectUncurried.EffectFn1
    { id :: Nullable String
    , class :: Nullable String
    , click :: EffectUncurried.EffectFn1 VdomPatchState.MouseEvent Unit
    }
    HtmlOrSvgElement

foreign import createH2 ::
  EffectUncurried.EffectFn1
    { id :: Nullable String
    , class :: Nullable String
    , click :: EffectUncurried.EffectFn1 VdomPatchState.MouseEvent Unit
    }
    HtmlOrSvgElement

foreign import createCode ::
  EffectUncurried.EffectFn1
    { id :: Nullable String
    , class :: Nullable String
    , click :: EffectUncurried.EffectFn1 VdomPatchState.MouseEvent Unit
    }
    HtmlOrSvgElement

foreign import createExternalAnchor ::
  EffectUncurried.EffectFn1
    { id :: Nullable String
    , class :: Nullable String
    , href :: String
    }
    HtmlOrSvgElement

foreign import createSameOriginAnchor ::
  EffectUncurried.EffectFn1
    { id :: Nullable String
    , class :: Nullable String
    , href :: String
    , click :: EffectUncurried.EffectFn1 VdomPatchState.MouseEvent Unit
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

foreign import createTextArea ::
  EffectUncurried.EffectFn1
    { id :: Nullable String
    , class :: Nullable String
    , readonly :: Boolean
    , value :: String
    }
    HtmlOrSvgElement

foreign import createLabel ::
  EffectUncurried.EffectFn1
    { id :: Nullable String
    , class :: Nullable String
    , for :: String
    }
    HtmlOrSvgElement

foreign import createSvg ::
  EffectUncurried.EffectFn1
    { id :: Nullable String
    , class :: Nullable String
    , viewBox :: String
    }
    HtmlOrSvgElement

foreign import createSvgPath ::
  EffectUncurried.EffectFn1
    { id :: Nullable String
    , class :: Nullable String
    , d :: String
    , fill :: String
    }
    HtmlOrSvgElement

foreign import createSvgCircle ::
  EffectUncurried.EffectFn1
    { id :: Nullable String
    , class :: Nullable String
    , fill :: String
    , stroke :: Nullable String
    , cx :: Number
    , cy :: Number
    , r :: Number
    }
    HtmlOrSvgElement

foreign import createSvgAnimate ::
  EffectUncurried.EffectFn1
    { attributeName :: String
    , dur :: Number
    , repeatCount :: String
    , from :: String
    , to :: String
    }
    HtmlOrSvgElement

foreign import createSvgG ::
  EffectUncurried.EffectFn1
    { id :: Nullable String
    , class :: Nullable String
    , transform :: String
    }
    HtmlOrSvgElement

foreign import createSvgPolygon ::
  EffectUncurried.EffectFn1
    { points :: String
    , stroke :: String
    , fill :: String
    }
    HtmlOrSvgElement

foreign import createSvgEllipse ::
  EffectUncurried.EffectFn1
    { cx :: Number
    , cy :: Number
    , rx :: Number
    , ry :: Number
    , fill :: String
    }
    HtmlOrSvgElement

foreign import appendChild :: EffectUncurried.EffectFn2 HtmlOrSvgElement HtmlOrSvgElement Unit

foreign import setDataPath :: EffectUncurried.EffectFn2 HtmlOrSvgElement String Unit

foreign import setStyle :: EffectUncurried.EffectFn1 String Unit
