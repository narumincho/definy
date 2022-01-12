module Identifier
  ( AlphabetLowercase
  , AlphabetUppercase
  , CharType
  , CharTypeList
  , Cons
  , Digit
  , Nil
  , Other
  , class CharSymbolToCharType
  , class SymbolToCharTypeList
  ) where

import Prim.Symbol as Symbol

data CharType

foreign import data AlphabetUppercase :: Symbol -> CharType

foreign import data AlphabetLowercase :: Symbol -> CharType

foreign import data Digit :: Symbol -> CharType

foreign import data Other :: Symbol -> CharType

class CharSymbolToCharType (charSymbol :: Symbol) (charType :: CharType) | charSymbol -> charType

instance charSymbolToCharTypeUpperA :: CharSymbolToCharType "A" (AlphabetUppercase "A")
else instance charSymbolToCharTypeUpperB :: CharSymbolToCharType "B" (AlphabetUppercase "B")
else instance charSymbolToCharTypeUpperC :: CharSymbolToCharType "C" (AlphabetUppercase "C")
else instance charSymbolToCharTypeUpperD :: CharSymbolToCharType "D" (AlphabetUppercase "D")
else instance charSymbolToCharTypeUpperE :: CharSymbolToCharType "E" (AlphabetUppercase "E")
else instance charSymbolToCharTypeUpperF :: CharSymbolToCharType "F" (AlphabetUppercase "F")
else instance charSymbolToCharTypeUpperG :: CharSymbolToCharType "G" (AlphabetUppercase "G")
else instance charSymbolToCharTypeUpperH :: CharSymbolToCharType "H" (AlphabetUppercase "H")
else instance charSymbolToCharTypeUpperI :: CharSymbolToCharType "I" (AlphabetUppercase "I")
else instance charSymbolToCharTypeUpperJ :: CharSymbolToCharType "J" (AlphabetUppercase "J")
else instance charSymbolToCharTypeUpperK :: CharSymbolToCharType "K" (AlphabetUppercase "K")
else instance charSymbolToCharTypeUpperL :: CharSymbolToCharType "L" (AlphabetUppercase "L")
else instance charSymbolToCharTypeUpperM :: CharSymbolToCharType "M" (AlphabetUppercase "M")
else instance charSymbolToCharTypeUpperN :: CharSymbolToCharType "N" (AlphabetUppercase "N")
else instance charSymbolToCharTypeUpperO :: CharSymbolToCharType "O" (AlphabetUppercase "O")
else instance charSymbolToCharTypeUpperP :: CharSymbolToCharType "P" (AlphabetUppercase "P")
else instance charSymbolToCharTypeUpperQ :: CharSymbolToCharType "Q" (AlphabetUppercase "Q")
else instance charSymbolToCharTypeUpperR :: CharSymbolToCharType "R" (AlphabetUppercase "R")
else instance charSymbolToCharTypeUpperS :: CharSymbolToCharType "S" (AlphabetUppercase "S")
else instance charSymbolToCharTypeUpperT :: CharSymbolToCharType "T" (AlphabetUppercase "T")
else instance charSymbolToCharTypeUpperU :: CharSymbolToCharType "U" (AlphabetUppercase "U")
else instance charSymbolToCharTypeUpperV :: CharSymbolToCharType "V" (AlphabetUppercase "V")
else instance charSymbolToCharTypeUpperW :: CharSymbolToCharType "W" (AlphabetUppercase "W")
else instance charSymbolToCharTypeUpperX :: CharSymbolToCharType "X" (AlphabetUppercase "X")
else instance charSymbolToCharTypeUpperY :: CharSymbolToCharType "Y" (AlphabetUppercase "Y")
else instance charSymbolToCharTypeUpperZ :: CharSymbolToCharType "Z" (AlphabetUppercase "Z")
else instance charSymbolToCharTypeLowerA :: CharSymbolToCharType "a" (AlphabetLowercase "a")
else instance charSymbolToCharTypeLowerB :: CharSymbolToCharType "b" (AlphabetLowercase "b")
else instance charSymbolToCharTypeLowerC :: CharSymbolToCharType "c" (AlphabetLowercase "c")
else instance charSymbolToCharTypeLowerD :: CharSymbolToCharType "d" (AlphabetLowercase "d")
else instance charSymbolToCharTypeLowerE :: CharSymbolToCharType "e" (AlphabetLowercase "e")
else instance charSymbolToCharTypeLowerF :: CharSymbolToCharType "f" (AlphabetLowercase "f")
else instance charSymbolToCharTypeLowerG :: CharSymbolToCharType "g" (AlphabetLowercase "g")
else instance charSymbolToCharTypeLowerH :: CharSymbolToCharType "h" (AlphabetLowercase "h")
else instance charSymbolToCharTypeLowerI :: CharSymbolToCharType "i" (AlphabetLowercase "i")
else instance charSymbolToCharTypeLowerJ :: CharSymbolToCharType "j" (AlphabetLowercase "j")
else instance charSymbolToCharTypeLowerK :: CharSymbolToCharType "k" (AlphabetLowercase "k")
else instance charSymbolToCharTypeLowerL :: CharSymbolToCharType "l" (AlphabetLowercase "l")
else instance charSymbolToCharTypeLowerM :: CharSymbolToCharType "m" (AlphabetLowercase "m")
else instance charSymbolToCharTypeLowerN :: CharSymbolToCharType "n" (AlphabetLowercase "n")
else instance charSymbolToCharTypeLowerO :: CharSymbolToCharType "o" (AlphabetLowercase "o")
else instance charSymbolToCharTypeLowerP :: CharSymbolToCharType "p" (AlphabetLowercase "p")
else instance charSymbolToCharTypeLowerQ :: CharSymbolToCharType "q" (AlphabetLowercase "q")
else instance charSymbolToCharTypeLowerR :: CharSymbolToCharType "r" (AlphabetLowercase "r")
else instance charSymbolToCharTypeLowerS :: CharSymbolToCharType "s" (AlphabetLowercase "s")
else instance charSymbolToCharTypeLowerT :: CharSymbolToCharType "t" (AlphabetLowercase "t")
else instance charSymbolToCharTypeLowerU :: CharSymbolToCharType "u" (AlphabetLowercase "u")
else instance charSymbolToCharTypeLowerV :: CharSymbolToCharType "v" (AlphabetLowercase "v")
else instance charSymbolToCharTypeLowerW :: CharSymbolToCharType "w" (AlphabetLowercase "w")
else instance charSymbolToCharTypeLowerX :: CharSymbolToCharType "x" (AlphabetLowercase "x")
else instance charSymbolToCharTypeLowerY :: CharSymbolToCharType "y" (AlphabetLowercase "y")
else instance charSymbolToCharTypeLowerZ :: CharSymbolToCharType "z" (AlphabetLowercase "z")
else instance charSymbolToCharType0 :: CharSymbolToCharType "0" (Digit "0")
else instance charSymbolToCharType1 :: CharSymbolToCharType "1" (Digit "1")
else instance charSymbolToCharType2 :: CharSymbolToCharType "2" (Digit "2")
else instance charSymbolToCharType3 :: CharSymbolToCharType "3" (Digit "3")
else instance charSymbolToCharType4 :: CharSymbolToCharType "4" (Digit "4")
else instance charSymbolToCharType5 :: CharSymbolToCharType "5" (Digit "5")
else instance charSymbolToCharType6 :: CharSymbolToCharType "6" (Digit "6")
else instance charSymbolToCharType7 :: CharSymbolToCharType "7" (Digit "7")
else instance charSymbolToCharType8 :: CharSymbolToCharType "8" (Digit "8")
else instance charSymbolToCharType9 :: CharSymbolToCharType "9" (Digit "9")
else instance charSymbolToCharTypeOther :: CharSymbolToCharType char (Other char)

data CharTypeList

foreign import data Cons :: CharType -> CharTypeList -> CharTypeList

foreign import data Nil :: CharTypeList

class SymbolToCharTypeList (symbol :: Symbol) (charTypeList :: CharTypeList) | symbol -> charTypeList

instance symbolToCharTypeListNil :: SymbolToCharTypeList "" Nil
else instance symbolToCharTypeListCons ::
  ( Symbol.Cons head tail symbol
  , CharSymbolToCharType head headChar
  , SymbolToCharTypeList tail taalCharTypeList
  ) =>
  SymbolToCharTypeList symbol (Cons headChar taalCharTypeList)
