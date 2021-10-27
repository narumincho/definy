module Vdom.View where

import Prelude as Prelude
import Color as Color
import Data.Map (Map)
import Data.Maybe as Maybe
import Data.String as String
import Data.String.NonEmpty (NonEmptyString) as NonEmptyString
import Html.Data as HtmlData
import Language as Language
import StructuredUrl as StructuredUrl

newtype View message
  = View
  { pageName :: String
  , appName :: String
  , description :: String
  , themeColor :: Maybe.Maybe Color.Color
  , iconPath :: String
  , language :: Maybe.Maybe Language.Language
  , coverImageUrl :: StructuredUrl.StructuredUrl
  , url :: StructuredUrl.StructuredUrl
  , manifestPath :: Array StructuredUrl.PathAndSearchParams
  , twitterCard :: HtmlData.TwitterCard
  , style :: Maybe.Maybe String
  , styleUrlList :: Array StructuredUrl.PathAndSearchParams
  , script :: String
  , scriptPath :: String
  , scriptUrlList :: Array StructuredUrl.PathAndSearchParams
  , bodyClass :: String
  , pointerMove :: Maybe.Maybe (Pointer -> message)
  , pointerDown :: Maybe.Maybe (Pointer -> message)
  , children :: Children message
  }

newtype Pointer
  = Pointer
  { {- イベントの原因となっているポインタの一意の識別子 
  -} pointerId :: Number
  , {- ポインタの接触ジオメトリの幅
  -} width :: Number
  , {- ポインタの接触ジオメトリの高さ
  -} height :: Number
  , {- 0 から 1 の範囲のポインタ入力の正規化された圧力。 ここで、0 と 1 は、それぞれハードウェアが検出できる最小圧力と最大圧力を表します
  -} pressure :: Number
  , {- ポインタ入力の正規化された接線圧力（バレル圧力またはシリンダー応力（cylinder stress）とも呼ばれます）は -1 から 1 の範囲で、0 はコントロールの中立位置です。
  -} tangentialPressure :: Number
  , {- Y-Z 平面と、ポインタ（ペン/スタイラスなど）軸と Y 軸の両方を含む平面との間の平面角度（度単位、-90 から 90 の範囲）。 
  -} tiltX :: Number
  , {- X-Z 平面と、ポインタ（ペン/スタイラスなど）軸と X 軸の両方を含む平面との間の平面角度（度単位、-90 から 90 の範囲）。
  -} tiltY :: Number
  , {- ポインタ（ペン/スタイラスなど）の長軸を中心とした時計回りの回転の度数（0 から 359の範囲の値）
  -} twist :: Number
  , {- イベントの原因となったデバイスタイプ（マウス、ペン、タッチなど）を示します。 -} pointerType :: PointerType
  , {- ポインタがこのポインタタイプのプライマリポインタを表すかどうかを示します。 -} isPrimary :: Boolean
  , {- 表示領域のX座標 
  -} x :: Number
  , {- 表示領域のY座標 
  -} y :: Number
  }

-- | ポインターの種類
data PointerType
  = Mouse
  | Pen
  | Touch
  | None

-- | メッセージを集計した結果
newtype MessageData message
  = MessageData
  { messageMap :: Map String (Events message)
  , pointerMove :: Maybe.Maybe (Pointer -> message)
  , pointerDown :: Maybe.Maybe (Pointer -> message)
  }

-- | View の 差分データ.
-- | 
-- | イベント関係は差分を使って処理をしないので Message は含まれないが, 要素を追加するときに Message を使う形になってしまっている
newtype ViewDiff message
  = ViewDiff
  { patchOperationList :: Array ViewPatchOperation
  , childrenDiff :: ChildrenDiff message
  , newMessageData :: MessageData message
  }

data ViewPatchOperation
  = ChangePageName String
  | ChangeThemeColor (Maybe.Maybe Color.Color)
  | ChangeLanguage (Maybe.Maybe Language.Language)
  | ChangeBodyClass NonEmptyString.NonEmptyString

