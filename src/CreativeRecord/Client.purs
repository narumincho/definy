module CreativeRecord.Client (main) where

import Color.Scheme.MaterialDesign as Color
import CreativeRecord.ClientProgramHashValue as ClientProgramHashValue
import CreativeRecord.Origin as Origin
import CreativeRecord.StaticResource as StaticResource
import Css as Css
import Data.Maybe as Maybe
import Data.String.NonEmpty as NonEmptyString
import Data.Tuple as Tuple
import Effect as Effect
import Language as Language
import Prelude as Prelude
import StructuredUrl as StructuredUrl
import Type.Proxy as Proxy
import Vdom.Data as View
import Vdom.Render as Render
import Vdom.RenderState as RenderState

main :: Effect.Effect Prelude.Unit
main =
  Render.resetAndRenderView
    ( View.Vdom
        { pageName: NonEmptyString.nes (Proxy.Proxy :: Proxy.Proxy "書き換えた新しいページ名!")
        , appName: NonEmptyString.nes (Proxy.Proxy :: Proxy.Proxy "アプリ名!")
        , description: "説明..."
        , themeColor: Color.orange
        , iconPath: StaticResource.iconPng
        , language: Maybe.Just Language.Japanese
        , coverImagePath: StaticResource.iconPng
        , style: Css.StatementList { keyframesList: [], ruleList: [] }
        , path: Maybe.Just (StructuredUrl.fromPath [])
        , scriptPath:
            Maybe.Just
              ( StructuredUrl.fromPath
                  [ ClientProgramHashValue.clientProgramHashValue ]
              )
        , bodyClass: Maybe.Nothing
        , pointerMove: Maybe.Nothing
        , pointerDown: Maybe.Nothing
        , children:
            [ Tuple.Tuple "hi"
                ( View.ElementDiv
                    ( View.Div
                        { children: View.ChildrenText "書き換えたbody!"
                        , id: Maybe.Nothing
                        , class: Maybe.Nothing
                        , click: Maybe.Nothing
                        }
                    )
                )
            ]
        , origin: Origin.origin
        }
    )
    (RenderState.empty)
