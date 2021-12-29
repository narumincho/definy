module View.Helper
  ( PercentageOrRem(..)
  , image
  ) where

import Css as Css
import Data.Maybe (Maybe(..))
import Option as Option
import StructuredUrl as StructuredUrl
import Type.Proxy as Proxy
import View.Data as Data

type ImageRequired
  = ( path :: StructuredUrl.PathAndSearchParams
    , width :: PercentageOrRem
    , height :: Number
    , alternativeText :: String
    )

data PercentageOrRem
  = Rem Number
  | Percentage Number

type ImageOptional
  = ( objectFit :: Css.ObjectFitValue )

image ::
  forall message location (r :: Row Type).
  Option.FromRecord
    r
    ImageRequired
    ImageOptional =>
  Record r -> Data.Element message location
image option =
  let
    rec =
      optionRecordToMaybeRecord
        (Proxy.Proxy :: _ ImageRequired)
        (Proxy.Proxy :: _ ImageOptional)
        option
  in
    Data.ElementImage
      ( { style:
            Data.ViewStyle
              { normal:
                  [ percentageOrRemWidthToCssDeclaration rec.width
                  , Css.heightRem rec.height
                  , Css.objectFit
                      ( case rec.objectFit of
                          Just objectFit -> objectFit
                          Nothing -> Css.Cover
                      )
                  ]
              , hover: []
              }
        , image:
            Data.Image
              { path: rec.path
              , alternativeText: rec.alternativeText
              }
        }
      )

percentageOrRemWidthToCssDeclaration :: PercentageOrRem -> Css.Declaration
percentageOrRemWidthToCssDeclaration = case _ of
  Rem value -> Css.widthRem value
  Percentage value -> Css.widthPercent value

optionRecordToMaybeRecord ::
  forall (optionRecord :: Row Type) (maybeRecord :: Row Type) (required :: Row Type) (optional :: Row Type).
  Option.FromRecord optionRecord required optional =>
  Option.ToRecord required optional maybeRecord =>
  Proxy.Proxy required ->
  Proxy.Proxy optional ->
  Record optionRecord ->
  Record maybeRecord
optionRecordToMaybeRecord _ _ optionRecord =
  Option.recordToRecord
    ( Option.recordFromRecord optionRecord ::
        Option.Record required optional
    )
