module Playground
  ( main
  ) where

import Prelude
import Console as Console
import Data.Array as Array
import Data.Generic.Rep as Rep
import Data.Map as Map
import Data.Maybe (Maybe(..))
import Data.String as String
import Data.String.NonEmpty (NonEmptyString)
import Data.String.NonEmpty as NonEmptyString
import Data.Symbol as Symbol
import Data.Tuple as Tuple
import Effect (Effect)
import Effect.Exception (message)
import Html.Data as HtmlData
import Prim.Row as Row
import Prim.RowList (RowList, Nil, Cons, class RowToList)
import Record as Record
import Type.Data.RowList as RLProxy
import Type.Proxy (Proxy(..))
import Type.Proxy as Proxy

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

class AllValueMaybe (list :: RowList Type) (xs :: Row Type) (ys :: Row Type) | list -> ys where
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
    value = getTypeData (Proxy.Proxy :: Proxy.Proxy SampleType)
  in
    do
      Console.logValue "それな" value

data ElementOption

foreign import data WithStyleAndEvent :: ElementOption

foreign import data WithClassName :: ElementOption

foreign import data Diff :: ElementOption

value :: Element WithStyleAndEvent Int _
value = ElementDiv { attributes: { id: Nothing }, events: { click: 32 } }

classValue :: Element WithClassName Int _
classValue = ElementDiv { attributes: { id: Nothing }, className: NonEmptyString.nes (Proxy :: Proxy "sampleClass") }

data Element (elementOption :: ElementOption) (message :: Type) (item :: Type)
  = ElementDiv (ElementData elementOption DivAttribute ( click :: message ) item)
  | ElementHeading (ElementData elementOption ( id :: Maybe NonEmptyString ) () item)
  | ElementImage (ElementData elementOption ( alt :: String ) () item)

type DivAttribute :: Row Type
type DivAttribute
  = ( id :: Maybe NonEmptyString )

type DivEvent (message :: Type)
  = ( click :: message )

type ElementData (elementOption :: ElementOption) (attributes :: Row Type) (events :: Row Type) (recordType :: Type)
  = (ElementDataClass elementOption attributes events recordType) => recordType

class ElementDataClass (elementOption :: ElementOption) (attributes :: Row Type) (events :: Row Type) (outputType :: Type) | elementOption attributes events -> outputType

-- | そのままの形式
instance elementDataClassWithStyleAndEvent :: ElementDataClass WithStyleAndEvent attributes events { attributes :: Record attributes, events :: Record events }
-- | 集計済みの形式
else instance elementDataClassWithClassName :: ElementDataClass WithClassName attributes events { attributes :: Record attributes, className :: NonEmptyString }
-- | 差分の形式
else instance elementDataClassDiff :: ElementDataClass Diff attributes events { attributes :: Record attributes, className :: NonEmptyString }

idAttribute :: NonEmptyString -> Tuple.Tuple NonEmptyString (Maybe String)
idAttribute id =
  ( Tuple.Tuple
      (NonEmptyString.nes (Proxy :: Proxy "id"))
      (Just (NonEmptyString.toString id))
  )

getTypeData ::
  forall (t :: Type) (represent :: Type).
  (Rep.Generic t represent) =>
  NewTypeSampleClass represent =>
  Proxy.Proxy t -> String
getTypeData _ = getOneValue (Proxy :: Proxy represent)

class NewTypeSampleClass (represent :: Type) where
  getOneValue :: Proxy represent -> String

instance oneConstractor :: Symbol.IsSymbol name => NewTypeSampleClass (Rep.Constructor name Rep.NoArguments) where
  getOneValue _ = append "コンストラクタを発見!" (Symbol.reflectSymbol (Proxy :: Proxy name))

instance zeroConstractor :: NewTypeSampleClass Rep.NoConstructors where
  getOneValue _ = "コンストラクタはないようだ!!"

instance sumConstractor :: NewTypeSampleClass (Rep.Sum a b) where
  getOneValue _ = "Sumのようだ"

data SampleType

derive instance eqSampleType :: Eq SampleType

derive instance genericSampleType :: Rep.Generic SampleType _

type II
  = II (forall e. (Show e) => e)

iiValue :: Array II
iiValue = [ II 3, II 32.43, II "それな" ]