data Element message
  = ElementDiv (Div message)
  | ElementExternalLink (ExternalLink message)
  | ElementLocalLink (LocalLink message)
  | ElementButton (Button message)
  | ElementImg Img
  | ElementInputRadio (InputRadio message)
  | ElementInputText (InputText message)
  | ElementTextArea (TextArea message)
  | ElementLabel (Label message)
  | ElementSvg (Svg message)
  | ElementSvgPath SvgPath
  | ElementSvgCircle SvgCircle
  | ElementSvgAnimate SvgAnimate

data ElementDiff message
  = Replace { newElement :: Element message, key :: String }
  | Update
    { elementUpdateDiff :: ElementUpdateDiff message
    , key :: String
    }
  | Delete
  | Insert
    { element :: Element message
    , key :: String
    }
  | Skip

data ElementUpdateDiff message
  = ElementUpdateDiffDiv (DivDiff message)
  | ElementUpdateDiffExternalLinkDiff (ExternalLinkDiff message)
  | ElementUpdateDiffLocalLinkDiff (LocalLinkDiff message)
  | ElementUpdateDiffButtonDiff (ButtonDiff message)
  | ElementUpdateDiffImgDiff ImgDiff
  | ElementUpdateDiffInputRadioDiff InputRadioDiff
  | ElementUpdateDiffInputTextDiff InputTextDiff
  | ElementUpdateDiffTextAreaDiff TextAreaDiff
  | ElementUpdateDiffLabelDiff (LabelDiff message)
  | ElementUpdateDiffSvgDiff (SvgDiff message)
  | ElementUpdateDiffSvgPathDiff SvgPathDiff
  | ElementUpdateDiffSvgCircleDiff SvgCircleDiff
  | ElementUpdateDiffSvgAnimateDiff SvgAnimateDiff

newtype Div message
  = Div
  { id :: String
  , class :: String
  , click :: Maybe.Maybe (ClickMessageData message)
  , children :: Children message
  }

newtype DivDiff message
  = DivDiff
  { id :: Maybe.Maybe String
  , class :: Maybe.Maybe String
  , children :: ChildrenDiff message
  }

newtype ExternalLink message
  = ExternalLink
  { id :: String
  , class :: String
  , url :: String
  , children :: Children message
  }

newtype ExternalLinkDiff message
  = ExternalLinkDiff
  { id :: Maybe.Maybe String
  , class :: Maybe.Maybe String
  , url :: Maybe.Maybe String
  , children :: ChildrenDiff message
  }

newtype LocalLink message
  = LocalLink
  { id :: String
  , class :: String
  , url :: String
  , jumpMessage :: message
  , children :: Children message
  }

newtype LocalLinkDiff message
  = LocalLinkDiff
  { id :: Maybe.Maybe String
  , class :: Maybe.Maybe String
  , url :: Maybe.Maybe String
  , children :: ChildrenDiff message
  }

newtype Button message
  = Button
  { id :: String
  , class :: String
  , click :: message
  , children :: Children message
  }

newtype ButtonDiff message
  = ButtonDiff
  { id :: Maybe.Maybe String
  , class :: Maybe.Maybe String
  , children :: ChildrenDiff message
  }

newtype Img
  = Img
  { id :: String
  , class :: String
  , alt :: String
  , src :: String
  }

newtype ImgDiff
  = ImgDiff
  { id :: Maybe.Maybe String
  , class :: Maybe.Maybe String
  , alt :: Maybe.Maybe String
  , src :: Maybe.Maybe String
  }

newtype InputRadio message
  = InputRadio
  { id :: String
  , class :: String
  , select :: message
  , checked :: Boolean
  , {- 選択肢の選択を1にする動作のため. どの選択肢に属しているかを指定する 
  -} name :: String
  }

newtype InputRadioDiff
  = InputRadioDiff
  { id :: Maybe.Maybe String
  , class :: Maybe.Maybe String
  , checked :: Maybe.Maybe Boolean
  , name :: Maybe.Maybe String
  }

newtype InputText message
  = InputText
  { id :: String
  , class :: String
  , inputOrReadonly :: Maybe.Maybe (String -> message)
  , value :: String
  }

