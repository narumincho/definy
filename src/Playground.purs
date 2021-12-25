module Playground
  ( main
  ) where

import Prelude
import Console as Console
import Data.Array as Array
import Data.Maybe (Maybe(..))
import Data.String as String
import Data.Symbol as Symbol
import Effect (Effect)
import Prim.Row as Row
import Prim.RowList as PrimRowList
import Record as Record
import Type.Data.RowList as RowList
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

toString :: forall rs ls. (PrimRowList.RowToList rs ls) => (ShowRecordFields ls rs) => (Record rs) -> String
toString record = showRecordFields (RowList.RLProxy :: RowList.RLProxy ls) record

class ShowRecordFields (rowlist :: PrimRowList.RowList Type) (row :: Row Type) where
  showRecordFields :: RowList.RLProxy rowlist -> Record row -> String

instance showRecordFieldsNil :: ShowRecordFields PrimRowList.Nil row where
  showRecordFields _ _ = "nilだ"
else instance showRecordFieldsTargetFiled ::
  (ShowRecordFields rowlistTail row) =>
  ShowRecordFields (PrimRowList.Cons "target" value rowlistTail) row where
  showRecordFields _ record =
    String.joinWith ","
      [ "target のフォールドだけ特別扱いだ!"
      , showRecordFields (RowList.RLProxy :: RowList.RLProxy rowlistTail) record
      ]
else instance showRecordFieldsCons ::
  ( Symbol.IsSymbol key
  , ShowRecordFields rowlistTail row
  ) =>
  ShowRecordFields (PrimRowList.Cons key value rowlistTail) row where
  showRecordFields _ record =
    String.joinWith ","
      [ Symbol.reflectSymbol (Symbol.SProxy :: Symbol.SProxy key)
      , showRecordFields (RowList.RLProxy :: RowList.RLProxy rowlistTail) record
      ]

toAllJustValue :: forall rs ls out. (PrimRowList.RowToList rs ls) => (AllValueMaybe ls rs out) => (Record rs) -> Record out
toAllJustValue value = toMaybe (RowList.RLProxy :: RowList.RLProxy ls) value

class AllValueMaybe :: PrimRowList.RowList Type -> Row Type -> Row Type -> Constraint
class AllValueMaybe list xs ys | list -> ys where
  toMaybe :: RowList.RLProxy list -> Record xs -> Record ys

instance allValueMaybeNil ::
  AllValueMaybe PrimRowList.Nil xs () where
  toMaybe _ _ = {}

instance allValueMaybeCons ::
  ( Symbol.IsSymbol key
  , Row.Cons key value xsTail xs
  , Row.Cons key (Maybe value) ysTail ys
  , Row.Lacks key ysTail
  , AllValueMaybe tail xs ysTail
  ) =>
  AllValueMaybe (PrimRowList.Cons key (value) tail) xs ys where
  toMaybe _ obj =
    let
      maybeValue :: Maybe value
      maybeValue = Just (Record.get (Symbol.SProxy :: _ key) obj)
    in
      Record.insert (Symbol.SProxy :: _ key)
        maybeValue
        (toMaybe (RowList.RLProxy :: _ tail) obj)

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
