module View.Data
  ( Animation(..)
  , Box(..)
  , BoxHoverStyle(..)
  , Element(..)
  , Link(..)
  , PercentageOrRem(..)
  , Svg(..)
  , SvgElement(..)
  , Text(..)
  , TextMarkup(..)
  , View(..)
  , ViewBox(..)
  , XOrY(..)
  , boxX
  , boxY
  , text
  ) where

import Color as Color
import Css as Css
import Data.Array.NonEmpty (NonEmptyArray)
import Data.Maybe (Maybe(..))
import Data.Maybe as Maybe
import Data.String.NonEmpty (NonEmptyString)
import Data.String.NonEmpty as NonEmptyString
import Language as Language
import Option as Option
import StructuredUrl as StructuredUrl
import Type.Proxy as Proxy

newtype View :: Type -> Type -> Type
-- | 見た目を表現するデータ. HTML Option より HTML と離れた, 抽象度の高く 扱いやすいものにする.
-- | definy と ナルミンチョの創作記録で両方の指定が可能なもの
newtype View message location
  = View
  { {- 
    ページ名
    Google 検索のページ名や, タブ, ブックマークのタイトル, OGPのタイトルなどに使用される
    -} pageName :: NonEmptyString.NonEmptyString
  , {- アプリ名 / サイト名 (HTML出力のみ反映) -} appName :: NonEmptyString.NonEmptyString
  , {- ページの説明 (HTML出力のみ反映) -} description :: String
  , {- テーマカラー -} themeColor :: Color.Color
  , {- アイコン画像のURL (HTML出力のみ反映) -} iconPath :: StructuredUrl.PathAndSearchParams
  , {- ページの言語 -} language :: Maybe Language.Language
  , {- OGPに使われるカバー画像のパス (HTML出力のみ反映, CORSの制限を受けない) -} coverImagePath :: StructuredUrl.PathAndSearchParams
  , {- ページのパス (HTML出力のみ反映) -} path :: StructuredUrl.PathAndSearchParams
  , {- オリジン -} origin :: NonEmptyString.NonEmptyString
  , {- 子要素 -} children :: Array (Element message location)
  }

newtype Box :: Type -> Type -> Type
-- | 縦か横方向に積める箱
newtype Box message location
  = Box
  { direction :: XOrY
  , children :: Array (Element message location)
  , gap :: Number
  , paddingTopBottom :: Number
  , paddingLeftRight :: Number
  , height :: Maybe Number
  , backgroundColor :: Maybe Color.Color
  , gridTemplateColumns1FrCount :: Maybe Int
  , link :: Maybe (Link message location)
  , hover :: BoxHoverStyle
  }

data XOrY
  = X
  | Y

newtype BoxHoverStyle
  = BoxHoverStyle
  { animation :: Maybe Animation
  }

newtype Animation
  = Animation
  { keyframeList :: Array Css.Keyframe
  , {- アニメーションする時間. 単位は ms */ -} duration :: Number
  }

data Link :: Type -> Type -> Type
data Link message location
  = LinkSameOrigin location
  | LinkExternal StructuredUrl.StructuredUrl

data Element :: Type -> Type -> Type
-- | テキスト, リンクなどの要素
data Element message location
  = ElementText (Text message)
  | SvgElement
    { svg :: Svg
    , width :: PercentageOrRem
    , height :: Number
    , isJustifySelfCenter :: Boolean
    }
  | Image
    { path :: StructuredUrl.PathAndSearchParams
    , width :: PercentageOrRem
    , height :: Number
    , alternativeText :: String
    }
  | BoxElement (Box message location)

newtype Text message
  = Text
  { markup :: TextMarkup
  , padding :: Number
  , click :: Maybe message
  , text :: String
  }

data TextMarkup
  = None
  | Heading1
  | Heading2
  | Code

newtype Svg
  = Svg
  { viewBox :: ViewBox
  , svgElementList :: Array SvgElement
  }

