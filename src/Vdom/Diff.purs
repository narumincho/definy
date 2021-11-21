module Vdom.Diff (createViewDiff, createElementDiff) where

import Data.Array as Array
import Data.Map as Map
import Data.Maybe as Maybe
import Data.Tuple as Tuple
import Prelude as Prelude
import Vdom.Data as Data

createViewDiff :: forall message. Data.Vdom message -> Data.Vdom message -> Data.ViewDiff message
createViewDiff (Data.Vdom oldVdom) (Data.Vdom newVdom) =
  Data.ViewDiff
    { patchOperationList:
        Array.catMaybes
          [ if Prelude.notEq oldVdom.pageName newVdom.pageName then
              Maybe.Just (Data.ChangePageName newVdom.pageName)
            else
              Maybe.Nothing
          , if Prelude.notEq oldVdom.themeColor newVdom.themeColor then
              Maybe.Just (Data.ChangeThemeColor newVdom.themeColor)
            else
              Maybe.Nothing
          , if Prelude.notEq oldVdom.language newVdom.language then
              Maybe.Just (Data.ChangeLanguage newVdom.language)
            else
              Maybe.Nothing
          , if Prelude.notEq oldVdom.bodyClass newVdom.bodyClass then
              Maybe.Just (Data.ChangeBodyClass newVdom.bodyClass)
            else
              Maybe.Nothing
          ]
    , childrenDiff: createChildrenDiff oldVdom.children newVdom.children
    , newMessageData:
        Data.MessageData
          { messageMap: Map.empty
          , pointerMove: newVdom.pointerMove
          , pointerDown: newVdom.pointerDown
          }
    }

createElementDiff :: forall message. Data.Element message -> Data.Element message -> String -> Data.ElementDiff message
createElementDiff (Data.ElementDiv old) (Data.ElementDiv new) newKey = Data.createDivDeff newKey old new

createElementDiff (Data.ElementExternalLink (Data.ExternalLink old)) (Data.ElementExternalLink (Data.ExternalLink new)) newKey =
  Data.externalLinkDiff
    newKey
    { id: createDiff old.id new.id
    , class: createDiff old.class new.class
    , url: createDiff old.url new.url
    , children: createChildrenDiff old.children new.children
    }

createElementDiff (Data.ElementLocalLink (Data.LocalLink old)) (Data.ElementLocalLink (Data.LocalLink new)) newKey =
  Data.localLinkDiff
    newKey
    { id: createDiff old.id new.id
    , class: createDiff old.class new.class
    , url: createDiff old.url new.url
    , children: createChildrenDiff old.children new.children
    }

createElementDiff (Data.ElementButton (Data.Button old)) (Data.ElementButton (Data.Button new)) newKey =
  Data.buttonDiff
    newKey
    { id: createDiff old.id new.id
    , class: createDiff old.class new.class
    , children: createChildrenDiff old.children new.children
    }

createElementDiff (Data.ElementImg (Data.Img old)) (Data.ElementImg (Data.Img new)) newKey =
  Data.imgDiff
    newKey
    { id: createDiff old.id new.id
    , class: createDiff old.class new.class
    , alt: createDiff old.alt new.alt
    , src: createDiff old.src new.src
    }

createElementDiff (Data.ElementInputRadio (Data.InputRadio old)) (Data.ElementInputRadio (Data.InputRadio new)) newKey =
  Data.inputRadioDiff
    newKey
    { id: createDiff old.id new.id
    , class: createDiff old.class new.class
    , checked: createDiff old.checked new.checked
    , name: createDiff old.name new.name
    }

createElementDiff (Data.ElementInputText (Data.InputText old)) (Data.ElementInputText (Data.InputText new)) newKey =
  Data.inputTextDiff
    newKey
    { id: createDiff old.id new.id
    , class: createDiff old.class new.class
    , readonly: createReadonlyDiff old.inputOrReadonly new.inputOrReadonly
    , value: createDiff old.value new.value
    }

createElementDiff (Data.ElementTextArea (Data.TextArea old)) (Data.ElementTextArea (Data.TextArea new)) newKey =
  Data.textAreaDiff
    newKey
    { id: createDiff old.id new.id
    , class: createDiff old.class new.class
    , readonly: createReadonlyDiff old.inputOrReadonly new.inputOrReadonly
    , value: createDiff old.value new.value
    }

createElementDiff (Data.ElementLabel (Data.Label old)) (Data.ElementLabel (Data.Label new)) newKey =
  Data.labelDiff
    newKey
    { id: createDiff old.id new.id
    , class: createDiff old.class new.class
    , for: createDiff old.for new.for
    , children: createChildrenDiff old.children new.children
    }

createElementDiff (Data.ElementSvg (Data.Svg old)) (Data.ElementSvg (Data.Svg new)) newKey =
  Data.svgDiff
    newKey
    { id: createDiff old.id new.id
    , class: createDiff old.class new.class
    , viewBoxX: createDiff old.viewBoxX new.viewBoxX
    , viewBoxY: createDiff old.viewBoxY new.viewBoxY
    , viewBoxWidth: createDiff old.viewBoxWidth new.viewBoxWidth
    , viewBoxHeight: createDiff old.viewBoxHeight new.viewBoxHeight
    , children: createChildrenDiff old.children new.children
    }

createElementDiff (Data.ElementSvgPath (Data.SvgPath old)) (Data.ElementSvgPath (Data.SvgPath new)) newKey =
  Data.svgPathDiff
    newKey
    { id: createDiff old.id new.id
    , class: createDiff old.class new.class
    , d: createDiff old.d new.d
    , fill: createDiff old.fill new.fill
    }

createElementDiff (Data.ElementSvgCircle (Data.SvgCircle old)) (Data.ElementSvgCircle (Data.SvgCircle new)) newKey =
  Data.svgCircleDiff
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

createElementDiff (Data.ElementSvgAnimate (Data.SvgAnimate old)) (Data.ElementSvgAnimate (Data.SvgAnimate new)) newKey =
  Data.svgAnimateDiff
    newKey
    { attributeName: createDiff old.attributeName new.attributeName
    , dur: createDiff old.dur new.dur
    , repeatCount: createDiff old.repeatCount new.repeatCount
    , from: createDiff old.from new.from
    , to: createDiff old.to new.to
    }

createElementDiff _ new newKey = Data.replace newKey new

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

createChildrenDiff :: forall message. Data.Children message -> Data.Children message -> Data.ChildrenDiff message
createChildrenDiff (Data.ChildrenText old) (Data.ChildrenText new)
  | Prelude.eq old new = Data.ChildrenDiffSkip

createChildrenDiff _ (Data.ChildrenText new) = Data.ChildrenDiffSetText new

createChildrenDiff (Data.ChildrenText _) (Data.ChildrenElementList list) = Data.ChildrenDiffResetAndInsert list

createChildrenDiff (Data.ChildrenElementList old) (Data.ChildrenElementList new) = Data.ChildDiffList (createElementListChildrenDiff old new)

-- | TODO
createElementListChildrenDiff :: forall message. Array (Tuple.Tuple String (Data.Element message)) -> Array (Tuple.Tuple String (Data.Element message)) -> Array (Data.ElementDiff message)
createElementListChildrenDiff _oldChildren _newChildren = []
