module Vdom.CollectEvents (collectMessageDataMapInChildList) where

import Prelude
import Data.Array.NonEmpty as NonEmptyArray
import Data.Map as Map
import Data.Maybe (Maybe(..))
import Data.Tuple as Tuple
import Vdom.Data as Vdom
import Vdom.PatchState as VdomPatchState
import Vdom.Path as Path

collectMessageDataMapInChildren ::
  forall message.
  Vdom.Children message ->
  Path.Path ->
  Map.Map Path.Path (VdomPatchState.Events message)
collectMessageDataMapInChildren element path = case element of
  Vdom.ChildrenText _ -> Map.empty
  Vdom.ChildrenElementList elementList ->
    collectMessageDataMapInChildList
      (NonEmptyArray.toArray elementList)
      path

collectMessageDataMapInChildList ::
  forall message.
  Array (Tuple.Tuple String (Vdom.Element message)) ->
  Path.Path ->
  Map.Map Path.Path (VdomPatchState.Events message)
collectMessageDataMapInChildList elementList path =
  Map.unions
    ( map
        ( \(Tuple.Tuple key element) ->
            collectMessageDataMapInElement element (Path.appendKey path key)
        )
        elementList
    )

collectMessageDataMapInElement ::
  forall message.
  Vdom.Element message ->
  Path.Path ->
  Map.Map Path.Path (VdomPatchState.Events message)
collectMessageDataMapInElement element path = case element of
  Vdom.ElementDiv (Vdom.Div rec) ->
    Map.insert
      path
      ( VdomPatchState.eventsFrom
          { onClick: rec.click
          , onChange: Nothing
          , onInput: Nothing
          }
      )
      (collectMessageDataMapInChildren rec.children path)
  Vdom.ElementH1 (Vdom.H1 rec) ->
    Map.insert
      path
      ( VdomPatchState.eventsFrom
          { onClick: rec.click
          , onChange: Nothing
          , onInput: Nothing
          }
      )
      (collectMessageDataMapInChildren rec.children path)
  Vdom.ElementH2 (Vdom.H2 rec) ->
    Map.insert
      path
      ( VdomPatchState.eventsFrom
          { onClick: rec.click
          , onChange: Nothing
          , onInput: Nothing
          }
      )
      (collectMessageDataMapInChildren rec.children path)
  Vdom.ElementExternalLink (Vdom.ExternalLink rec) -> collectMessageDataMapInChildren rec.children path
  Vdom.ElementSameOriginLink (Vdom.SameOriginLink rec) ->
    Map.insert
      path
      ( VdomPatchState.eventsFrom
          { onClick:
              Just
                ( VdomPatchState.ClickMessageData
                    { stopPropagation: false
                    , message: rec.jumpMessage
                    }
                )
          , onChange: Nothing
          , onInput: Nothing
          }
      )
      (collectMessageDataMapInChildren rec.children path)
  Vdom.ElementButton (Vdom.Button rec) -> collectMessageDataMapInChildren rec.children path
  Vdom.ElementImg (Vdom.Img _) -> Map.empty
  Vdom.ElementInputRadio (Vdom.InputRadio _) -> Map.empty
  Vdom.ElementInputText (Vdom.InputText _) -> Map.empty
  Vdom.ElementTextArea (Vdom.TextArea _) -> Map.empty
  Vdom.ElementLabel (Vdom.Label rec) -> collectMessageDataMapInChildren rec.children path
  Vdom.ElementSvg (Vdom.Svg rec) -> collectMessageDataMapInChildList rec.children path
  Vdom.ElementSvgPath (Vdom.SvgPath _) -> Map.empty
  Vdom.ElementSvgCircle (Vdom.SvgCircle rec) -> collectMessageDataMapInChildList rec.children path
  Vdom.ElementSvgAnimate (Vdom.SvgAnimate _) -> Map.empty
  Vdom.ElementSvgG (Vdom.SvgG rec) -> collectMessageDataMapInChildList rec.children path