newtype InputTextDiff
  = InputTextDiff
  { id :: Maybe.Maybe String
  , class :: Maybe.Maybe String
  , readonly :: Maybe.Maybe Boolean
  , value :: Maybe.Maybe String
  }

newtype TextArea message
  = TextArea
  { id :: String
  , class :: String
  , inputOrReadonly :: Maybe.Maybe (String -> message)
  , value :: String
  }

newtype TextAreaDiff
  = TextAreaDiff
  { id :: Maybe.Maybe String
  , class :: Maybe.Maybe String
  , readonly :: Maybe.Maybe Boolean
  , value :: Maybe.Maybe String
  }

newtype Label message
  = Label
  { id :: String
  , class :: String
  , for :: String
  , children :: Children message
  }

newtype LabelDiff message
  = LabelDiff
  { id :: Maybe.Maybe String
  , class :: Maybe.Maybe String
  , for :: Maybe.Maybe String
  , children :: ChildrenDiff message
  }

newtype Svg message
  = Svg
  { id :: String
  , class :: String
  , viewBoxX :: Number
  , viewBoxY :: Number
  , viewBoxWidth :: Number
  , viewBoxHeight :: Number
  , children :: Children message
  }

newtype SvgDiff message
  = SvgDiff
  { id :: Maybe.Maybe String
  , class :: Maybe.Maybe String
  , viewBoxX :: Maybe.Maybe Number
  , viewBoxY :: Maybe.Maybe Number
  , viewBoxWidth :: Maybe.Maybe Number
  , viewBoxHeight :: Maybe.Maybe Number
  , children :: ChildrenDiff message
  }

newtype SvgPath
  = SvgPath
  { id :: String
  , class :: String
  , d :: String
  , fill :: String
  }

newtype SvgPathDiff
  = SvgPathDiff
  { id :: Maybe.Maybe String
  , class :: Maybe.Maybe String
  , d :: Maybe.Maybe String
  , fill :: Maybe.Maybe String
  }

newtype SvgCircle
  = SvgCircle
  { id :: String
  , class :: String
  , fill :: String
  , stroke :: String
  , cx :: Number
  , cy :: Number
  , r :: Number
  , children :: Children Prelude.Void
  }

newtype SvgCircleDiff
  = SvgCircleDiff
  { id :: Maybe.Maybe String
  , class :: Maybe.Maybe String
  , fill :: Maybe.Maybe String
  , stroke :: Maybe.Maybe String
  , cx :: Maybe.Maybe Number
  , cy :: Maybe.Maybe Number
  , r :: Maybe.Maybe Number
  , children :: ChildrenDiff Prelude.Void
  }

newtype SvgAnimate
  = SvgAnimate
  { attributeName :: String
  , dur :: Number
  , repeatCount :: String
  , from :: String
  , to :: String
  }

newtype SvgAnimateDiff
  = SvgAnimateDiff
  { attributeName :: Maybe.Maybe String
  , dur :: Maybe.Maybe Number
  , repeatCount :: Maybe.Maybe String
  , from :: Maybe.Maybe String
  , to :: Maybe.Maybe String
  }

-- | 各要素のイベントのハンドルをどうするかのデータ
newtype Events message
  = Events
  { onClick :: Maybe.Maybe (ClickMessageData message)
  , onChange :: Maybe.Maybe (ChangeMessageData message)
  , onInput :: Maybe.Maybe (InputMessageData message)
  }

newtype Path
  = Path String

rootPath :: Path
rootPath = Path ""

pathAppendKey :: Path -> String -> Path
pathAppendKey (Path path) key = Path (String.joinWith "/" [ path, key ])

newtype ClickMessageData message
  = ClickMessageData
  { ignoreNewTab :: Boolean
  , stopPropagation :: Boolean
  , message :: message
  }

newtype ChangeMessageData message
  = ChangeMessageData message

newtype InputMessageData message
  = InputMessageData (String -> message)

data Children message
  = ChildrenElementListTag (Map String (Element message))
  | ChildrenTextTag String

data ChildrenDiff message
  = ChildrenDiffSkip
  | ChildrenDiffSkipSetText String
  | ChildrenDiffResetAndInsert (Map String (Element message))
  | ChildDiffList (Array (ElementDiff message))
