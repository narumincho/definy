module View.Data
  ( Animation(..)
  , Box(..)
  , BoxHoverStyle(..)
  , BoxRecord
  , Element(..)
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
  , text
  ) where

import Color as Color
import Css as Css
import Data.Array.NonEmpty (NonEmptyArray)
import Data.Maybe (Maybe)
import Data.Maybe as Maybe
import Data.String.NonEmpty (NonEmptyString)
import Data.String.NonEmpty as NonEmptyString
import Language as Language
import StructuredUrl as StructuredUrl

newtype View :: Type -> Type
-- | 見た目を表現するデータ. HTML Option より HTML と離れた, 抽象度の高く 扱いやすいものにする.
-- | definy と ナルミンチョの創作記録で両方の指定が可能なもの
newtype View message
  = View
  { {- 
    ページ名
    Google 検索のページ名や, タブ, ブックマークのタイトル, OGPのタイトルなどに使用される
    -} pageName :: NonEmptyString.NonEmptyString
  , {- アプリ名 / サイト名 (HTML出力のみ反映) -} appName :: NonEmptyString.NonEmptyString
  , {- ページの説明 (HTML出力のみ反映) -} description :: String
  , {- テーマカラー -} themeColor :: Color.Color
  , {- アイコン画像のURL -} iconPath :: StructuredUrl.PathAndSearchParams
  , {- ページの言語 -} language :: Maybe Language.Language
  , {- OGPに使われるカバー画像のパス (CORSの制限を受けない) -} coverImagePath :: StructuredUrl.PathAndSearchParams
  , {- ページのパス -} path :: StructuredUrl.PathAndSearchParams
  , {- オリジン -} origin :: NonEmptyString.NonEmptyString
  , {- 子要素 -} children :: Array (Element message)
  }

newtype Box :: Type -> Type
-- | 縦か横方向に積める箱
newtype Box message
  = Box (BoxRecord message)

type BoxRecord message
  = { direction :: XOrY
    , children :: Array (Element message)
    , gap :: Number
    , paddingTopBottom :: Number
    , paddingLeftRight :: Number
    , height :: Maybe Number
    , backgroundColor :: Maybe Color.Color
    , gridTemplateColumns1FrCount :: Maybe Int
    , url :: Maybe StructuredUrl.StructuredUrl
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

-- | テキスト, リンクなどの要素
data Element message
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
  | BoxElement (Box message)

newtype Text :: Type -> Type
newtype Text message
  = Text (TextRecord message)

type TextRecord :: Type -> Type
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

box :: forall message. BoxRecord message -> Element message
box record =
  BoxElement
    (Box record)

text :: forall message. TextRecord message -> Element message
text record = ElementText (Text record)

boxHoverStyleNone :: BoxHoverStyle
boxHoverStyleNone = BoxHoverStyle { animation: Maybe.Nothing }
