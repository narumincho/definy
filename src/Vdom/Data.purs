module Vdom.Data
  ( Vdom(..)
  , Div(..)
  , createDivDeff
  , Pointer(..)
  , Children(..)
  , ClickMessageData(..)
  , PointerType(..)
  , Element(..)
  , ExternalLink(..)
  , LocalLink(..)
  , Button(..)
  , Img(..)
  , InputRadio(..)
  , InputText(..)
  , TextArea(..)
  , Label(..)
  , Svg(..)
  , SvgPath(..)
  , SvgCircle(..)
  , SvgAnimate(..)
  , ViewDiff(..)
  , ViewPatchOperation(..)
  , MessageData(..)
  , Events
  , ChildrenDiff(..)
  , ElementDiff
  , ElementUpdateDiff
  , replace
  , externalLinkDiff
  , localLinkDiff
  , imgDiff
  , buttonDiff
  , inputRadioDiff
  , inputTextDiff
  , textAreaDiff
  , labelDiff
  , svgDiff
  , svgPathDiff
  , svgCircleDiff
  , svgAnimateDiff
  , rootPath
  , pathAppendKey
  , Path
  , pathToString
  ) where

import Color as Color
import Css as Css
import Data.Array.NonEmpty as NonEmptyArray
import Data.Array as Array
import Data.Map as Map
import Data.Maybe as Maybe
import Data.String as String
import Data.String.NonEmpty as NonEmptyString
import Data.Tuple as Tuple
import Language as Language
import Prelude as Prelude
import StructuredUrl as StructuredUrl

