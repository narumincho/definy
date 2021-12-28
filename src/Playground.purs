module Playground
  ( main
  ) where

import Prelude

import Console as Console
import Data.Maybe (Maybe(..))
import Data.String as String
import Data.Symbol as Symbol
import Effect (Effect)
import Prim.Row as Row
import Prim.RowList (RowList, Nil, Cons, class RowToList)
import Record as Record
import Type.Data.RowList as RLProxy
import Type.Proxy (Proxy(..))

class StyleTypeToClassNameType styleType classNameType | styleType -> classNameType where
  e :: Proxy styleType -> Proxy styleType

newtype DomWithClassName
  = DomWithClass { id :: String, value :: Int, className :: ClassName }

newtype DomWithStyle
  = DomWithStyle { id :: String, value :: Int, style :: Style }

type StyleTypeToClassNameTypeFunc styleType
  = forall classNameType. (StyleTypeToClassNameType styleType classNameType => classNameType)

data Style
  = Style

newtype ClassName
  = ClassName String

toString :: forall rs ls. (RowToList rs ls) => (ShowRecordFields ls rs) => (Record rs) -> String
toString record = showRecordFields (RLProxy.RLProxy :: RLProxy.RLProxy ls) record

class ShowRecordFields (rowlist :: RowList Type) (row :: Row Type) where
  showRecordFields :: RLProxy.RLProxy rowlist -> Record row -> String

instance showRecordFieldsNil :: ShowRecordFields Nil row where
  showRecordFields _ _ = "nilだ"
else instance showRecordFieldsTargetFiled ::
  (ShowRecordFields rowlistTail row) =>
  ShowRecordFields (Cons "target" value rowlistTail) row where
  showRecordFields _ record =
    String.joinWith ","
      [ "target のフォールドだけ特別扱いだ!"
      , showRecordFields (RLProxy.RLProxy :: RLProxy.RLProxy rowlistTail) record
      ]
else instance showRecordFieldsCons ::
  ( Symbol.IsSymbol key
  , ShowRecordFields rowlistTail row
  ) =>
  ShowRecordFields (Cons key value rowlistTail) row where
  showRecordFields _ record =
    String.joinWith ","
      [ Symbol.reflectSymbol (Symbol.SProxy :: Symbol.SProxy key)
      , showRecordFields (RLProxy.RLProxy :: RLProxy.RLProxy rowlistTail) record
      ]

toAllJustValue :: forall rs ls out. (RowToList rs ls) => (AllValueMaybe ls rs out) => (Record rs) -> Record out
toAllJustValue value = toMaybe (RLProxy.RLProxy :: RLProxy.RLProxy ls) value

class AllValueMaybe (list:: RowList Type) (xs::Row Type) (ys::Row Type) | list -> ys where
  toMaybe :: RLProxy.RLProxy list -> Record xs -> Record ys

instance allValueMaybeNil ::
  AllValueMaybe Nil xs () where
  toMaybe _ _ = {}

instance allValueMaybeCons ::
  ( Symbol.IsSymbol key
  , Row.Cons key value xsTail xs
  , Row.Cons key (Maybe value) ysTail ys
  , Row.Lacks key ysTail
  , AllValueMaybe tail xs ysTail
  ) =>
  AllValueMaybe (Cons key (value) tail) xs ys where
  toMaybe _ obj =
    let
      maybeValue :: Maybe value
      maybeValue = Just (Record.get (Symbol.SProxy :: _ key) obj)
    in
      Record.insert (Symbol.SProxy :: _ key)
        maybeValue
        (toMaybe (RLProxy.RLProxy :: _ tail) obj)

-- Row.Cons で分解結合できるのが, Row
styleToClass :: Style -> ClassName
styleToClass _ = ClassName "クラス名だ!!"

sampleData ∷ { a ∷ Maybe Int, b ∷ Maybe String }
sampleData = toAllJustValue { a: 32, b: "ok" }

main :: Effect Unit
main =
  let
    value :: String
    value = toString { sampleB: 32, target: "ターゲットの値だぜ", sampleC: "しーしー" }
  in
    do
      Console.logValue "それな" {}

newtype DivWithStyleAndEvent message location
  = DivWithStyleAndEvent
  { id :: String
  , style :: Style
  , click :: message
  , children :: ChildrenWithStyleAndEvent message location
  }

newtype DivWithClassName
  = DivWithClassName
  { id :: String
  , className :: ClassName
  , children :: ChildrenWithClassName
  }

newtype DivDiff
  = DivDiff
  { id :: Maybe String
  , className :: Maybe ClassName
  , childrenDiff :: ChildrenDiff
  }

data ChildrenWithStyleAndEvent :: Type -> Type -> Type
data ChildrenWithStyleAndEvent message location
  = ChildrenWithStyleAndEvent

data ChildrenWithClassName
  = ChildrenWithClassName

data ChildrenDiff
  = ChildrenDiff




newtype ElementWithClassOrStyle (classOrStyle :: Type)
  = ElementWithClassOrStyle
  { classOrStyle :: classOrStyle
  , element :: Element classOrStyle
  }

data Element (classOrStyle :: Type)
  = ElementDiv (Div classOrStyle)
  | ElementHeading1 (Heading1 classOrStyle)
  | ElementImage Image

newtype Div (classOrStyle :: Type)
  = Div { attribute :: Record DivAttribute, children :: ElementWithClassOrStyle classOrStyle }

type DivAttribute
  = ( id :: String )

newtype Heading1 (classOrStyle :: Type)
  = Heading1
  { children :: ElementWithClassOrStyle classOrStyle
  }

newtype Image
  = Image {}

createValue :: forall isNumber resultType. (TypeFuncClass isNumber resultType) => Proxy isNumber -> resultType
createValue pro = valueData pro

class TypeFuncClass (isNumber :: E) (resultType :: Type) | isNumber -> resultType where
  valueData :: Proxy isNumber -> resultType

instance TypeFuncClass True String where
  valueData _ = "str だ"

instance TypeFuncClass False Int where
  valueData _ = 999

foreign import kind E

foreign import data True :: E

foreign import data False :: E

foreign import data HtmlOrSvgElement :: Type

eValue = createValue (Proxy :: Proxy True)

class Elementable (elementType::Type) where
  toHtmlOrSvgElement :: elementType -> Effect HtmlOrSvgElement
