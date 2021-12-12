module Vdom.Data
  ( Vdom(..)
  , Div(..)
  , createDivDeff
  , H1(..)
  , H2(..)
  , Pointer(..)
  , Children(..)
  , PointerType(..)
  , Element(..)
  , ExternalLink(..)
  , SameOriginLink(..)
  , Button(..)
  , Img(..)
  , InputRadio(..)
  , InputText(..)
  , TextArea(..)
  , Label(..)
  , Svg(..)
  , SvgRec
  , svg
  , SvgPath(..)
  , SvgCircle(..)
  , SvgAnimate(..)
  , SvgG(..)
  , ViewDiff(..)
  , ViewPatchOperation(..)
  , MessageData(..)
  , ChildrenDiff(..)
  , ElementDiff
  , skip
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
  ) where

import Color as Color
import Css as Css
import Data.Array as Array
import Data.Array.NonEmpty (NonEmptyArray)
import Data.Array.NonEmpty as NonEmptyArray
import Data.Map as Map
import Data.Maybe (Maybe)
import Data.Maybe as Maybe
import Data.String.NonEmpty (NonEmptyString)
import Data.String.NonEmpty as NonEmptyString
import Data.Tuple as Tuple
import Language as Language
import Prelude as Prelude
import StructuredUrl as StructuredUrl
import Vdom.PatchState as PatchState

