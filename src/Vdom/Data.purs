module Vdom.Data
  ( Button(..)
  , Children(..)
  , ChildrenDiff(..)
  , Code(..)
  , Div(..)
  , Element(..)
  , ElementDiff
  , ElementUpdateDiff
  , ExternalLink(..)
  , H1(..)
  , H2(..)
  , Img(..)
  , InputRadio(..)
  , InputText(..)
  , Label(..)
  , MessageData(..)
  , Pointer(..)
  , PointerType(..)
  , SameOriginLink(..)
  , Svg(..)
  , SvgAnimate(..)
  , SvgCircle(..)
  , SvgG(..)
  , SvgPath(..)
  , SvgRec
  , TextArea(..)
  , Vdom(..)
  , ViewDiff(..)
  , ViewPatchOperation(..)
  , buttonDiff
  , createDivDeff
  , externalLinkDiff
  , imgDiff
  , inputRadioDiff
  , inputTextDiff
  , labelDiff
  , localLinkDiff
  , replace
  , skip
  , svg
  , svgAnimateDiff
  , svgCircleDiff
  , svgDiff
  , svgPathDiff
  , textAreaDiff
  ) where

import Color as Color
import Css as Css
import Data.Array as Array
import Data.Array.NonEmpty (NonEmptyArray)
import Data.Array.NonEmpty as NonEmptyArray
import Data.Maybe (Maybe)
import Data.Maybe as Maybe
import Data.String.NonEmpty (NonEmptyString)
import Data.Tuple as Tuple
import Language as Language
import Prelude as Prelude
import StructuredUrl as StructuredUrl
import Vdom.PatchState as PatchState