newtype ViewBox
  = ViewBox
  { x :: Number
  , y :: Number
  , width :: Number
  , height :: Number
  }

data SvgElement
  = Path
    { pathText :: String
    , fill :: Color.Color
    }
  | G
    { transform :: NonEmptyArray NonEmptyString
    , svgElementList :: Array SvgElement
    }

data PercentageOrRem
  = Rem Number
  | Percentage Number

type BoxOptional message location
  = ( gap :: Number
    , paddingTopBottom :: Number
    , paddingLeftRight :: Number
    , height :: Number
    , backgroundColor :: Color.Color
    , gridTemplateColumns1FrCount :: Int
    , link :: Link message location
    , hover :: BoxHoverStyle
    )

-- | 縦方向に box を配置する
boxY ::
  forall message location (r :: Row Type).
  Option.FromRecord
    r
    ()
    (BoxOptional message location) =>
  Record r ->
  (Array (Element message location)) ->
  Element message location
boxY option children =
  let
    rec =
      optionRecordToMaybeRecord
        (Proxy.Proxy :: _ ())
        (Proxy.Proxy :: _ (BoxOptional message location))
        option
  in
    BoxElement
      ( Box
          { backgroundColor: rec.backgroundColor
          , children: children
          , direction: Y
          , gap:
              case rec.gap of
                Just gap -> gap
                Nothing -> 0.0
          , gridTemplateColumns1FrCount: rec.gridTemplateColumns1FrCount
          , height: rec.height
          , hover:
              case rec.hover of
                Just hover -> hover
                Nothing -> boxHoverStyleNone
          , link: rec.link
          , paddingLeftRight:
              case rec.paddingLeftRight of
                Just paddingLeftRight -> paddingLeftRight
                Nothing -> 0.0
          , paddingTopBottom:
              case rec.paddingTopBottom of
                Just paddingTopBottom -> paddingTopBottom
                Nothing -> 0.0
          }
      )

-- | 横方向に box を配置する
boxX ::
  forall message location (r :: Row Type).
  Option.FromRecord
    r
    ()
    (BoxOptional message location) =>
  Record r ->
  (Array (Element message location)) ->
  Element message location
boxX option children =
  let
    rec =
      optionRecordToMaybeRecord
        (Proxy.Proxy :: _ ())
        (Proxy.Proxy :: _ (BoxOptional message location))
        option
  in
    BoxElement
      ( Box
          { backgroundColor: rec.backgroundColor
          , children: children
          , direction: X
          , gap:
              case rec.gap of
                Just gap -> gap
                Nothing -> 0.0
          , gridTemplateColumns1FrCount: rec.gridTemplateColumns1FrCount
          , height: rec.height
          , hover:
              case rec.hover of
                Just hover -> hover
                Nothing -> boxHoverStyleNone
          , link: rec.link
          , paddingLeftRight:
              case rec.paddingLeftRight of
                Just paddingLeftRight -> paddingLeftRight
                Nothing -> 0.0
          , paddingTopBottom:
              case rec.paddingTopBottom of
                Just paddingTopBottom -> paddingTopBottom
                Nothing -> 0.0
          }
      )

type TextOptional message
  = ( markup :: TextMarkup
    , padding :: Number
    , click :: message
    )

text ::
  forall message location (r :: Row Type).
  Option.FromRecord
    r
    ()
    (TextOptional message) =>
  Record r -> String -> Element message location
text option textValue =
  let
    rec =
      optionRecordToMaybeRecord
        (Proxy.Proxy :: _ ())
        (Proxy.Proxy :: _ (TextOptional message))
        option
  in
    ElementText
      ( Text
          { markup:
              case rec.markup of
                Just markup -> markup
                Nothing -> None
          , padding:
              case rec.padding of
                Just padding -> padding
                Nothing -> 0.0
          , click: rec.click
          , text: textValue
          }
      )

boxHoverStyleNone :: BoxHoverStyle
boxHoverStyleNone = BoxHoverStyle { animation: Maybe.Nothing }

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
