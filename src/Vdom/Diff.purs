module Vdom.Diff (createViewDiff, createElementDiff) where

import Data.Array as Array
import Data.Array.NonEmpty (NonEmptyArray)
import Data.Array.NonEmpty as NonEmptyArray
import Data.Maybe (Maybe(..))
import Data.Maybe as Maybe
import Data.Tuple as Tuple
import Prelude as Prelude
import Vdom.VdomPicked as Data
import Vdom.PatchState as VdomPatchState

createViewDiff :: forall message location. Data.VdomPicked message location -> Data.VdomPicked message location -> Data.ViewDiff message location
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
    , childrenDiff: createChildListDiff oldVdom.children newVdom.children
    , newMessageData:
        Data.MessageData
          { messageMap: VdomPatchState.newMessageMapParameterEmpty
          , pointerMove: newVdom.pointerMove
          , pointerDown: newVdom.pointerDown
          }
    }

createElementDiff :: forall message location. (Prelude.Eq location) => Data.Element message location -> Data.Element message location -> String -> Data.ElementDiff message location
createElementDiff (Data.ElementDiv old) (Data.ElementDiv new) newKey = Data.createDivDeff newKey old new

createElementDiff (Data.ElementExternalLink old) (Data.ElementExternalLink new) newKey = Data.externalLinkDiff newKey old new

createElementDiff (Data.ElementSameOriginLink old) (Data.ElementSameOriginLink new) newKey =
  Data.localLinkDiff
    newKey
    old
    new

createElementDiff (Data.ElementButton old) (Data.ElementButton new) newKey =
  Data.buttonDiff
    newKey
    old
    new

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
    , children: createChildListDiff old.children new.children
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
    , children: createChildListDiff old.children new.children
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

createChildrenDiff :: forall message location. Data.Children message location -> Data.Children message location -> Data.ChildrenDiff message location
createChildrenDiff (Data.ChildrenText old) (Data.ChildrenText new)
  | Prelude.eq old new = Data.ChildrenDiffSkip

createChildrenDiff _ (Data.ChildrenText new) = Data.ChildrenDiffSetText new

createChildrenDiff (Data.ChildrenText _) (Data.ChildrenElementList list) = Data.ChildrenDiffResetAndInsert list

createChildrenDiff (Data.ChildrenElementList old) (Data.ChildrenElementList new) = Data.ChildDiffList (createElementListChildrenDiff old new)

createChildListDiff ::
  forall message location.
  Array (Tuple.Tuple String (Data.Element message location)) ->
  Array (Tuple.Tuple String (Data.Element message location)) ->
  Data.ChildrenDiff message location
createChildListDiff oldChildren newChildren = case Tuple.Tuple (NonEmptyArray.fromArray oldChildren) (NonEmptyArray.fromArray newChildren) of
  Tuple.Tuple (Just oldNonEmpty) (Just newNonEmpty) -> Data.ChildDiffList (createElementListChildrenDiff oldNonEmpty newNonEmpty)
  Tuple.Tuple Nothing Nothing -> Data.ChildrenDiffSkip
  Tuple.Tuple (Just _) Nothing -> Data.ChildrenDiffSetText ""
  Tuple.Tuple Nothing (Just newNonEmpty) -> Data.ChildrenDiffResetAndInsert newNonEmpty

-- | TODO
createElementListChildrenDiff ::
  forall message location.
  NonEmptyArray (Tuple.Tuple String (Data.Element message location)) ->
  NonEmptyArray (Tuple.Tuple String (Data.Element message location)) ->
  NonEmptyArray (Data.ElementDiff message location)
createElementListChildrenDiff _oldChildren _newChildren = NonEmptyArray.singleton Data.skip