newtype Vdom message
  = Vdom
  { {- ページ名
  Google 検索のページ名や, タブ, ブックマークのタイトル, OGPのタイトルなどに使用される  -} pageName :: String
  , {- アプリ名 / サイト名 -} appName :: String
  , {- ページの説明 -} description :: String
  , {- テーマカラー -} themeColor :: Color.Color
  , {- アイコン画像のURL -} iconPath :: StructuredUrl.PathAndSearchParams
  , {- 使用している言語 -} language :: Maybe.Maybe Language.Language
  , {- OGPに使われるカバー画像のパス -} coverImagePath :: StructuredUrl.PathAndSearchParams
  , {- パス. ログイン時のコールバック時には Noting にして良い -} path :: Maybe.Maybe StructuredUrl.PathAndSearchParams
  , {- オリジン -} origin :: NonEmptyString.NonEmptyString
  , {- 全体に適応されるスタイル. CSS -} style :: Css.StatementList
  , {- スクリプトのパス -} scriptPath :: StructuredUrl.PathAndSearchParams
  , {- body の class -} bodyClass :: String
  , pointerMove :: Maybe.Maybe (Pointer -> message)
  , pointerDown :: Maybe.Maybe (Pointer -> message)
  , {- body の 子要素 -} children :: Children message
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
  { messageMap :: Map.Map String (Events message)
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
  | ChangeThemeColor Color.Color
  | ChangeLanguage (Maybe.Maybe Language.Language)
  | ChangeBodyClass String

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

replace :: forall message. String -> Element message -> ElementDiff message
replace key newElement = Replace { newElement, key }

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
  = DivDiff (NonEmptyArray.NonEmptyArray (DivPatchOperation message))

data DivPatchOperation message
  = DivPatchOperationSetId String
  | DivPatchOperationSetClass String
  | DivPatchOperationUpdateChildren (ChildrenDiff message)

createDivDeff :: forall message. String -> Div message -> Div message -> ElementDiff message
createDivDeff key (Div old) (Div new) = case NonEmptyArray.fromArray
    ( Array.catMaybes
        [ Prelude.map DivPatchOperationSetId (createDiff old.id new.id)
        , Prelude.map DivPatchOperationSetClass (createDiff old.class new.class)
        ]
    ) of
  Maybe.Just list ->
    Update
      { elementUpdateDiff: ElementUpdateDiffDiv (DivDiff list)
      , key
      }
  Maybe.Nothing -> Skip

createDiff :: forall a. Prelude.Eq a => a -> a -> Maybe.Maybe a
createDiff old new =
  if Prelude.eq old new then
    Maybe.Nothing
  else
    Maybe.Just new

newtype ExternalLink message
  = ExternalLink
  { id :: String
  , class :: String
  , url :: String
  , children :: Children message
  }

newtype ExternalLinkDiff message
  = ExternalLinkDiff (ExternalLinkDiffRec message)

type ExternalLinkDiffRec message
  = { id :: Maybe.Maybe String
    , class :: Maybe.Maybe String
    , url :: Maybe.Maybe String
    , children :: ChildrenDiff message
    }

externalLinkDiff :: forall message. String -> ExternalLinkDiffRec message -> ElementDiff message
externalLinkDiff key = case _ of
  { id: Maybe.Nothing, class: Maybe.Nothing, url: Maybe.Nothing, children: ChildrenDiffSkip
  } -> Skip
  rec -> Update { elementUpdateDiff: ElementUpdateDiffExternalLinkDiff (ExternalLinkDiff rec), key }

newtype LocalLink message
  = LocalLink
  { id :: String
  , class :: String
  , url :: String
  , jumpMessage :: message
  , children :: Children message
  }

newtype LocalLinkDiff message
  = LocalLinkDiff (LocalLinkDiffRec message)

type LocalLinkDiffRec message
  = { id :: Maybe.Maybe String
    , class :: Maybe.Maybe String
    , url :: Maybe.Maybe String
    , children :: ChildrenDiff message
    }

localLinkDiff :: forall message. String -> LocalLinkDiffRec message -> ElementDiff message
localLinkDiff key = case _ of
  { id: Maybe.Nothing, class: Maybe.Nothing, url: Maybe.Nothing, children: ChildrenDiffSkip } -> Skip
  rec -> Update { elementUpdateDiff: ElementUpdateDiffLocalLinkDiff (LocalLinkDiff rec), key }

newtype Button message
  = Button
  { id :: String
  , class :: String
  , click :: message
  , children :: Children message
  }

newtype ButtonDiff message
  = ButtonDiff (ButtonDiffRec message)

type ButtonDiffRec message
  = { id :: Maybe.Maybe String
    , class :: Maybe.Maybe String
    , children :: ChildrenDiff message
    }

buttonDiff :: forall message. String -> ButtonDiffRec message -> ElementDiff message
buttonDiff key = case _ of
  { id: Maybe.Nothing, class: Maybe.Nothing, children: ChildrenDiffSkip } -> Skip
  rec -> Update { elementUpdateDiff: ElementUpdateDiffButtonDiff (ButtonDiff rec), key }

newtype Img
  = Img
  { id :: String
  , class :: String
  , alt :: String
  , src :: String
  }

newtype ImgDiff
  = ImgDiff (ImgDiffRec)

type ImgDiffRec
  = { id :: Maybe.Maybe String
    , class :: Maybe.Maybe String
    , alt :: Maybe.Maybe String
    , src :: Maybe.Maybe String
    }

imgDiff :: forall message. String -> ImgDiffRec -> ElementDiff message
imgDiff key = case _ of
  { id: Maybe.Nothing, class: Maybe.Nothing, alt: Maybe.Nothing, src: Maybe.Nothing } -> Skip
  rec -> Update { elementUpdateDiff: ElementUpdateDiffImgDiff (ImgDiff rec), key }

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
  = InputRadioDiff InputRadioDiffRec

type InputRadioDiffRec
  = { id :: Maybe.Maybe String
    , class :: Maybe.Maybe String
    , checked :: Maybe.Maybe Boolean
    , name :: Maybe.Maybe String
    }

inputRadioDiff :: forall message. String -> InputRadioDiffRec -> ElementDiff message
inputRadioDiff key = case _ of
  { id: Maybe.Nothing, class: Maybe.Nothing, checked: Maybe.Nothing, name: Maybe.Nothing
  } -> Skip
  rec -> Update { elementUpdateDiff: ElementUpdateDiffInputRadioDiff (InputRadioDiff rec), key }

newtype InputText message
  = InputText
  { id :: String
  , class :: String
  , inputOrReadonly :: Maybe.Maybe (String -> message)
  , value :: String
  }

newtype InputTextDiff
  = InputTextDiff InputTextDiffRec

type InputTextDiffRec
  = { id :: Maybe.Maybe String
    , class :: Maybe.Maybe String
    , readonly :: Maybe.Maybe Boolean
    , value :: Maybe.Maybe String
    }

inputTextDiff :: forall message. String -> InputTextDiffRec -> ElementDiff message
inputTextDiff key = case _ of
  { id: Maybe.Nothing, class: Maybe.Nothing, readonly: Maybe.Nothing, value: Maybe.Nothing } -> Skip
  rec -> Update { elementUpdateDiff: ElementUpdateDiffInputTextDiff (InputTextDiff rec), key }

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

type TextAreaDiffRec
  = { id :: Maybe.Maybe String
    , class :: Maybe.Maybe String
    , readonly :: Maybe.Maybe Boolean
    , value :: Maybe.Maybe String
    }

textAreaDiff :: forall message. String -> TextAreaDiffRec -> ElementDiff message
textAreaDiff key = case _ of
  { id: Maybe.Nothing
  , class: Maybe.Nothing
  , readonly: Maybe.Nothing
  , value: Maybe.Nothing
  } -> Skip
  rec -> Update { elementUpdateDiff: ElementUpdateDiffTextAreaDiff (TextAreaDiff rec), key }

newtype Label message
  = Label
  { id :: String
  , class :: String
  , for :: String
  , children :: Children message
  }

newtype LabelDiff message
  = LabelDiff (LabelDiffRec message)

type LabelDiffRec message
  = { id :: Maybe.Maybe String
    , class :: Maybe.Maybe String
    , for :: Maybe.Maybe String
    , children :: ChildrenDiff message
    }

labelDiff :: forall message. String -> LabelDiffRec message -> ElementDiff message
labelDiff key = case _ of
  { id: Maybe.Nothing, class: Maybe.Nothing, for: Maybe.Nothing, children: ChildrenDiffSkip } -> Skip
  rec -> Update { elementUpdateDiff: ElementUpdateDiffLabelDiff (LabelDiff rec), key }

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
  = SvgDiff (SvgDiffRec message)

type SvgDiffRec message
  = { id :: Maybe.Maybe String
    , class :: Maybe.Maybe String
    , viewBoxX :: Maybe.Maybe Number
    , viewBoxY :: Maybe.Maybe Number
    , viewBoxWidth :: Maybe.Maybe Number
    , viewBoxHeight :: Maybe.Maybe Number
    , children :: ChildrenDiff message
    }

svgDiff :: forall message. String -> SvgDiffRec message -> ElementDiff message
svgDiff key = case _ of
  { id: Maybe.Nothing
  , class: Maybe.Nothing
  , viewBoxX: Maybe.Nothing
  , viewBoxY: Maybe.Nothing
  , viewBoxWidth: Maybe.Nothing
  , viewBoxHeight: Maybe.Nothing
  , children: ChildrenDiffSkip
  } -> Skip
  rec -> Update { elementUpdateDiff: ElementUpdateDiffSvgDiff (SvgDiff rec), key }

newtype SvgPath
  = SvgPath
  { id :: String
  , class :: String
  , d :: String
  , fill :: String
  }

newtype SvgPathDiff
  = SvgPathDiff SvgPathDiffRec

type SvgPathDiffRec
  = { id :: Maybe.Maybe String
    , class :: Maybe.Maybe String
    , d :: Maybe.Maybe String
    , fill :: Maybe.Maybe String
    }

svgPathDiff :: forall message. String -> SvgPathDiffRec -> ElementDiff message
svgPathDiff key = case _ of
  { id: Maybe.Nothing, class: Maybe.Nothing, d: Maybe.Nothing, fill: Maybe.Nothing } -> Skip
  rec -> Update { elementUpdateDiff: ElementUpdateDiffSvgPathDiff (SvgPathDiff rec), key }

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
  = SvgCircleDiff SvgCircleDiffRec

type SvgCircleDiffRec
  = { id :: Maybe.Maybe String
    , class :: Maybe.Maybe String
    , fill :: Maybe.Maybe String
    , stroke :: Maybe.Maybe String
    , cx :: Maybe.Maybe Number
    , cy :: Maybe.Maybe Number
    , r :: Maybe.Maybe Number
    , children :: ChildrenDiff Prelude.Void
    }

svgCircleDiff :: forall message. String -> SvgCircleDiffRec -> ElementDiff message
svgCircleDiff key = case _ of
  { id: Maybe.Nothing
  , class: Maybe.Nothing
  , fill: Maybe.Nothing
  , stroke: Maybe.Nothing
  , cx: Maybe.Nothing
  , cy: Maybe.Nothing
  , r: Maybe.Nothing
  , children: ChildrenDiffSkip
  } -> Skip
  rec -> Update { elementUpdateDiff: ElementUpdateDiffSvgCircleDiff (SvgCircleDiff rec), key }

newtype SvgAnimate
  = SvgAnimate
  { attributeName :: String
  , dur :: Number
  , repeatCount :: String
  , from :: String
  , to :: String
  }

newtype SvgAnimateDiff
  = SvgAnimateDiff SvgAnimateDiffRec

type SvgAnimateDiffRec
  = { attributeName :: Maybe.Maybe String
    , dur :: Maybe.Maybe Number
    , repeatCount :: Maybe.Maybe String
    , from :: Maybe.Maybe String
    , to :: Maybe.Maybe String
    }

svgAnimateDiff :: forall message. String -> SvgAnimateDiffRec -> ElementDiff message
svgAnimateDiff key = case _ of
  { attributeName: Maybe.Nothing
  , dur: Maybe.Nothing
  , repeatCount: Maybe.Nothing
  , from: Maybe.Nothing
  , to: Maybe.Nothing
  } -> Skip
  rec -> Update { elementUpdateDiff: ElementUpdateDiffSvgAnimateDiff (SvgAnimateDiff rec), key }

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

pathToString :: Path -> String
pathToString (Path str) = str

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
  = ChildrenElementList (Array (Tuple.Tuple String (Element message)))
  | ChildrenText String

data ChildrenDiff message
  = ChildrenDiffSkip
  | ChildrenDiffSetText String
  | ChildrenDiffResetAndInsert (Array (Tuple.Tuple String (Element message)))
  | ChildDiffList (Array (ElementDiff message))
