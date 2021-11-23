module Vdom.ToHtml (toHtml) where

import Data.Array as Array
import Data.Array.NonEmpty as NonEmptyArray
import Data.Maybe (Maybe(..))
import Data.Maybe as Maybe
import Data.String.NonEmpty as NonEmptyString
import Data.Tuple as Tuple
import Html.Data as Html
import Html.Wellknown as Wellknown
import Prelude as Prelude
import Vdom.Data as Data

toHtml :: forall message. Data.Vdom message -> Html.RawHtmlElement
toHtml (Data.Vdom vdom) =
  Wellknown.html
    vdom.language
    ( Wellknown.head
        ( Html.ElementList
            []
        )
    )
    ( Wellknown.body
        vdom.bodyClass
        ( Html.ElementList
            ( Array.cons
                (noScriptElement vdom.appName)
                ( Prelude.map
                    ( \(Tuple.Tuple _ element) ->
                        vdomElementToHtmlElement element
                    )
                    vdom.children
                )
            )
        )
    )

noScriptElement :: NonEmptyString.NonEmptyString -> Html.RawHtmlElement
noScriptElement appName =
  Wellknown.noscript
    ( Html.Text
        ( Prelude.append
            (NonEmptyString.toString appName)
            " では JavaScript を使用します. ブラウザの設定で有効にしてください."
        )
    )

vdomElementToHtmlElement :: forall message. Data.Element message -> Html.RawHtmlElement
vdomElementToHtmlElement = case _ of
  Data.ElementDiv (Data.Div rec) ->
    Wellknown.div
      { id: rec.id, class: rec.class }
      (vdomChildrenToHtmlChildren rec.children)
  Data.ElementH1 (Data.H1 rec) ->
    Wellknown.h1
      { id: rec.id, class: rec.class }
      (vdomChildrenToHtmlChildren rec.children)
  Data.ElementH2 (Data.H2 rec) ->
    Wellknown.h2
      { id: rec.id, class: rec.class }
      (vdomChildrenToHtmlChildren rec.children)
  Data.ElementExternalLink (Data.ExternalLink rec) ->
    Wellknown.a
      { id: rec.id, class: rec.class, href: rec.href }
      (vdomChildrenToHtmlChildren rec.children)
  Data.ElementLocalLink (Data.LocalLink rec) ->
    Wellknown.a
      { id: rec.id, class: rec.class, href: rec.href }
      (vdomChildrenToHtmlChildren rec.children)
  Data.ElementButton (Data.Button rec) ->
    Wellknown.button
      { id: rec.id, class: rec.class }
      (vdomChildrenToHtmlChildren rec.children)
  Data.ElementImg (Data.Img rec) ->
    Wellknown.img
      { id: rec.id, class: rec.class, alt: rec.alt, src: rec.src }
  Data.ElementInputRadio (Data.InputRadio rec) ->
    Wellknown.inputRadio
      { id: rec.id, class: rec.class, name: rec.name }
  Data.ElementInputText (Data.InputText rec) ->
    Wellknown.inputText
      { id: rec.id
      , class: rec.class
      , value: rec.value
      , readonly: Maybe.isNothing rec.inputOrReadonly
      }
  Data.ElementTextArea (Data.TextArea rec) ->
    Wellknown.textarea
      { id: rec.id
      , class: rec.class
      , value: rec.value
      , readonly: Maybe.isNothing rec.inputOrReadonly
      }
  Data.ElementLabel (Data.Label rec) ->
    Wellknown.label
      { id: rec.id
      , class: rec.class
      , for: rec.for
      }
      (vdomChildrenToHtmlChildren rec.children)
  Data.ElementSvg (Data.Svg rec) ->
    Wellknown.svg
      { id: rec.id
      , class: rec.class
      , viewBoxX: rec.viewBoxX
      , viewBoxY: rec.viewBoxY
      , viewBoxWidth: rec.viewBoxWidth
      , viewBoxHeight: rec.viewBoxHeight
      }
      ( Prelude.map
          ( \(Tuple.Tuple _ element) ->
              vdomElementToHtmlElement element
          )
          rec.children
      )
  Data.ElementSvgPath (Data.SvgPath rec) ->
    Wellknown.svgPath
      rec
  Data.ElementSvgCircle (Data.SvgCircle _) ->
    Wellknown.div
      { id: Nothing, class: Nothing }
      (Html.Text "toHtml SvgCircle は未実装")
  Data.ElementSvgAnimate (Data.SvgAnimate _) ->
    Wellknown.div
      { id: Nothing, class: Nothing }
      (Html.Text "toHtml SvgAnimate は未実装")
  Data.ElementSvgG (Data.SvgG _) ->
    Wellknown.div
      { id: Nothing, class: Nothing }
      (Html.Text "toHtml SvgG は未実装")

vdomChildrenToHtmlChildren :: forall message. Data.Children message -> Html.HtmlChildren
vdomChildrenToHtmlChildren = case _ of
  Data.ChildrenElementList list ->
    Html.ElementList
      ( NonEmptyArray.toArray
          ( Prelude.map
              ( \(Tuple.Tuple _ element) ->
                  vdomElementToHtmlElement element
              )
              list
          )
      )
  Data.ChildrenText text -> Html.Text text