newtype Vdom :: Type -> Type -> Type
newtype Vdom message location
  = Vdom
  { {- ページ名
  Google 検索のページ名や, タブ, ブックマークのタイトル, OGPのタイトルなどに使用される  -} pageName :: NonEmptyString
  , {- アプリ名 / サイト名 -} appName :: NonEmptyString
  , {- ページの説明 -} description :: String
  , {- テーマカラー -} themeColor :: Color.Color
  , {- アイコン画像のURL -} iconPath :: StructuredUrl.PathAndSearchParams
  , {- 使用している言語 -} language :: Maybe Language.Language
  , {- OGPに使われるカバー画像のパス -} coverImagePath :: StructuredUrl.PathAndSearchParams
  , {- パス. ログイン時のコールバック時には Noting にして良い -} path :: Maybe StructuredUrl.PathAndSearchParams
  , {- オリジン -} origin :: NonEmptyString
  , {- 全体に適応されるスタイル. CSS -} style :: Css.StatementList
  , {- スクリプトのパス -} scriptPath :: Maybe StructuredUrl.PathAndSearchParams
  , {- body の class -} bodyClass :: Maybe NonEmptyString
  , pointerMove :: Maybe (Pointer -> message)
  , pointerDown :: Maybe (Pointer -> message)
  , {- body の 子要素 -} children :: Array (Tuple.Tuple String (Element message location))
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

newtype MessageData :: Type -> Type
-- | メッセージを集計した結果
newtype MessageData message
  = MessageData
  { messageMap :: PatchState.NewMessageMapParameter message
  , pointerMove :: Maybe (Pointer -> message)
  , pointerDown :: Maybe (Pointer -> message)
  }

newtype ViewDiff :: Type -> Type -> Type
-- | View の 差分データ.
-- | 
-- | イベント関係は差分を使って処理をしないので Message は含まれないが, 要素を追加するときに Message を使う形になってしまっている
newtype ViewDiff message location
  = ViewDiff
  { patchOperationList :: Array ViewPatchOperation
  , childrenDiff :: ChildrenDiff message location
  , newMessageData :: MessageData message
  }

data ViewPatchOperation
  = ChangePageName NonEmptyString
  | ChangeThemeColor Color.Color
  | ChangeLanguage (Maybe Language.Language)
  | ChangeBodyClass (Maybe NonEmptyString)

data Element :: Type -> Type -> Type
data Element message location
  = ElementDiv (Div message location)
  | ElementH1 (H1 message location)
  | ElementH2 (H2 message location)
  | ElementCode (Code message location)
  | ElementExternalLink (ExternalLink message location)
  | ElementSameOriginLink (SameOriginLink message location)
  | ElementButton (Button message location)
  | ElementImg Img
  | ElementInputRadio (InputRadio message)
  | ElementInputText (InputText message)
  | ElementTextArea (TextArea message)
  | ElementLabel (Label message location)
  | ElementSvg (Svg message location)
  | ElementSvgPath SvgPath
  | ElementSvgCircle (SvgCircle message location)
  | ElementSvgAnimate SvgAnimate
  | ElementSvgG (SvgG message location)

data ElementDiff :: Type -> Type -> Type
data ElementDiff message location
  = Replace { newElement :: Element message location, key :: String }
  | Update
    { elementUpdateDiff :: ElementUpdateDiff message location
    , key :: String
    }
  | Delete
  | Insert
    { element :: Element message location
    , key :: String
    }
  | Skip

skip :: forall message location. ElementDiff message location
skip = Skip

replace :: forall message location. String -> Element message location -> ElementDiff message location
replace key newElement = Replace { newElement, key }

data ElementUpdateDiff :: Type -> Type -> Type
data ElementUpdateDiff message location
  = ElementUpdateDiffDiv (DivDiff message location)
  | ElementUpdateDiffExternalLinkDiff (ExternalLinkDiff message location)
  | ElementUpdateDiffSameOriginLinkDiff (SameOriginLinkDiff message location)
  | ElementUpdateDiffButtonDiff (ButtonDiff message location)
  | ElementUpdateDiffImgDiff ImgDiff
  | ElementUpdateDiffInputRadioDiff InputRadioDiff
  | ElementUpdateDiffInputTextDiff InputTextDiff
  | ElementUpdateDiffTextAreaDiff TextAreaDiff
  | ElementUpdateDiffLabelDiff (LabelDiff message location)
  | ElementUpdateDiffSvgDiff (SvgDiff message location)
  | ElementUpdateDiffSvgPathDiff SvgPathDiff
  | ElementUpdateDiffSvgCircleDiff (SvgCircleDiff message location)
  | ElementUpdateDiffSvgAnimateDiff SvgAnimateDiff

newtype Div :: Type -> Type -> Type
newtype Div message location
  = Div
  { id :: Maybe NonEmptyString
  , class :: Maybe NonEmptyString
  , click :: Maybe (PatchState.ClickMessageData message)
  , children :: Children message location
  }

newtype DivDiff message location
  = DivDiff (NonEmptyArray (DivPatchOperation message location))

data DivPatchOperation :: Type -> Type -> Type
data DivPatchOperation message location
  = DivPatchOperationSetId (Maybe NonEmptyString)
  | DivPatchOperationSetClass (Maybe NonEmptyString)
  | DivPatchOperationUpdateChildren (ChildrenDiff message location)

createDivDeff :: forall message location. String -> Div message location -> Div message location -> ElementDiff message location
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

createDiff :: forall a. Prelude.Eq a => a -> a -> Maybe a
createDiff old new =
  if Prelude.eq old new then
    Maybe.Nothing
  else
    Maybe.Just new

newtype H1 :: Type -> Type -> Type
newtype H1 message location
  = H1
  { id :: Maybe NonEmptyString
  , class :: Maybe NonEmptyString
  , click :: Maybe (PatchState.ClickMessageData message)
  , children :: Children message location
  }

newtype H2 :: Type -> Type -> Type
newtype H2 message location
  = H2
  { id :: Maybe NonEmptyString
  , class :: Maybe NonEmptyString
  , click :: Maybe (PatchState.ClickMessageData message)
  , children :: Children message location
  }

newtype Code message location
  = Code
  { id :: Maybe NonEmptyString
  , class :: Maybe NonEmptyString
  , click :: Maybe (PatchState.ClickMessageData message)
  , children :: Children message location
  }

newtype ExternalLink :: Type -> Type -> Type
-- | 外部のリンクを持つ `<a>`
newtype ExternalLink message location
  = ExternalLink
  { id :: Maybe NonEmptyString
  , class :: Maybe NonEmptyString
  , href :: StructuredUrl.StructuredUrl
  , children :: Children message location
  }

newtype ExternalLinkDiff :: Type -> Type -> Type
newtype ExternalLinkDiff message location
  = ExternalLinkDiff (NonEmptyArray (ExternalLinkPatchOperation message location))

data ExternalLinkPatchOperation message location
  = ExternalLinkPatchOperationSetId (Maybe NonEmptyString)
  | ExternalLinkPatchOperationSetClass (Maybe NonEmptyString)
  | ExternalLinkPatchOperationSetHref StructuredUrl.StructuredUrl
  | ExternalLinkPatchOperationUpdateChildren (ChildrenDiff message location)

externalLinkDiff :: forall message location. String -> ExternalLink message location -> ExternalLink message location -> ElementDiff message location
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

newtype SameOriginLink :: Type -> Type -> Type
newtype SameOriginLink message location
  = SameOriginLink
  { id :: Maybe NonEmptyString
  , class :: Maybe NonEmptyString
  , href :: location
  , children :: Children message location
  }

newtype SameOriginLinkDiff :: Type -> Type -> Type
newtype SameOriginLinkDiff message location
  = SameOriginLinkDiff (NonEmptyArray (SameOriginLinkPatchOperation message location))

data SameOriginLinkPatchOperation message location
  = SameOriginLinkPatchOperationSetId (Maybe NonEmptyString)
  | SameOriginLinkPatchOperationSetClass (Maybe NonEmptyString)
  | SameOriginLinkPatchOperationSetHref location
  | SameOriginLinkPatchOperationUpdateChildren (ChildrenDiff message location)

localLinkDiff :: forall message location. (Prelude.Eq location) => String -> SameOriginLink message location -> SameOriginLink message location -> ElementDiff message location
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

newtype Button :: Type -> Type -> Type
newtype Button message location
  = Button
  { id :: Maybe NonEmptyString
  , class :: Maybe NonEmptyString
  , click :: message
  , children :: Children message location
  }

newtype ButtonDiff :: Type -> Type -> Type
newtype ButtonDiff message location
  = ButtonDiff (NonEmptyArray (ButtonPatchOperation message location))

data ButtonPatchOperation message location
  = ButtonPatchOperationSetId (Maybe NonEmptyString)
  | ButtonPatchOperationSetClass (Maybe NonEmptyString)
  | ButtonPatchOperationUpdateChildren (ChildrenDiff message location)

buttonDiff :: forall message location. String -> Button message location -> Button message location -> ElementDiff message location
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
    , alt :: Maybe String
    , src :: Maybe StructuredUrl.PathAndSearchParams
    }

