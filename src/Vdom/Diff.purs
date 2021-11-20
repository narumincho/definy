module Vdom.Diff (createViewDiff) where

import Data.Array as Array
import Data.Map as Map
import Data.Maybe as Maybe
import Data.Tuple as Tuple
import Prelude as Prelude
import Vdom.Data as View

createViewDiff :: forall message. View.Vdom message -> View.Vdom message -> View.ViewDiff message
createViewDiff (View.Vdom oldView) (View.Vdom newView) =
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
    { id: createDiff old.id new.id
    , class: createDiff old.class new.class
    , children: createChildrenDiff old.children new.children
    }

createElementDiff (View.ElementExternalLink (View.ExternalLink old)) (View.ElementExternalLink (View.ExternalLink new)) newKey =
  View.externalLinkDiff
    newKey
    { id: createDiff old.id new.id
    , class: createDiff old.class new.class
    , url: createDiff old.url new.url
    , children: createChildrenDiff old.children new.children
    }

createElementDiff (View.ElementLocalLink (View.LocalLink old)) (View.ElementLocalLink (View.LocalLink new)) newKey =
  View.localLinkDiff
    newKey
    { id: createDiff old.id new.id
    , class: createDiff old.class new.class
    , url: createDiff old.url new.url
    , children: createChildrenDiff old.children new.children
    }

createElementDiff (View.ElementButton (View.Button old)) (View.ElementButton (View.Button new)) newKey =
  View.buttonDiff
    newKey
    { id: createDiff old.id new.id
    , class: createDiff old.class new.class
    , children: createChildrenDiff old.children new.children
    }

createElementDiff (View.ElementImg (View.Img old)) (View.ElementImg (View.Img new)) newKey =
  View.imgDiff
    newKey
    { id: createDiff old.id new.id
    , class: createDiff old.class new.class
    , alt: createDiff old.alt new.alt
    , src: createDiff old.src new.src
    }

createElementDiff (View.ElementInputRadio (View.InputRadio old)) (View.ElementInputRadio (View.InputRadio new)) newKey =
  View.inputRadioDiff
    newKey
    { id: createDiff old.id new.id
    , class: createDiff old.class new.class
    , checked: createDiff old.checked new.checked
    , name: createDiff old.name new.name
    }

createElementDiff (View.ElementInputText (View.InputText old)) (View.ElementInputText (View.InputText new)) newKey =
  View.inputTextDiff
    newKey
    { id: createDiff old.id new.id
    , class: createDiff old.class new.class
    , readonly: createReadonlyDiff old.inputOrReadonly new.inputOrReadonly
    , value: createDiff old.value new.value
    }

createElementDiff (View.ElementTextArea (View.TextArea old)) (View.ElementTextArea (View.TextArea new)) newKey =
  View.textAreaDiff
    newKey
    { id: createDiff old.id new.id
    , class: createDiff old.class new.class
    , readonly: createReadonlyDiff old.inputOrReadonly new.inputOrReadonly
    , value: createDiff old.value new.value
    }

createElementDiff (View.ElementLabel (View.Label old)) (View.ElementLabel (View.Label new)) newKey =
  View.labelDiff
    newKey
    { id: createDiff old.id new.id
    , class: createDiff old.class new.class
    , for: createDiff old.for new.for
    , children: createChildrenDiff old.children new.children
    }

createElementDiff (View.ElementSvg (View.Svg old)) (View.ElementSvg (View.Svg new)) newKey =
  View.svgDiff
    newKey
    { id: createDiff old.id new.id
    , class: createDiff old.class new.class
    , viewBoxX: createDiff old.viewBoxX new.viewBoxX
    , viewBoxY: createDiff old.viewBoxY new.viewBoxY
    , viewBoxWidth: createDiff old.viewBoxWidth new.viewBoxWidth
    , viewBoxHeight: createDiff old.viewBoxHeight new.viewBoxHeight
    , children: createChildrenDiff old.children new.children
    }

createElementDiff (View.ElementSvgPath (View.SvgPath old)) (View.ElementSvgPath (View.SvgPath new)) newKey =
  View.svgPathDiff
    newKey
    { id: createDiff old.id new.id
    , class: createDiff old.class new.class
    , d: createDiff old.d new.d
    , fill: createDiff old.fill new.fill
    }

createElementDiff (View.ElementSvgCircle (View.SvgCircle old)) (View.ElementSvgCircle (View.SvgCircle new)) newKey =
  View.svgCircleDiff
    newKey
    { id: createDiff old.id new.id
    , class: createDiff old.class new.class
    , fill: createDiff old.fill new.fill
    , stroke: createDiff old.stroke new.stroke
    , cx: createDiff old.cx new.cx
    , cy: createDiff old.cy new.cy
    , r: createDiff old.r new.r
    , children: createChildrenDiff old.children new.children
    }

createElementDiff (View.ElementSvgAnimate (View.SvgAnimate old)) (View.ElementSvgAnimate (View.SvgAnimate new)) newKey =
  View.svgAnimateDiff
    newKey
    { attributeName: createDiff old.attributeName new.attributeName
    , dur: createDiff old.dur new.dur
    , repeatCount: createDiff old.repeatCount new.repeatCount
    , from: createDiff old.from new.from
    , to: createDiff old.to new.to
    }

createElementDiff _ new newKey = View.replace newKey new

createDiff :: forall a. Prelude.Eq a => a -> a -> Maybe.Maybe a
createDiff old new =
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
