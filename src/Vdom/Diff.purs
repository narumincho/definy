module Vdom.Diff (createViewDiff) where

import Data.Array as Array
import Data.Map as Map
import Data.Maybe as Maybe
import Data.Tuple as Tuple
import Prelude as Prelude
import Vdom.View as View

createViewDiff :: forall message. View.View message -> View.View message -> View.ViewDiff message
createViewDiff (View.View oldView) (View.View newView) =
  View.ViewDiff
    { patchOperationList:
        Array.catMaybes
          [ if Prelude.notEq oldView.pageName newView.pageName then
              Maybe.Just (View.ChangePageName newView.pageName)
            else
              Maybe.Nothing
          , if Prelude.notEq oldView.themeColor newView.themeColor then
              Maybe.Just (View.ChangeThemeColor newView.themeColor)
            else
              Maybe.Nothing
          , if Prelude.notEq oldView.language newView.language then
              Maybe.Just (View.ChangeLanguage newView.language)
            else
              Maybe.Nothing
          , if Prelude.notEq oldView.bodyClass newView.bodyClass then
              Maybe.Just (View.ChangeBodyClass newView.bodyClass)
            else
              Maybe.Nothing
          ]
    , childrenDiff: createChildrenDiff oldView.children newView.children
    , newMessageData:
        View.MessageData
          { messageMap: Map.empty
          , pointerMove: newView.pointerMove
          , pointerDown: newView.pointerDown
          }
    }

createElementDiff :: forall message. View.Element message -> View.Element message -> String -> View.ElementDiff message
createElementDiff (View.ElementDiv (View.Div old)) (View.ElementDiv (View.Div new)) newKey =
  View.divDiff
    newKey
    { id: createStringDiff old.id new.id
    , class: createStringDiff old.class new.class
    , children: createChildrenDiff old.children new.children
    }

createElementDiff (View.ElementExternalLink (View.ExternalLink old)) (View.ElementExternalLink (View.ExternalLink new)) newKey =
  View.externalLinkDiff
    newKey
    { id: createStringDiff old.id new.id
    , class: createStringDiff old.class new.class
    , url: createStringDiff old.url new.url
    , children: createChildrenDiff old.children new.children
    }

createElementDiff (View.ElementLocalLink (View.LocalLink old)) (View.ElementLocalLink (View.LocalLink new)) newKey =
  View.localLinkDiff
    newKey
    { id: createStringDiff old.id new.id
    , class: createStringDiff old.class new.class
    , url: createStringDiff old.url new.url
    , children: createChildrenDiff old.children new.children
    }

createElementDiff (View.ElementButton (View.Button old)) (View.ElementButton (View.Button new)) newKey =
  View.buttonDiff
    newKey
    { id: createStringDiff old.id new.id
    , class: createStringDiff old.class new.class
    , children: createChildrenDiff old.children new.children
    }

createElementDiff (View.ElementImg (View.Img old)) (View.ElementImg (View.Img new)) newKey =
  View.imgDiff
    newKey
    { id: createStringDiff old.id new.id
    , class: createStringDiff old.class new.class
    , alt: createStringDiff old.alt new.alt
    , src: createStringDiff old.src new.src
    }

createElementDiff (View.ElementInputRadio (View.InputRadio old)) (View.ElementInputRadio (View.InputRadio new)) newKey =
  View.inputRadioDiff
    newKey
    { id: createStringDiff old.id new.id
    , class: createStringDiff old.class new.class
    , checked: booleanDiff old.checked new.checked
    , name: createStringDiff old.name new.name
    }

createElementDiff (View.ElementInputText (View.InputText old)) (View.ElementInputText (View.InputText new)) newKey =
  View.inputTextDiff
    newKey
    { id: createStringDiff old.id new.id
    , class: createStringDiff old.class new.class
    , readonly: createReadonlyDiff old.inputOrReadonly new.inputOrReadonly
    , value: createStringDiff old.value new.value
    }

createElementDiff (View.ElementTextArea (View.TextArea old)) (View.ElementTextArea (View.TextArea new)) newKey =
  View.textAreaDiff
    newKey
    { id: createStringDiff old.id new.id
    , class: createStringDiff old.class new.class
    , readonly: createReadonlyDiff old.inputOrReadonly new.inputOrReadonly
    , value: createStringDiff old.value new.value
    }

