module View.Data
  ( Animation(..)
  , Box(..)
  , BoxHoverStyle(..)
  , Element(..)
  , Image(..)
  , Link(..)
  , Svg(..)
  , SvgElement(..)
  , Text(..)
  , TextMarkup(..)
  , View(..)
  , ViewBox(..)
  , ViewStyle(..)
  , XOrY(..)
  , createStyle
  ) where

import Color as Color
import Css as Css
import Data.Array.NonEmpty (NonEmptyArray)
import Data.Maybe (Maybe(..))
import Data.String.NonEmpty (NonEmptyString)
import Data.String.NonEmpty as NonEmptyString
import Language as Language
import Option as Option
import StructuredUrl as StructuredUrl
import Type.Proxy as Proxy
import Util as Util

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
  , {- body のスタイル -} bodyStyle :: ViewStyle
  , {- 子要素 -} children :: Array (Element message location)
  }

newtype ViewStyle
  = ViewStyle
  { normal :: Array Css.Declaration
  , hover :: Array Css.Declaration
  }

type StyleOptional
  = ( hover :: Array Css.Declaration )

-- | スタイルを指定する
createStyle ::
  forall (r :: Row Type).
  Option.FromRecord
    r
    ()
    StyleOptional =>
  Record r ->
  (Array Css.Declaration) ->
  ViewStyle
createStyle option normal =
  let
    rec =
      Util.optionRecordToMaybeRecord
        (Proxy.Proxy :: _ ())
        (Proxy.Proxy :: _ StyleOptional)
        option
  in
    ViewStyle
      { normal
      , hover:
          case rec.hover of
            Just hover -> hover
            Nothing -> []
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
  , scrollX :: Boolean
  , scrollY :: Boolean
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
    { style :: ViewStyle
    , svg :: Svg
    }
  | ElementImage { style :: ViewStyle, image :: Image }
  | BoxElement (Box message location)

newtype Image
  = Image
  { path :: StructuredUrl.PathAndSearchParams
  , alternativeText :: String
  }

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
  | Circle
    { cx :: Number
    , cy :: Number
    , r :: Number
    , fill :: Color.Color
    }
  | Polygon
    { points :: NonEmptyArray { x :: Number, y :: Number }
    , stroke :: Color.Color
    , fill :: Color.Color
    }
  | Ellipse
    { cx :: Number
    , cy :: Number
    , rx :: Number
    , ry :: Number
    , fill :: Color.Color
    }
