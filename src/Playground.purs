module Playground
  ( main
  ) where

import Prelude
import Console as Console
import Data.Array as Array
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

class ShowRecordFields :: PrimRowList.RowList Type -> Row Type -> Constraint
class ShowRecordFields rowlist row where
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

-- Row.Cons で分解結合できるのが, Row
styleToClass :: Style -> ClassName
styleToClass _ = ClassName "クラス名だ!!"

main :: Effect Unit
main =
  let
    value :: String
    value = toString { sampleB: 32, target: "ターゲットの値だぜ", sampleC: "しーしー" }
  in
    Console.logValue "それな" value