createElementDiff (View.ElementLabel (View.Label old)) (View.ElementLabel (View.Label new)) newKey =
  View.labelDiff
    newKey
    { id: createStringDiff old.id new.id
    , class: createStringDiff old.class new.class
    , for: createStringDiff old.for new.for
    , children: createChildrenDiff old.children new.children
    }

createElementDiff (View.ElementSvg (View.Svg old)) (View.ElementSvg (View.Svg new)) newKey =
  View.svgDiff
    newKey
    { id: createStringDiff old.id new.id
    , class: createStringDiff old.class new.class
    , viewBoxX: createNumberDiff old.viewBoxX new.viewBoxX
    , viewBoxY: createNumberDiff old.viewBoxY new.viewBoxY
    , viewBoxWidth: createNumberDiff old.viewBoxWidth new.viewBoxWidth
    , viewBoxHeight: createNumberDiff old.viewBoxHeight new.viewBoxHeight
    , children: createChildrenDiff old.children new.children
    }

createElementDiff (View.ElementSvgPath (View.SvgPath old)) (View.ElementSvgPath (View.SvgPath new)) newKey =
  View.svgPathDiff
    newKey
    { id: createStringDiff old.id new.id
    , class: createStringDiff old.class new.class
    , d: createStringDiff old.d new.d
    , fill: createStringDiff old.fill new.fill
    }

createElementDiff (View.ElementSvgCircle (View.SvgCircle old)) (View.ElementSvgCircle (View.SvgCircle new)) newKey =
  View.svgCircleDiff
    newKey
    { id: createStringDiff old.id new.id
    , class: createStringDiff old.class new.class
    , fill: createStringDiff old.fill new.fill
    , stroke: createStringDiff old.stroke new.stroke
    , cx: createNumberDiff old.cx new.cx
    , cy: createNumberDiff old.cy new.cy
    , r: createNumberDiff old.r new.r
    , children: createChildrenDiff old.children new.children
    }

createElementDiff (View.ElementSvgAnimate (View.SvgAnimate old)) (View.ElementSvgAnimate (View.SvgAnimate new)) newKey =
  View.svgAnimateDiff
    newKey
    { attributeName: createStringDiff old.attributeName new.attributeName
    , dur: createNumberDiff old.dur new.dur
    , repeatCount: createStringDiff old.repeatCount new.repeatCount
    , from: createStringDiff old.from new.from
    , to: createStringDiff old.to new.to
    }

createElementDiff _ new newKey = View.replace newKey new

createStringDiff :: String -> String -> Maybe.Maybe String
createStringDiff old new =
  if Prelude.eq old new then
    Maybe.Nothing
  else
    Maybe.Just new

booleanDiff :: Boolean -> Boolean -> Maybe.Maybe Boolean
booleanDiff old new =
  if Prelude.eq old new then
    Maybe.Nothing
  else
    Maybe.Just new

createNumberDiff :: Number -> Number -> Maybe.Maybe Number
createNumberDiff old new =
  if Prelude.eq old new then
    Maybe.Nothing
  else
    Maybe.Just new

createReadonlyDiff :: forall message. Maybe.Maybe (String -> message) -> Maybe.Maybe (String -> message) -> Maybe.Maybe Boolean
createReadonlyDiff Maybe.Nothing (Maybe.Just _) = Maybe.Just true

createReadonlyDiff (Maybe.Just _) (Maybe.Nothing) = Maybe.Just false

createReadonlyDiff _ _ = Maybe.Nothing

createChildrenDiff :: forall message. View.Children message -> View.Children message -> View.ChildrenDiff message
createChildrenDiff (View.ChildrenText old) (View.ChildrenText new)
  | Prelude.eq old new = View.ChildrenDiffSkip

createChildrenDiff _ (View.ChildrenText new) = View.ChildrenDiffSetText new

createChildrenDiff (View.ChildrenText _) (View.ChildrenElementList list) = View.ChildrenDiffResetAndInsert list

createChildrenDiff (View.ChildrenElementList old) (View.ChildrenElementList new) = View.ChildDiffList (createElementListChildrenDiff old new)

-- | TODO
createElementListChildrenDiff :: forall message. Array (Tuple.Tuple String (View.Element message)) -> Array (Tuple.Tuple String (View.Element message)) -> Array (View.ElementDiff message)
createElementListChildrenDiff _oldChildren _newChildren = []
