module CreativeRecord.Client (main) where

import Color.Scheme.MaterialDesign as Color
import CreativeRecord.ClientProgramHashValue as ClientProgramHashValue
import CreativeRecord.Origin as Origin
import CreativeRecord.StaticResource as StaticResource
import Css as Css
import Data.Maybe as Maybe
import Data.Tuple as Tuple
import Effect as Effect
import Language as Language
import Prelude as Prelude
import StructuredUrl as StructuredUrl
import Vdom.Data as View
import Vdom.Render as Render
import Vdom.RenderState as RenderState

main :: Effect.Effect Prelude.Unit
main =
  Render.resetAndRenderView
    ( View.Vdom
        { pageName: "書き換えた新しいページ名!"
        , appName: "アプリ名!"
        , description: "説明..."
        , themeColor: Color.orange
        , iconPath: StaticResource.iconPng
        , language: Maybe.Just Language.Japanese
        , coverImagePath: StaticResource.iconPng
        , style: Css.StatementList { keyframesList: [], ruleList: [] }
        , path: Maybe.Just (StructuredUrl.fromPath [])
        , scriptPath:
            StructuredUrl.fromPath
              [ ClientProgramHashValue.clientProgramHashValue ]
        , bodyClass: ""
        , pointerMove: Maybe.Nothing
        , pointerDown: Maybe.Nothing
        , children:
            View.ChildrenElementList
              [ Tuple.Tuple "hi"
                  ( View.ElementDiv
                      ( View.Div
                          { children: View.ChildrenText "書き換えたbody!"
                          , id: ""
                          , class: ""
                          , click: Maybe.Nothing
                          }
                      )
                  )
              ]
        , origin: Origin.origin
        }
    )
    (RenderState.empty)
