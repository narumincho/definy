module View.Data
  ( Code(..)
  , Div(..)
  , Element(..)
  , ElementListOrText(..)
  , ExternalLinkAnchor(..)
  , Heading1(..)
  , Heading2(..)
  , Image(..)
  , KeyAndElement(..)
  , Link(..)
  , SameOriginAnchor(..)
  , Svg(..)
  , SvgElement(..)
  , View(..)
  , ViewBox(..)
  , ViewStyle(..)
  , createStyle
  ) where

import Color as Color
import Css as Css
import Data.Array.NonEmpty (NonEmptyArray)
import Data.Map as Map
import Data.Maybe (Maybe(..))
import Data.String.NonEmpty (NonEmptyString)
import Data.String.NonEmpty as NonEmptyString
import Hash as Hash
import Language as Language
import Option as Option
import StructuredUrl as StructuredUrl
import Type.Proxy as Proxy
import Util as Util
import Vdom.PatchState as PatchState

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
  , animation :: Map.Map Hash.Sha256HashValue (Array Css.Keyframe)
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
      , animation: Map.empty
      }

data Link :: Type -> Type -> Type
data Link message location
  = LinkSameOrigin location
  | LinkExternal StructuredUrl.StructuredUrl

data Element :: Type -> Type -> Type
-- | テキスト, リンクなどの要素
data Element message location
  = ElementSvg { style :: ViewStyle, svg :: Svg }
  | ElementImage { style :: ViewStyle, image :: Image }
  | ElementDiv { style :: ViewStyle, div :: Div message location }
  | ElementSameOriginAnchor { style :: ViewStyle, anchor :: SameOriginAnchor message location }
  | ElementExternalLinkAnchor { style :: ViewStyle, anchor :: ExternalLinkAnchor message location }
  | ElementHeading1 { style :: ViewStyle, heading1 :: Heading1 message location }
  | ElementHeading2 { style :: ViewStyle, heading2 :: Heading2 message location }
  | ElementCode { style :: ViewStyle, code :: Code message location }

newtype Image
  = Image
  { path :: StructuredUrl.PathAndSearchParams
  , alternativeText :: String
  }

newtype Div message location
  = Div
  { id :: Maybe NonEmptyString
  , click :: Maybe (PatchState.ClickMessageData message)
  , children :: ElementListOrText message location
  }

data ElementListOrText message location
  = ElementListOrTextElementList
    (NonEmptyArray (KeyAndElement message location))
  | ElementListOrTextText String

newtype KeyAndElement message location
  = KeyAndElement
  { key :: String
  , element :: Element message location
  }

data SameOriginAnchor message location
  = SameOriginAnchor
    { id :: Maybe NonEmptyString
    , href :: location
    , children :: ElementListOrText message location
    }

data ExternalLinkAnchor message location
  = ExternalLinkAnchor
    { id :: Maybe NonEmptyString
    , href :: StructuredUrl.StructuredUrl
    , children :: ElementListOrText message location
    }

newtype Heading1 message location
  = Heading1
  { id :: Maybe NonEmptyString
  , click :: Maybe (PatchState.ClickMessageData message)
  , children :: ElementListOrText message location
  }

newtype Heading2 message location
  = Heading2
  { id :: Maybe NonEmptyString
  , click :: Maybe (PatchState.ClickMessageData message)
  , children :: ElementListOrText message location
  }

newtype Code message location
  = Code
  { id :: Maybe NonEmptyString
  , click :: Maybe (PatchState.ClickMessageData message)
  , children :: ElementListOrText message location
  }

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
