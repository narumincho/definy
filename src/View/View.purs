module View.View
  ( View(..)
  , Box(..)
  , XOrY(..)
  , Element(..)
  , BoxHoverStyle(..)
  , TextMarkup(..)
  , Svg(..)
  , PercentageOrRem(..)
  , Animation(..)
  , ViewBox(..)
  , SvgElement(..)
  , BoxRecord
  , box
  , boxHoverStyleNone
  ) where

import Color as Color
import Css as Css
import Data.Maybe as Maybe
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
  , {- ページの言語 -} language :: Maybe.Maybe Language.Language
  , {- OGPに使われるカバー画像のパス (CORSの制限を受けない) -} coverImagePath :: StructuredUrl.PathAndSearchParams
  , {- ページのパス -} path :: StructuredUrl.PathAndSearchParams
  , {- オリジン -} origin :: NonEmptyString.NonEmptyString
  , {- 子要素 -} box :: Box message
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
    , height :: Maybe.Maybe Number
    , backgroundColor :: Maybe.Maybe Color.Color
    , gridTemplateColumns1FrCount :: Maybe.Maybe Int
    , url :: Maybe.Maybe StructuredUrl.StructuredUrl
    , hover :: BoxHoverStyle
    }

data XOrY
  = X
  | Y

newtype BoxHoverStyle
  = BoxHoverStyle
  { animation :: Maybe.Maybe Animation
  }

newtype Animation
  = Animation
  { keyframeList :: Array Css.Keyframe
  , {- アニメーションする時間. 単位は ms */ -} duration :: Number
  }

-- | テキスト, リンクなどの要素
data Element message
  = Text { markup :: TextMarkup, padding :: Number, text :: String }
  | SvgElement { svg :: Svg, width :: PercentageOrRem, height :: Number, isJustifySelfCenter :: Boolean }
  | Image
    { path :: StructuredUrl.PathAndSearchParams
    , width :: PercentageOrRem
    , height :: Number
    }
  | BoxElement (Box message)

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
    , fill :: String
    }
  | G
    { transform :: Array String
    , svgElementList :: Array SvgElement
    }

data PercentageOrRem
  = Rem Number
  | Percentage Number

box :: forall message. BoxRecord message -> Element message
box record =
  BoxElement
    (Box record)

boxHoverStyleNone :: BoxHoverStyle
boxHoverStyleNone = BoxHoverStyle { animation: Maybe.Nothing }
