module Vdom.ToHtml (toHtml) where

import Data.Array as Array
import Data.Array.NonEmpty as NonEmptyArray
import Data.Maybe (Maybe(..))
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
      (Html.Text "toHtml ExternalLink は未実装")
  Data.ElementLocalLink (Data.LocalLink _) ->
    Wellknown.div
      { id: Nothing, class: Nothing }
      (Html.Text "toHtml LocalLink は未実装")
  Data.ElementButton (Data.Button _) ->
    Wellknown.div
      { id: Nothing, class: Nothing }
      (Html.Text "toHtml Button は未実装")
  Data.ElementImg (Data.Img _) ->
    Wellknown.div
      { id: Nothing, class: Nothing }
      (Html.Text "toHtml Img は未実装")
  Data.ElementInputRadio (Data.InputRadio _) ->
    Wellknown.div
      { id: Nothing, class: Nothing }
      (Html.Text "toHtml InputRadio は未実装")
  Data.ElementInputText (Data.InputText _) ->
    Wellknown.div
      { id: Nothing, class: Nothing }
      (Html.Text "toHtml InputText は未実装")
  Data.ElementTextArea (Data.TextArea _) ->
    Wellknown.div
      { id: Nothing, class: Nothing }
      (Html.Text "toHtml TextArea は未実装")
  Data.ElementLabel (Data.Label _) ->
    Wellknown.div
      { id: Nothing, class: Nothing }
      (Html.Text "toHtml Label は未実装")
  Data.ElementSvg (Data.Svg _) ->
    Wellknown.div
      { id: Nothing, class: Nothing }
      (Html.Text "toHtml Svg は未実装")
  Data.ElementSvgPath (Data.SvgPath _) ->
    Wellknown.div
      { id: Nothing, class: Nothing }
      (Html.Text "toHtml SvgPath は未実装")
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