imgDiff :: forall message location. String -> ImgDiffRec -> ElementDiff message location
imgDiff key = case _ of
  { id: Maybe.Nothing, class: Maybe.Nothing, alt: Maybe.Nothing, src: Maybe.Nothing } -> Skip
  rec -> Update { elementUpdateDiff: ElementUpdateDiffImgDiff (ImgDiff rec), key }

newtype InputRadio :: Type -> Type
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
    , checked :: Maybe Boolean
    , name :: Maybe NonEmptyString
    }

inputRadioDiff :: forall message location. String -> InputRadioDiffRec -> ElementDiff message location
inputRadioDiff key = case _ of
  { id: Maybe.Nothing, class: Maybe.Nothing, checked: Maybe.Nothing, name: Maybe.Nothing
  } -> Skip
  rec -> Update { elementUpdateDiff: ElementUpdateDiffInputRadioDiff (InputRadioDiff rec), key }

newtype InputText :: Type -> Type
newtype InputText message
  = InputText
  { id :: Maybe NonEmptyString
  , class :: Maybe NonEmptyString
  , inputOrReadonly :: Maybe (String -> message)
  , value :: String
  }

newtype InputTextDiff
  = InputTextDiff InputTextDiffRec

type InputTextDiffRec
  = { id :: Maybe (Maybe NonEmptyString)
    , class :: Maybe (Maybe NonEmptyString)
    , readonly :: Maybe Boolean
    , value :: Maybe String
    }

