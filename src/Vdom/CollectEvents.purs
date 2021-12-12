module Vdom.CollectEvents (collectMessageDataMapInChildList) where

import Prelude
import Data.Array.NonEmpty as NonEmptyArray
import Data.Maybe (Maybe(..))
import Data.Tuple as Tuple
import Vdom.Data as Vdom
import Vdom.PatchState as VdomPatchState
import Vdom.Path as Path

collectMessageDataMapInChildren ::
  forall message.
  Vdom.Children message ->
  Path.Path ->
  VdomPatchState.NewMessageMapParameter message
collectMessageDataMapInChildren element path = case element of
  Vdom.ChildrenText _ -> VdomPatchState.newMessageMapParameterEmpty
  Vdom.ChildrenElementList elementList ->
    collectMessageDataMapInChildList
      (NonEmptyArray.toArray elementList)
      path

collectMessageDataMapInChildList ::
  forall message.
  Array (Tuple.Tuple String (Vdom.Element message)) ->
  Path.Path ->
  VdomPatchState.NewMessageMapParameter message
collectMessageDataMapInChildList elementList path =
  VdomPatchState.newMessageMapParameterUnions
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
  VdomPatchState.NewMessageMapParameter message
collectMessageDataMapInElement element path = case element of
  Vdom.ElementDiv (Vdom.Div rec) -> case rec.click of
    Just click ->
      VdomPatchState.newMessageMapParameterAddClick
        path
        click
        (collectMessageDataMapInChildren rec.children path)
    Nothing -> collectMessageDataMapInChildren rec.children path
  Vdom.ElementH1 (Vdom.H1 rec) -> case rec.click of
    Just click ->
      VdomPatchState.newMessageMapParameterAddClick
        path
        click
        (collectMessageDataMapInChildren rec.children path)
    Nothing -> collectMessageDataMapInChildren rec.children path
  Vdom.ElementH2 (Vdom.H2 rec) -> case rec.click of
    Just click ->
      VdomPatchState.newMessageMapParameterAddClick
        path
        click
        (collectMessageDataMapInChildren rec.children path)
    Nothing -> collectMessageDataMapInChildren rec.children path
  Vdom.ElementExternalLink (Vdom.ExternalLink rec) -> collectMessageDataMapInChildren rec.children path
  Vdom.ElementSameOriginLink (Vdom.SameOriginLink rec) ->
    VdomPatchState.newMessageMapParameterAddClick
      path
      ( VdomPatchState.ClickMessageData
          { stopPropagation: false
          , message: rec.jumpMessage
          }
      )
      (collectMessageDataMapInChildren rec.children path)
  Vdom.ElementButton (Vdom.Button rec) -> collectMessageDataMapInChildren rec.children path
  Vdom.ElementImg (Vdom.Img _) -> VdomPatchState.newMessageMapParameterEmpty
  Vdom.ElementInputRadio (Vdom.InputRadio _) -> VdomPatchState.newMessageMapParameterEmpty
  Vdom.ElementInputText (Vdom.InputText _) -> VdomPatchState.newMessageMapParameterEmpty
  Vdom.ElementTextArea (Vdom.TextArea _) -> VdomPatchState.newMessageMapParameterEmpty
  Vdom.ElementLabel (Vdom.Label rec) -> collectMessageDataMapInChildren rec.children path
  Vdom.ElementSvg (Vdom.Svg rec) -> collectMessageDataMapInChildList rec.children path
  Vdom.ElementSvgPath (Vdom.SvgPath _) -> VdomPatchState.newMessageMapParameterEmpty
  Vdom.ElementSvgCircle (Vdom.SvgCircle rec) -> collectMessageDataMapInChildList rec.children path
  Vdom.ElementSvgAnimate (Vdom.SvgAnimate _) -> VdomPatchState.newMessageMapParameterEmpty
  Vdom.ElementSvgG (Vdom.SvgG rec) -> collectMessageDataMapInChildList rec.children path
