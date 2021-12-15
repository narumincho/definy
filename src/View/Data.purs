module View.Data
  ( Animation(..)
  , Box(..)
  , BoxHoverStyle(..)
  , BoxRecord
  , Element(..)
  , Link(..)
  , PercentageOrRem(..)
  , Svg(..)
  , SvgElement(..)
  , Text(..)
  , TextMarkup(..)
  , TextRecord
  , View(..)
  , ViewBox(..)
  , XOrY(..)
  , box
  , boxHoverStyleNone
  , normalText
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
import StructuredUrl as StructuredUrl

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
  = Box (BoxRecord message location)

type BoxRecord message location
  = { direction :: XOrY
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
  = Text (TextRecord message)

type TextRecord message
  = { markup :: TextMarkup
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

box :: forall message location. BoxRecord message location -> Element message location
box record =
  BoxElement
    (Box record)

text :: forall message location. TextRecord message -> Element message location
text record = ElementText (Text record)

normalText :: forall message location. { padding :: Number, text :: String } -> Element message location
normalText rec =
  ElementText
    ( Text
        { markup: None
        , click: Nothing
        , padding: rec.padding
        , text: rec.text
        }
    )

boxHoverStyleNone :: BoxHoverStyle
boxHoverStyleNone = BoxHoverStyle { animation: Maybe.Nothing }
