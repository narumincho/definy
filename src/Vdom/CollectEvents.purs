module Vdom.CollectEvents (collectMessageDataMapInChildList) where

import Prelude
import Data.Array.NonEmpty as NonEmptyArray
import Data.Maybe (Maybe(..))
import Data.String.NonEmpty as NonEmptyString
import Data.Tuple as Tuple
import StructuredUrl as StructuredUrl
import Vdom.PatchState as VdomPatchState
import Vdom.Path as Path
import Vdom.VdomPicked as Vdom

collectMessageDataMapInChildren ::
  forall message location.
  { locationToPathAndSearchParams :: location -> StructuredUrl.PathAndSearchParams
  , children :: Vdom.Children message location
  , path :: Path.Path
  , urlChangeMessageData :: location -> message
  } ->
  VdomPatchState.NewMessageMapParameter message
collectMessageDataMapInChildren parameter = case parameter of
  { children: Vdom.ChildrenText _ } -> VdomPatchState.newMessageMapParameterEmpty
  { children: Vdom.ChildrenElementList elementList, path, locationToPathAndSearchParams } ->
    collectMessageDataMapInChildList
      { locationToPathAndSearchParams
      , childList: NonEmptyArray.toArray elementList
      , path
      , urlChangeMessageData: parameter.urlChangeMessageData
      }

collectMessageDataMapInChildList ::
  forall message location.
  { locationToPathAndSearchParams :: location -> StructuredUrl.PathAndSearchParams
  , childList :: Array (Tuple.Tuple String (Vdom.ElementAndClass message location))
  , path :: Path.Path
  , urlChangeMessageData :: location -> message
  } ->
  VdomPatchState.NewMessageMapParameter message
collectMessageDataMapInChildList { locationToPathAndSearchParams, childList, path, urlChangeMessageData } =
  VdomPatchState.newMessageMapParameterUnions
    ( map
        ( \(Tuple.Tuple key element) ->
            collectMessageDataMapInElement
              { locationToPathAndSearchParams
              , element
              , path: Path.appendKey path key
              , urlChangeMessageData
              }
        )
        childList
    )

collectMessageDataMapInElement ::
  forall message location.
  { locationToPathAndSearchParams :: location -> StructuredUrl.PathAndSearchParams
  , element :: Vdom.ElementAndClass message location
  , path :: Path.Path
  , urlChangeMessageData :: location -> message
  } ->
  VdomPatchState.NewMessageMapParameter message
collectMessageDataMapInElement { locationToPathAndSearchParams, element: Vdom.ElementAndClass { element }, path, urlChangeMessageData } = case element of
  Vdom.ElementDiv (Vdom.Div rec) -> case rec.click of
    Just click ->
      VdomPatchState.newMessageMapParameterAddClick
        path
        click
        ( collectMessageDataMapInChildren
            { locationToPathAndSearchParams, children: rec.children, path, urlChangeMessageData
            }
        )
    Nothing -> collectMessageDataMapInChildren { locationToPathAndSearchParams, children: rec.children, path, urlChangeMessageData }
  Vdom.ElementSpan (Vdom.Span rec) -> case rec.click of
    Just click ->
      VdomPatchState.newMessageMapParameterAddClick
        path
        click
        ( collectMessageDataMapInChildren
            { locationToPathAndSearchParams, children: rec.children, path, urlChangeMessageData
            }
        )
    Nothing -> collectMessageDataMapInChildren { locationToPathAndSearchParams, children: rec.children, path, urlChangeMessageData }
  Vdom.ElementH1 (Vdom.H1 rec) -> case rec.click of
    Just click ->
      VdomPatchState.newMessageMapParameterAddClick
        path
        click
        (collectMessageDataMapInChildren { locationToPathAndSearchParams, children: rec.children, path, urlChangeMessageData })
    Nothing -> collectMessageDataMapInChildren { locationToPathAndSearchParams, children: rec.children, path, urlChangeMessageData }
  Vdom.ElementH2 (Vdom.H2 rec) -> case rec.click of
    Just click ->
      VdomPatchState.newMessageMapParameterAddClick
        path
        click
        (collectMessageDataMapInChildren { locationToPathAndSearchParams, children: rec.children, path, urlChangeMessageData })
    Nothing -> collectMessageDataMapInChildren { locationToPathAndSearchParams, children: rec.children, path, urlChangeMessageData }
  Vdom.ElementCode (Vdom.Code rec) -> case rec.click of
    Just click ->
      VdomPatchState.newMessageMapParameterAddClick
        path
        click
        (collectMessageDataMapInChildren { locationToPathAndSearchParams, children: rec.children, path, urlChangeMessageData })
    Nothing -> collectMessageDataMapInChildren { locationToPathAndSearchParams, children: rec.children, path, urlChangeMessageData }
  Vdom.ElementExternalLink (Vdom.ExternalLink rec) ->
    collectMessageDataMapInChildren
      { locationToPathAndSearchParams
      , children: rec.children
      , path
      , urlChangeMessageData
      }
  Vdom.ElementSameOriginLink (Vdom.SameOriginLink rec) ->
    VdomPatchState.newMessageMapParameterAddClick
      path
      ( VdomPatchState.clickMessageFrom
          { stopPropagation: false
          , message: urlChangeMessageData rec.href
          , url:
              Just
                ( NonEmptyString.toString
                    (StructuredUrl.pathAndSearchParamsToString (locationToPathAndSearchParams rec.href))
                )
          }
      )
      (collectMessageDataMapInChildren { locationToPathAndSearchParams, children: rec.children, path, urlChangeMessageData })
  Vdom.ElementButton (Vdom.Button rec) ->
    collectMessageDataMapInChildren
      { locationToPathAndSearchParams, children: rec.children, path, urlChangeMessageData }
  Vdom.ElementImg (Vdom.Img _) -> VdomPatchState.newMessageMapParameterEmpty
  Vdom.ElementInputRadio (Vdom.InputRadio _) -> VdomPatchState.newMessageMapParameterEmpty
  Vdom.ElementInputText (Vdom.InputText _) -> VdomPatchState.newMessageMapParameterEmpty
  Vdom.ElementTextArea (Vdom.TextArea _) -> VdomPatchState.newMessageMapParameterEmpty
  Vdom.ElementLabel (Vdom.Label rec) ->
    collectMessageDataMapInChildren
      { locationToPathAndSearchParams
      , children: rec.children
      , path
      , urlChangeMessageData
      }
  Vdom.ElementSvg (Vdom.Svg rec) ->
    collectMessageDataMapInChildList
      { locationToPathAndSearchParams
      , childList: rec.children
      , path
      , urlChangeMessageData
      }
  Vdom.ElementSvgPath (Vdom.SvgPath _) -> VdomPatchState.newMessageMapParameterEmpty
  Vdom.ElementSvgCircle (Vdom.SvgCircle rec) ->
    collectMessageDataMapInChildList
      { locationToPathAndSearchParams
      , childList: rec.children
      , path
      , urlChangeMessageData
      }
  Vdom.ElementSvgAnimate _ -> VdomPatchState.newMessageMapParameterEmpty
  Vdom.ElementSvgG (Vdom.SvgG rec) ->
    collectMessageDataMapInChildList
      { locationToPathAndSearchParams
      , childList: rec.children
      , path
      , urlChangeMessageData
      }
  Vdom.ElementSvgPolygon _ -> VdomPatchState.newMessageMapParameterEmpty
  Vdom.ElementSvgEllipse _ -> VdomPatchState.newMessageMapParameterEmpty