inputTextDiff :: forall message location. String -> InputTextDiffRec -> ElementDiff message location
inputTextDiff key = case _ of
  { id: Maybe.Nothing, class: Maybe.Nothing, readonly: Maybe.Nothing, value: Maybe.Nothing } -> Skip
  rec -> Update { elementUpdateDiff: ElementUpdateDiffInputTextDiff (InputTextDiff rec), key }

newtype TextArea :: Type -> Type
newtype TextArea message
  = TextArea
  { id :: Maybe NonEmptyString
  , class :: Maybe NonEmptyString
  , inputOrReadonly :: Maybe (String -> message)
  , value :: String
  }

newtype TextAreaDiff
  = TextAreaDiff TextAreaDiffRec

type TextAreaDiffRec
  = { id :: Maybe (Maybe NonEmptyString)
    , class :: Maybe (Maybe NonEmptyString)
    , readonly :: Maybe Boolean
    , value :: Maybe String
    }

textAreaDiff :: forall message location. String -> TextAreaDiffRec -> ElementDiff message location
textAreaDiff key = case _ of
  { id: Maybe.Nothing
  , class: Maybe.Nothing
  , readonly: Maybe.Nothing
  , value: Maybe.Nothing
  } -> Skip
  rec -> Update { elementUpdateDiff: ElementUpdateDiffTextAreaDiff (TextAreaDiff rec), key }

newtype Label :: Type -> Type -> Type
newtype Label message location
  = Label
  { id :: Maybe NonEmptyString
  , class :: Maybe NonEmptyString
  , for :: NonEmptyString
  , children :: Children message location
  }

newtype LabelDiff :: Type -> Type -> Type
newtype LabelDiff message location
  = LabelDiff (LabelDiffRec message location)

type LabelDiffRec :: Type -> Type -> Type
type LabelDiffRec message location
  = { id :: Maybe (Maybe NonEmptyString)
    , class :: Maybe (Maybe NonEmptyString)
    , for :: Maybe NonEmptyString
    , children :: ChildrenDiff message location
    }

labelDiff :: forall message location. String -> LabelDiffRec message location -> ElementDiff message location
labelDiff key = case _ of
  { id: Maybe.Nothing, class: Maybe.Nothing, for: Maybe.Nothing, children: ChildrenDiffSkip } -> Skip
  rec -> Update { elementUpdateDiff: ElementUpdateDiffLabelDiff (LabelDiff rec), key }

newtype Svg :: Type -> Type -> Type
newtype Svg message location
  = Svg (SvgRec message location)

type SvgRec :: Type -> Type -> Type
type SvgRec message location
  = { id :: Maybe NonEmptyString
    , class :: Maybe NonEmptyString
    , viewBoxX :: Number
    , viewBoxY :: Number
    , viewBoxWidth :: Number
    , viewBoxHeight :: Number
    , children :: Array (Tuple.Tuple String (Element message location))
    }

svg :: forall message location. SvgRec message location -> Element message location
svg svgRec = ElementSvg (Svg svgRec)

newtype SvgDiff :: Type -> Type -> Type
newtype SvgDiff message location
  = SvgDiff (SvgDiffRec message location)

