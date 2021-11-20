module CreativeRecord.Client (main) where

import CreativeRecord.ClientProgramHashValue as ClientProgramHashValue
import CreativeRecord.Origin as Origin
import CreativeRecord.StaticResource as StaticResource
import Data.Maybe as Maybe
import Data.Tuple as Tuple
import Effect as Effect
import Language as Language
import Prelude as Prelude
import StructuredUrl as StructuredUrl
import Vdom.Render as Render
import Vdom.RenderState as RenderState
import Vdom.View as View

main :: Effect.Effect Prelude.Unit
main =
  Render.resetAndRenderView
    ( View.View
        { pageName: "書き換えた新しいページ名!"
        , appName: "アプリ名!"
        , description: "説明..."
        , themeColor: Maybe.Nothing
        , iconPath: StaticResource.iconPng
        , language: Maybe.Just Language.Japanese
        , coverImagePath: StaticResource.iconPng
        , path: StructuredUrl.fromPath []
        , scriptPath: StructuredUrl.fromPath [ ClientProgramHashValue.clientProgramHashValue ]
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