newtype Vdom message
  = Vdom
  { {- ページ名
  Google 検索のページ名や, タブ, ブックマークのタイトル, OGPのタイトルなどに使用される  -} pageName :: NonEmptyString.NonEmptyString
  , {- アプリ名 / サイト名 -} appName :: NonEmptyString
  , {- ページの説明 -} description :: String
  , {- テーマカラー -} themeColor :: Color.Color
  , {- アイコン画像のURL -} iconPath :: StructuredUrl.PathAndSearchParams
  , {- 使用している言語 -} language :: Maybe.Maybe Language.Language
  , {- OGPに使われるカバー画像のパス -} coverImagePath :: StructuredUrl.PathAndSearchParams
  , {- パス. ログイン時のコールバック時には Noting にして良い -} path :: Maybe.Maybe StructuredUrl.PathAndSearchParams
  , {- オリジン -} origin :: NonEmptyString.NonEmptyString
  , {- 全体に適応されるスタイル. CSS -} style :: Css.StatementList
  , {- スクリプトのパス -} scriptPath :: Maybe.Maybe StructuredUrl.PathAndSearchParams
  , {- body の class -} bodyClass :: Maybe.Maybe NonEmptyString.NonEmptyString
  , pointerMove :: Maybe.Maybe (Pointer -> message)
  , pointerDown :: Maybe.Maybe (Pointer -> message)
  , {- body の 子要素 -} children :: Array (Tuple.Tuple String (Element message))
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
  { messageMap :: Map.Map String (PatchState.Events message)
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
  = ChangePageName NonEmptyString.NonEmptyString
  | ChangeThemeColor Color.Color
  | ChangeLanguage (Maybe.Maybe Language.Language)
  | ChangeBodyClass (Maybe.Maybe NonEmptyString)

data Element message
  = ElementDiv (Div message)
  | ElementH1 (H1 message)
  | ElementH2 (H2 message)
  | ElementExternalLink (ExternalLink message)
  | ElementSameOriginLink (SameOriginLink message)
  | ElementButton (Button message)
  | ElementImg Img
  | ElementInputRadio (InputRadio message)
  | ElementInputText (InputText message)
  | ElementTextArea (TextArea message)
  | ElementLabel (Label message)
  | ElementSvg (Svg message)
  | ElementSvgPath SvgPath
  | ElementSvgCircle (SvgCircle message)
  | ElementSvgAnimate SvgAnimate
  | ElementSvgG (SvgG message)

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

skip :: forall message. ElementDiff message
skip = Skip

replace :: forall message. String -> Element message -> ElementDiff message
replace key newElement = Replace { newElement, key }

data ElementUpdateDiff message
  = ElementUpdateDiffDiv (DivDiff message)
  | ElementUpdateDiffExternalLinkDiff (ExternalLinkDiff message)
  | ElementUpdateDiffSameOriginLinkDiff (SameOriginLinkDiff message)
  | ElementUpdateDiffButtonDiff (ButtonDiff message)
  | ElementUpdateDiffImgDiff ImgDiff
  | ElementUpdateDiffInputRadioDiff InputRadioDiff
  | ElementUpdateDiffInputTextDiff InputTextDiff
  | ElementUpdateDiffTextAreaDiff TextAreaDiff
  | ElementUpdateDiffLabelDiff (LabelDiff message)
  | ElementUpdateDiffSvgDiff (SvgDiff message)
  | ElementUpdateDiffSvgPathDiff SvgPathDiff
  | ElementUpdateDiffSvgCircleDiff (SvgCircleDiff message)
  | ElementUpdateDiffSvgAnimateDiff SvgAnimateDiff

newtype Div message
  = Div
  { id :: Maybe.Maybe NonEmptyString.NonEmptyString
  , class :: Maybe.Maybe NonEmptyString.NonEmptyString
  , click :: Maybe.Maybe (PatchState.ClickMessageData message)
  , children :: Children message
  }

newtype DivDiff message
  = DivDiff (NonEmptyArray.NonEmptyArray (DivPatchOperation message))

data DivPatchOperation message
  = DivPatchOperationSetId (Maybe.Maybe NonEmptyString.NonEmptyString)
  | DivPatchOperationSetClass (Maybe.Maybe NonEmptyString.NonEmptyString)
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

newtype H1 message
  = H1
  { id :: Maybe.Maybe NonEmptyString.NonEmptyString
  , class :: Maybe.Maybe NonEmptyString.NonEmptyString
  , click :: Maybe.Maybe (PatchState.ClickMessageData message)
  , children :: Children message
  }

newtype H2 message
  = H2
  { id :: Maybe.Maybe NonEmptyString.NonEmptyString
  , class :: Maybe.Maybe NonEmptyString.NonEmptyString
  , click :: Maybe.Maybe (PatchState.ClickMessageData message)
  , children :: Children message
  }

-- | 外部のリンクを持つ `<a>`
newtype ExternalLink message
  = ExternalLink
  { id :: Maybe.Maybe NonEmptyString.NonEmptyString
  , class :: Maybe.Maybe NonEmptyString.NonEmptyString
  , href :: StructuredUrl.StructuredUrl
  , children :: Children message
  }

newtype ExternalLinkDiff message
  = ExternalLinkDiff (NonEmptyArray.NonEmptyArray (ExternalLinkPatchOperation message))

data ExternalLinkPatchOperation message
  = ExternalLinkPatchOperationSetId (Maybe.Maybe NonEmptyString.NonEmptyString)
  | ExternalLinkPatchOperationSetClass (Maybe.Maybe NonEmptyString.NonEmptyString)
  | ExternalLinkPatchOperationSetHref StructuredUrl.StructuredUrl
  | ExternalLinkPatchOperationUpdateChildren (ChildrenDiff message)

externalLinkDiff :: forall message. String -> ExternalLink message -> ExternalLink message -> ElementDiff message
externalLinkDiff key (ExternalLink old) (ExternalLink new) =
  ( case NonEmptyArray.fromArray
        ( Array.catMaybes
            [ Prelude.map ExternalLinkPatchOperationSetId (createDiff old.id new.id)
            , Prelude.map ExternalLinkPatchOperationSetClass (createDiff old.class new.class)
            , Prelude.map ExternalLinkPatchOperationSetHref (createDiff old.href new.href)
            ]
        ) of
      Maybe.Just list ->
        Update
          { elementUpdateDiff: ElementUpdateDiffExternalLinkDiff (ExternalLinkDiff list)
          , key
          }
      Maybe.Nothing -> Skip
  )

newtype SameOriginLink message
  = SameOriginLink
  { id :: Maybe NonEmptyString
  , class :: Maybe NonEmptyString
  , href :: StructuredUrl.PathAndSearchParams
  , jumpMessage :: message
  , children :: Children message
  }

newtype SameOriginLinkDiff message
  = SameOriginLinkDiff (NonEmptyArray (SameOriginLinkPatchOperation message))

data SameOriginLinkPatchOperation message
  = SameOriginLinkPatchOperationSetId (Maybe NonEmptyString)
  | SameOriginLinkPatchOperationSetClass (Maybe NonEmptyString)
  | SameOriginLinkPatchOperationSetHref StructuredUrl.PathAndSearchParams
  | SameOriginLinkPatchOperationUpdateChildren (ChildrenDiff message)

localLinkDiff :: forall message. String -> SameOriginLink message -> SameOriginLink message -> ElementDiff message
localLinkDiff key (SameOriginLink old) (SameOriginLink new) =
  ( case NonEmptyArray.fromArray
        ( Array.catMaybes
            [ Prelude.map SameOriginLinkPatchOperationSetId (createDiff old.id new.id)
            , Prelude.map SameOriginLinkPatchOperationSetClass (createDiff old.class new.class)
            , Prelude.map SameOriginLinkPatchOperationSetHref (createDiff old.href new.href)
            ]
        ) of
      Maybe.Just list ->
        Update
          { elementUpdateDiff: ElementUpdateDiffSameOriginLinkDiff (SameOriginLinkDiff list)
          , key
          }
      Maybe.Nothing -> Skip
  )

newtype Button :: Type -> Type
newtype Button message
  = Button
  { id :: Maybe NonEmptyString
  , class :: Maybe NonEmptyString
  , click :: message
  , children :: Children message
  }

newtype ButtonDiff message
  = ButtonDiff (NonEmptyArray (ButtonPatchOperation message))

data ButtonPatchOperation message
  = ButtonPatchOperationSetId (Maybe NonEmptyString)
  | ButtonPatchOperationSetClass (Maybe NonEmptyString)
  | ButtonPatchOperationUpdateChildren (ChildrenDiff message)

buttonDiff :: forall message. String -> Button message -> Button message -> ElementDiff message
buttonDiff key (Button old) (Button new) = case NonEmptyArray.fromArray
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

newtype Img
  = Img
  { id :: Maybe NonEmptyString
  , class :: Maybe NonEmptyString
  , alt :: String
  , src :: StructuredUrl.PathAndSearchParams
  }

newtype ImgDiff
  = ImgDiff (ImgDiffRec)

type ImgDiffRec
  = { id :: Maybe (Maybe NonEmptyString)
    , class :: Maybe (Maybe NonEmptyString)
    , alt :: Maybe.Maybe String
    , src :: Maybe.Maybe StructuredUrl.PathAndSearchParams
    }

imgDiff :: forall message. String -> ImgDiffRec -> ElementDiff message
imgDiff key = case _ of
  { id: Maybe.Nothing, class: Maybe.Nothing, alt: Maybe.Nothing, src: Maybe.Nothing } -> Skip
  rec -> Update { elementUpdateDiff: ElementUpdateDiffImgDiff (ImgDiff rec), key }

newtype InputRadio message
  = InputRadio
  { id :: Maybe NonEmptyString
  , class :: Maybe NonEmptyString
  , select :: message
  , checked :: Boolean
  , {- 選択肢の選択を1にする動作のため. どの選択肢に属しているかのID文字列を指定する 
  -} name :: NonEmptyString
  }

newtype InputRadioDiff
  = InputRadioDiff InputRadioDiffRec

type InputRadioDiffRec
  = { id :: Maybe (Maybe NonEmptyString)
    , class :: Maybe (Maybe NonEmptyString)
    , checked :: Maybe.Maybe Boolean
    , name :: Maybe.Maybe NonEmptyString
    }

inputRadioDiff :: forall message. String -> InputRadioDiffRec -> ElementDiff message
inputRadioDiff key = case _ of
  { id: Maybe.Nothing, class: Maybe.Nothing, checked: Maybe.Nothing, name: Maybe.Nothing
  } -> Skip
  rec -> Update { elementUpdateDiff: ElementUpdateDiffInputRadioDiff (InputRadioDiff rec), key }

newtype InputText message
  = InputText
  { id :: Maybe NonEmptyString
  , class :: Maybe NonEmptyString
  , inputOrReadonly :: Maybe.Maybe (String -> message)
  , value :: String
  }

newtype InputTextDiff
  = InputTextDiff InputTextDiffRec

type InputTextDiffRec
  = { id :: Maybe (Maybe NonEmptyString)
    , class :: Maybe (Maybe NonEmptyString)
    , readonly :: Maybe.Maybe Boolean
    , value :: Maybe.Maybe String
    }

inputTextDiff :: forall message. String -> InputTextDiffRec -> ElementDiff message
inputTextDiff key = case _ of
  { id: Maybe.Nothing, class: Maybe.Nothing, readonly: Maybe.Nothing, value: Maybe.Nothing } -> Skip
  rec -> Update { elementUpdateDiff: ElementUpdateDiffInputTextDiff (InputTextDiff rec), key }

newtype TextArea message
  = TextArea
  { id :: Maybe NonEmptyString
  , class :: Maybe NonEmptyString
  , inputOrReadonly :: Maybe.Maybe (String -> message)
  , value :: String
  }

newtype TextAreaDiff
  = TextAreaDiff TextAreaDiffRec

type TextAreaDiffRec
  = { id :: Maybe (Maybe NonEmptyString)
    , class :: Maybe (Maybe NonEmptyString)
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
  { id :: Maybe NonEmptyString
  , class :: Maybe NonEmptyString
  , for :: NonEmptyString
  , children :: Children message
  }

newtype LabelDiff message
  = LabelDiff (LabelDiffRec message)

type LabelDiffRec message
  = { id :: Maybe (Maybe NonEmptyString)
    , class :: Maybe (Maybe NonEmptyString)
    , for :: Maybe NonEmptyString
    , children :: ChildrenDiff message
    }

labelDiff :: forall message. String -> LabelDiffRec message -> ElementDiff message
labelDiff key = case _ of
  { id: Maybe.Nothing, class: Maybe.Nothing, for: Maybe.Nothing, children: ChildrenDiffSkip } -> Skip
  rec -> Update { elementUpdateDiff: ElementUpdateDiffLabelDiff (LabelDiff rec), key }

newtype Svg message
  = Svg (SvgRec message)

type SvgRec message
  = { id :: Maybe NonEmptyString
    , class :: Maybe NonEmptyString
    , viewBoxX :: Number
    , viewBoxY :: Number
    , viewBoxWidth :: Number
    , viewBoxHeight :: Number
    , children :: Array (Tuple.Tuple String (Element message))
    }

svg :: forall message. SvgRec message -> Element message
svg svgRec = ElementSvg (Svg svgRec)

newtype SvgDiff message
  = SvgDiff (SvgDiffRec message)

type SvgDiffRec message
  = { id :: Maybe.Maybe (Maybe.Maybe NonEmptyString.NonEmptyString)
    , class :: Maybe.Maybe (Maybe.Maybe NonEmptyString.NonEmptyString)
    , viewBoxX :: Maybe.Maybe Number
    , viewBoxY :: Maybe.Maybe Number
    , viewBoxWidth :: Maybe.Maybe Number
    , viewBoxHeight :: Maybe.Maybe Number
    , children :: ChildrenDiff message
    }

svgDiff :: forall message. String -> SvgDiffRec message -> ElementDiff message
svgDiff key rec = Update { elementUpdateDiff: ElementUpdateDiffSvgDiff (SvgDiff rec), key }

newtype SvgPath
  = SvgPath
  { id :: Maybe.Maybe NonEmptyString.NonEmptyString
  , class :: Maybe.Maybe NonEmptyString.NonEmptyString
  , d :: String
  , fill :: Color.Color
  }

newtype SvgPathDiff
  = SvgPathDiff SvgPathDiffRec

type SvgPathDiffRec
  = { id :: Maybe.Maybe (Maybe.Maybe NonEmptyString.NonEmptyString)
    , class :: Maybe.Maybe (Maybe.Maybe NonEmptyString.NonEmptyString)
    , d :: Maybe.Maybe String
    , fill :: Maybe Color.Color
    }

svgPathDiff :: forall message. String -> SvgPathDiffRec -> ElementDiff message
svgPathDiff key = case _ of
  { id: Maybe.Nothing, class: Maybe.Nothing, d: Maybe.Nothing, fill: Maybe.Nothing } -> Skip
  rec -> Update { elementUpdateDiff: ElementUpdateDiffSvgPathDiff (SvgPathDiff rec), key }

newtype SvgCircle :: Type -> Type
newtype SvgCircle message
  = SvgCircle
  { id :: Maybe NonEmptyString
  , class :: Maybe NonEmptyString
  , fill :: Color.Color
  , stroke :: Color.Color
  , cx :: Number
  , cy :: Number
  , r :: Number
  , children :: Array (Tuple.Tuple String (Element message))
  }

newtype SvgCircleDiff :: Type -> Type
newtype SvgCircleDiff message
  = SvgCircleDiff (SvgCircleDiffRec message)

type SvgCircleDiffRec message
  = { id :: Maybe (Maybe NonEmptyString)
    , class :: Maybe (Maybe NonEmptyString)
    , fill :: Maybe Color.Color
    , stroke :: Maybe Color.Color
    , cx :: Maybe.Maybe Number
    , cy :: Maybe.Maybe Number
    , r :: Maybe.Maybe Number
    , children :: ChildrenDiff message
    }

svgCircleDiff :: forall message. String -> SvgCircleDiffRec message -> ElementDiff message
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
  { attributeName :: NonEmptyString
  , dur :: Number
  , repeatCount :: String
  , from :: String
  , to :: String
  }

newtype SvgAnimateDiff
  = SvgAnimateDiff SvgAnimateDiffRec

type SvgAnimateDiffRec
  = { attributeName :: Maybe NonEmptyString
    , dur :: Maybe Number
    , repeatCount :: Maybe String
    , from :: Maybe String
    , to :: Maybe String
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

newtype SvgG :: Type -> Type
newtype SvgG message
  = SvgG
  { transform :: NonEmptyArray NonEmptyString
  , children :: Array (Tuple.Tuple String (Element message))
  }

data Children message
  = ChildrenElementList (NonEmptyArray (Tuple.Tuple String (Element message)))
  | ChildrenText String

data ChildrenDiff message
  = ChildrenDiffSkip
  | ChildrenDiffSetText String
  | ChildrenDiffResetAndInsert (NonEmptyArray (Tuple.Tuple String (Element message)))
  | ChildDiffList (NonEmptyArray (ElementDiff message))