type SvgDiffRec :: Type -> Type -> Type
type SvgDiffRec message location
  = { id :: Maybe (Maybe NonEmptyString)
    , class :: Maybe (Maybe NonEmptyString)
    , viewBoxX :: Maybe Number
    , viewBoxY :: Maybe Number
    , viewBoxWidth :: Maybe Number
    , viewBoxHeight :: Maybe Number
    , children :: ChildrenDiff message location
    }

svgDiff :: forall message location. String -> SvgDiffRec message location -> ElementDiff message location
svgDiff key rec = Update { elementUpdateDiff: ElementUpdateDiffSvgDiff (SvgDiff rec), key }

newtype SvgPath
  = SvgPath
  { id :: Maybe NonEmptyString
  , class :: Maybe NonEmptyString
  , d :: String
  , fill :: Color.Color
  }

newtype SvgPathDiff
  = SvgPathDiff SvgPathDiffRec

type SvgPathDiffRec
  = { id :: Maybe (Maybe NonEmptyString)
    , class :: Maybe (Maybe NonEmptyString)
    , d :: Maybe String
    , fill :: Maybe Color.Color
    }

svgPathDiff :: forall message location. String -> SvgPathDiffRec -> ElementDiff message location
svgPathDiff key = case _ of
  { id: Maybe.Nothing, class: Maybe.Nothing, d: Maybe.Nothing, fill: Maybe.Nothing } -> Skip
  rec -> Update { elementUpdateDiff: ElementUpdateDiffSvgPathDiff (SvgPathDiff rec), key }

newtype SvgCircle :: Type -> Type -> Type
newtype SvgCircle message location
  = SvgCircle
  { id :: Maybe NonEmptyString
  , class :: Maybe NonEmptyString
  , fill :: Color.Color
  , stroke :: Color.Color
  , cx :: Number
  , cy :: Number
  , r :: Number
  , children :: Array (Tuple.Tuple String (Element message location))
  }

newtype SvgCircleDiff :: Type -> Type -> Type
newtype SvgCircleDiff message location
  = SvgCircleDiff (SvgCircleDiffRec message location)

type SvgCircleDiffRec :: Type -> Type -> Type
type SvgCircleDiffRec message location
  = { id :: Maybe (Maybe NonEmptyString)
    , class :: Maybe (Maybe NonEmptyString)
    , fill :: Maybe Color.Color
    , stroke :: Maybe Color.Color
    , cx :: Maybe Number
    , cy :: Maybe Number
    , r :: Maybe Number
    , children :: ChildrenDiff message location
    }

svgCircleDiff :: forall message location. String -> SvgCircleDiffRec message location -> ElementDiff message location
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

svgAnimateDiff :: forall message location. String -> SvgAnimateDiffRec -> ElementDiff message location
svgAnimateDiff key = case _ of
  { attributeName: Maybe.Nothing
  , dur: Maybe.Nothing
  , repeatCount: Maybe.Nothing
  , from: Maybe.Nothing
  , to: Maybe.Nothing
  } -> Skip
  rec -> Update { elementUpdateDiff: ElementUpdateDiffSvgAnimateDiff (SvgAnimateDiff rec), key }

newtype SvgG :: Type -> Type -> Type
newtype SvgG message location
  = SvgG
  { transform :: NonEmptyArray NonEmptyString
  , children :: Array (Tuple.Tuple String (Element message location))
  }

data Children :: Type -> Type -> Type
data Children message location
  = ChildrenElementList (NonEmptyArray (Tuple.Tuple String (Element message location)))
  | ChildrenText String

data ChildrenDiff :: Type -> Type -> Type
data ChildrenDiff message location
  = ChildrenDiffSkip
  | ChildrenDiffSetText String
  | ChildrenDiffResetAndInsert (NonEmptyArray (Tuple.Tuple String (Element message location)))
  | ChildDiffList (NonEmptyArray (ElementDiff message location))
