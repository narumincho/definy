module View.Data
  ( Code(..)
  , Div(..)
  , Element(..)
  , ElementAndStyle(..)
  , ElementListOrText(..)
  , ExternalLinkAnchor(..)
  , Heading1(..)
  , Heading2(..)
  , Image(..)
  , KeyAndElement(..)
  , Link(..)
  , SameOriginAnchor(..)
  , Span(..)
  , Svg(..)
  , SvgElement(..)
  , SvgElementAndStyle(..)
  , View(..)
  , ViewStyle(..)
  , createStyle
  ) where

import Color as Color
import Css as Css
import Data.Array.NonEmpty (NonEmptyArray)
import Data.Map as Map
import Data.Maybe (Maybe(..))
import Data.String.NonEmpty (NonEmptyString)
import Hash as Hash
import Language as Language
import Option as Option
import StructuredUrl as StructuredUrl
import Type.Proxy (Proxy(..))
import Util as Util
import Vdom.PatchState as PatchState
import Html.Wellknown as HtmlWellknown

newtype View :: Type -> Type -> Type
-- | 見た目を表現するデータ. HTML Option より HTML と離れた, 抽象度の高く 扱いやすいものにする.
-- | definy と ナルミンチョの創作記録で両方の指定が可能なもの
newtype View message location
  = View
  { {- 
    ページ名
    Google 検索のページ名や, タブ, ブックマークのタイトル, OGPのタイトルなどに使用される
    -} pageName :: NonEmptyString
  , {- アプリ名 / サイト名 (HTML出力のみ反映) -} appName :: NonEmptyString
  , {- ページの説明 (HTML出力のみ反映) -} description :: String
  , {- テーマカラー -} themeColor :: Maybe Color.Color
  , {- アイコン画像のURL (HTML出力のみ反映) -} iconPath :: StructuredUrl.PathAndSearchParams
  , {- ページの言語 -} language :: Maybe Language.Language
  , {- OGPに使われるカバー画像のパス (HTML出力のみ反映, CORSの制限を受けない) -} coverImagePath :: StructuredUrl.PathAndSearchParams
  , {- ページのパス (HTML出力のみ反映) -} path :: StructuredUrl.PathAndSearchParams
  , {- オリジン -} origin :: NonEmptyString
  , {- body のスタイル -} bodyStyle :: ViewStyle
  , {- 子要素 -} children :: Array (ElementAndStyle message location)
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
        (Proxy :: _ ())
        (Proxy :: _ StyleOptional)
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

newtype ElementAndStyle message location
  = ElementAndStyle
  { element :: Element message location
  , style :: ViewStyle
  , id :: Maybe NonEmptyString
  }

data Element :: Type -> Type -> Type
-- | テキスト, リンクなどの要素
data Element message location
  = ElementSvg Svg
  | ElementImage Image
  | ElementDiv (Div message location)
  | ElementSameOriginAnchor (SameOriginAnchor message location)
  | ElementExternalLinkAnchor (ExternalLinkAnchor message location)
  | ElementHeading1 (Heading1 message location)
  | ElementHeading2 (Heading2 message location)
  | ElementCode (Code message location)
  | ElementSpan (Span message location)

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
  , element :: ElementAndStyle message location
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

newtype Span message location
  = Span
  { id :: Maybe NonEmptyString
  , click :: Maybe (PatchState.ClickMessageData message)
  , children :: ElementListOrText message location
  }

newtype Svg
  = Svg
  { viewBox :: HtmlWellknown.ViewBox
  , svgElementList :: Array SvgElementAndStyle
  }

newtype SvgElementAndStyle
  = SvgElementAndStyle
  { element :: SvgElement
  , style :: ViewStyle
  , id :: Maybe NonEmptyString
  }

data SvgElement
  = Path
    { pathText :: String
    , fill :: Color.Color
    }
  | G
    { transform :: NonEmptyArray NonEmptyString
    , svgElementList :: Array SvgElementAndStyle
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
  | SvgText HtmlWellknown.SvgTextAttribute
