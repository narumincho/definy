module Identifier
  ( AlphabetLowercase
  , AlphabetUppercase
  , CharType(..)
  , Digit
  , reflectCharType
  , Other
  , class CharSymbolToCharType
  , class CharTypeListLowercaseToUppercase
  , class IsCharType
  , class LowercaseToUppercase
  , class SymbolToCharTypeList
  , reifyCharType
  ) where

import Data.String as String
import Prim.Symbol as Symbol
import Type.Data.List as TList
import Type.Prelude (class IsSymbol, Proxy(..), reflectSymbol, reifySymbol)

data CharType
  = AlphabetUppercase Char
  | AlphabetLowercase Char
  | Digit Char
  | Other String

class IsCharType (charType :: CharType) where
  reflectCharType :: Proxy charType -> CharType

instance isCharTypeUpperA :: IsCharType (AlphabetUppercase "A") where
  reflectCharType _ = AlphabetUppercase 'A'
else instance isCharTypeUpperB :: IsCharType (AlphabetUppercase "B") where
  reflectCharType _ = AlphabetUppercase 'B'
else instance isCharTypeUpperC :: IsCharType (AlphabetUppercase "C") where
  reflectCharType _ = AlphabetUppercase 'C'
else instance isCharTypeUpperD :: IsCharType (AlphabetUppercase "D") where
  reflectCharType _ = AlphabetUppercase 'D'
else instance isCharTypeUpperE :: IsCharType (AlphabetUppercase "E") where
  reflectCharType _ = AlphabetUppercase 'E'
else instance isCharTypeUpperF :: IsCharType (AlphabetUppercase "F") where
  reflectCharType _ = AlphabetUppercase 'F'
else instance isCharTypeUpperG :: IsCharType (AlphabetUppercase "G") where
  reflectCharType _ = AlphabetUppercase 'G'
else instance isCharTypeUpperH :: IsCharType (AlphabetUppercase "H") where
  reflectCharType _ = AlphabetUppercase 'H'
else instance isCharTypeUpperI :: IsCharType (AlphabetUppercase "I") where
  reflectCharType _ = AlphabetUppercase 'I'
else instance isCharTypeUpperJ :: IsCharType (AlphabetUppercase "J") where
  reflectCharType _ = AlphabetUppercase 'J'
else instance isCharTypeUpperK :: IsCharType (AlphabetUppercase "K") where
  reflectCharType _ = AlphabetUppercase 'K'
else instance isCharTypeUpperL :: IsCharType (AlphabetUppercase "L") where
  reflectCharType _ = AlphabetUppercase 'L'
else instance isCharTypeUpperM :: IsCharType (AlphabetUppercase "M") where
  reflectCharType _ = AlphabetUppercase 'M'
else instance isCharTypeUpperN :: IsCharType (AlphabetUppercase "N") where
  reflectCharType _ = AlphabetUppercase 'N'
else instance isCharTypeUpperO :: IsCharType (AlphabetUppercase "O") where
  reflectCharType _ = AlphabetUppercase 'O'
else instance isCharTypeUpperP :: IsCharType (AlphabetUppercase "P") where
  reflectCharType _ = AlphabetUppercase 'P'
else instance isCharTypeUpperQ :: IsCharType (AlphabetUppercase "Q") where
  reflectCharType _ = AlphabetUppercase 'Q'
else instance isCharTypeUpperR :: IsCharType (AlphabetUppercase "R") where
  reflectCharType _ = AlphabetUppercase 'R'
else instance isCharTypeUpperS :: IsCharType (AlphabetUppercase "S") where
  reflectCharType _ = AlphabetUppercase 'S'
else instance isCharTypeUpperT :: IsCharType (AlphabetUppercase "T") where
  reflectCharType _ = AlphabetUppercase 'T'
else instance isCharTypeUpperU :: IsCharType (AlphabetUppercase "U") where
  reflectCharType _ = AlphabetUppercase 'U'
else instance isCharTypeUpperV :: IsCharType (AlphabetUppercase "V") where
  reflectCharType _ = AlphabetUppercase 'V'
else instance isCharTypeUpperW :: IsCharType (AlphabetUppercase "W") where
  reflectCharType _ = AlphabetUppercase 'W'
else instance isCharTypeUpperX :: IsCharType (AlphabetUppercase "X") where
  reflectCharType _ = AlphabetUppercase 'X'
else instance isCharTypeUpperY :: IsCharType (AlphabetUppercase "Y") where
  reflectCharType _ = AlphabetUppercase 'Y'
else instance isCharTypeUpperZ :: IsCharType (AlphabetUppercase "Z") where
  reflectCharType _ = AlphabetUppercase 'Z'
else instance isCharTypeLowerA :: IsCharType (AlphabetLowercase "a") where
  reflectCharType _ = AlphabetLowercase 'a'
else instance isCharTypeLowerB :: IsCharType (AlphabetLowercase "b") where
  reflectCharType _ = AlphabetLowercase 'b'
else instance isCharTypeLowerC :: IsCharType (AlphabetLowercase "c") where
  reflectCharType _ = AlphabetLowercase 'c'
else instance isCharTypeLowerD :: IsCharType (AlphabetLowercase "d") where
  reflectCharType _ = AlphabetLowercase 'd'
else instance isCharTypeLowerE :: IsCharType (AlphabetLowercase "e") where
  reflectCharType _ = AlphabetLowercase 'e'
else instance isCharTypeLowerF :: IsCharType (AlphabetLowercase "f") where
  reflectCharType _ = AlphabetLowercase 'f'
else instance isCharTypeLowerG :: IsCharType (AlphabetLowercase "g") where
  reflectCharType _ = AlphabetLowercase 'g'
else instance isCharTypeLowerH :: IsCharType (AlphabetLowercase "h") where
  reflectCharType _ = AlphabetLowercase 'h'
else instance isCharTypeLowerI :: IsCharType (AlphabetLowercase "i") where
  reflectCharType _ = AlphabetLowercase 'i'
else instance isCharTypeLowerJ :: IsCharType (AlphabetLowercase "j") where
  reflectCharType _ = AlphabetLowercase 'j'
else instance isCharTypeLowerK :: IsCharType (AlphabetLowercase "k") where
  reflectCharType _ = AlphabetLowercase 'k'
else instance isCharTypeLowerL :: IsCharType (AlphabetLowercase "l") where
  reflectCharType _ = AlphabetLowercase 'l'
else instance isCharTypeLowerM :: IsCharType (AlphabetLowercase "m") where
  reflectCharType _ = AlphabetLowercase 'm'
else instance isCharTypeLowerN :: IsCharType (AlphabetLowercase "n") where
  reflectCharType _ = AlphabetLowercase 'n'
else instance isCharTypeLowerO :: IsCharType (AlphabetLowercase "o") where
  reflectCharType _ = AlphabetLowercase 'o'
else instance isCharTypeLowerP :: IsCharType (AlphabetLowercase "p") where
  reflectCharType _ = AlphabetLowercase 'p'
else instance isCharTypeLowerQ :: IsCharType (AlphabetLowercase "q") where
  reflectCharType _ = AlphabetLowercase 'q'
else instance isCharTypeLowerR :: IsCharType (AlphabetLowercase "r") where
  reflectCharType _ = AlphabetLowercase 'r'
else instance isCharTypeLowerS :: IsCharType (AlphabetLowercase "s") where
  reflectCharType _ = AlphabetLowercase 's'
else instance isCharTypeLowerT :: IsCharType (AlphabetLowercase "t") where
  reflectCharType _ = AlphabetLowercase 't'
else instance isCharTypeLowerU :: IsCharType (AlphabetLowercase "u") where
  reflectCharType _ = AlphabetLowercase 'u'
else instance isCharTypeLowerV :: IsCharType (AlphabetLowercase "v") where
  reflectCharType _ = AlphabetLowercase 'v'
else instance isCharTypeLowerW :: IsCharType (AlphabetLowercase "w") where
  reflectCharType _ = AlphabetLowercase 'w'
else instance isCharTypeLowerX :: IsCharType (AlphabetLowercase "x") where
  reflectCharType _ = AlphabetLowercase 'x'
else instance isCharTypeLowerY :: IsCharType (AlphabetLowercase "y") where
  reflectCharType _ = AlphabetLowercase 'y'
else instance isCharTypeLowerZ :: IsCharType (AlphabetLowercase "z") where
  reflectCharType _ = AlphabetLowercase 'z'
else instance isCharType0 :: IsCharType (Digit "0") where
  reflectCharType _ = Digit '0'
else instance isCharType1 :: IsCharType (Digit "1") where
  reflectCharType _ = Digit '1'
else instance isCharType2 :: IsCharType (Digit "2") where
  reflectCharType _ = Digit '2'
else instance isCharType3 :: IsCharType (Digit "3") where
  reflectCharType _ = Digit '3'
else instance isCharType4 :: IsCharType (Digit "4") where
  reflectCharType _ = Digit '4'
else instance isCharType5 :: IsCharType (Digit "5") where
  reflectCharType _ = Digit '5'
else instance isCharType6 :: IsCharType (Digit "6") where
  reflectCharType _ = Digit '6'
else instance isCharType7 :: IsCharType (Digit "7") where
  reflectCharType _ = Digit '7'
else instance isCharType8 :: IsCharType (Digit "8") where
  reflectCharType _ = Digit '8'
else instance isCharType9 :: IsCharType (Digit "9") where
  reflectCharType _ = Digit '9'
else instance isCharTypeOther :: (IsSymbol symbol) => IsCharType (Other symbol) where
  reflectCharType _ = Other (reflectSymbol (Proxy :: Proxy symbol))

reifyCharType :: forall (r :: Type). CharType -> (forall (charType :: CharType). IsCharType charType => Proxy charType -> r) -> r
reifyCharType charType f = case charType of
  AlphabetUppercase 'A' -> f (Proxy :: Proxy (AlphabetUppercase "A"))
  AlphabetUppercase 'B' -> f (Proxy :: Proxy (AlphabetUppercase "B"))
  AlphabetUppercase 'C' -> f (Proxy :: Proxy (AlphabetUppercase "C"))
  AlphabetUppercase 'D' -> f (Proxy :: Proxy (AlphabetUppercase "D"))
  AlphabetUppercase 'E' -> f (Proxy :: Proxy (AlphabetUppercase "E"))
  AlphabetUppercase 'F' -> f (Proxy :: Proxy (AlphabetUppercase "F"))
  AlphabetUppercase 'G' -> f (Proxy :: Proxy (AlphabetUppercase "G"))
  AlphabetUppercase 'H' -> f (Proxy :: Proxy (AlphabetUppercase "H"))
  AlphabetUppercase 'I' -> f (Proxy :: Proxy (AlphabetUppercase "I"))
  AlphabetUppercase 'J' -> f (Proxy :: Proxy (AlphabetUppercase "J"))
  AlphabetUppercase 'K' -> f (Proxy :: Proxy (AlphabetUppercase "K"))
  AlphabetUppercase 'L' -> f (Proxy :: Proxy (AlphabetUppercase "L"))
  AlphabetUppercase 'M' -> f (Proxy :: Proxy (AlphabetUppercase "M"))
  AlphabetUppercase 'N' -> f (Proxy :: Proxy (AlphabetUppercase "N"))
  AlphabetUppercase 'O' -> f (Proxy :: Proxy (AlphabetUppercase "O"))
  AlphabetUppercase 'P' -> f (Proxy :: Proxy (AlphabetUppercase "P"))
  AlphabetUppercase 'Q' -> f (Proxy :: Proxy (AlphabetUppercase "Q"))
  AlphabetUppercase 'R' -> f (Proxy :: Proxy (AlphabetUppercase "R"))
  AlphabetUppercase 'S' -> f (Proxy :: Proxy (AlphabetUppercase "S"))
  AlphabetUppercase 'T' -> f (Proxy :: Proxy (AlphabetUppercase "T"))
  AlphabetUppercase 'U' -> f (Proxy :: Proxy (AlphabetUppercase "U"))
  AlphabetUppercase 'V' -> f (Proxy :: Proxy (AlphabetUppercase "V"))
  AlphabetUppercase 'W' -> f (Proxy :: Proxy (AlphabetUppercase "W"))
  AlphabetUppercase 'X' -> f (Proxy :: Proxy (AlphabetUppercase "X"))
  AlphabetUppercase 'Y' -> f (Proxy :: Proxy (AlphabetUppercase "Y"))
  AlphabetUppercase 'Z' -> f (Proxy :: Proxy (AlphabetUppercase "Z"))
  AlphabetUppercase char ->
    reifySymbol
      (String.fromCodePointArray [ String.codePointFromChar char ])
      (reifyCharTypeOther f)
  AlphabetLowercase 'a' -> f (Proxy :: Proxy (AlphabetLowercase "a"))
  AlphabetLowercase 'b' -> f (Proxy :: Proxy (AlphabetLowercase "b"))
  AlphabetLowercase 'c' -> f (Proxy :: Proxy (AlphabetLowercase "c"))
  AlphabetLowercase 'd' -> f (Proxy :: Proxy (AlphabetLowercase "d"))
  AlphabetLowercase 'e' -> f (Proxy :: Proxy (AlphabetLowercase "e"))
  AlphabetLowercase 'f' -> f (Proxy :: Proxy (AlphabetLowercase "f"))
  AlphabetLowercase 'g' -> f (Proxy :: Proxy (AlphabetLowercase "g"))
  AlphabetLowercase 'h' -> f (Proxy :: Proxy (AlphabetLowercase "h"))
  AlphabetLowercase 'i' -> f (Proxy :: Proxy (AlphabetLowercase "i"))
  AlphabetLowercase 'j' -> f (Proxy :: Proxy (AlphabetLowercase "j"))
  AlphabetLowercase 'k' -> f (Proxy :: Proxy (AlphabetLowercase "k"))
  AlphabetLowercase 'l' -> f (Proxy :: Proxy (AlphabetLowercase "l"))
  AlphabetLowercase 'm' -> f (Proxy :: Proxy (AlphabetLowercase "m"))
  AlphabetLowercase 'n' -> f (Proxy :: Proxy (AlphabetLowercase "n"))
  AlphabetLowercase 'o' -> f (Proxy :: Proxy (AlphabetLowercase "o"))
  AlphabetLowercase 'p' -> f (Proxy :: Proxy (AlphabetLowercase "p"))
  AlphabetLowercase 'q' -> f (Proxy :: Proxy (AlphabetLowercase "q"))
  AlphabetLowercase 'r' -> f (Proxy :: Proxy (AlphabetLowercase "r"))
  AlphabetLowercase 's' -> f (Proxy :: Proxy (AlphabetLowercase "s"))
  AlphabetLowercase 't' -> f (Proxy :: Proxy (AlphabetLowercase "t"))
  AlphabetLowercase 'u' -> f (Proxy :: Proxy (AlphabetLowercase "u"))
  AlphabetLowercase 'v' -> f (Proxy :: Proxy (AlphabetLowercase "v"))
  AlphabetLowercase 'w' -> f (Proxy :: Proxy (AlphabetLowercase "w"))
  AlphabetLowercase 'x' -> f (Proxy :: Proxy (AlphabetLowercase "x"))
  AlphabetLowercase 'y' -> f (Proxy :: Proxy (AlphabetLowercase "y"))
  AlphabetLowercase 'z' -> f (Proxy :: Proxy (AlphabetLowercase "z"))
  AlphabetLowercase char ->
    reifySymbol
      (String.fromCodePointArray [ String.codePointFromChar char ])
      (reifyCharTypeOther f)
  Digit '0' -> f (Proxy :: Proxy (Digit "0"))
  Digit '1' -> f (Proxy :: Proxy (Digit "1"))
  Digit '2' -> f (Proxy :: Proxy (Digit "2"))
  Digit '3' -> f (Proxy :: Proxy (Digit "3"))
  Digit '4' -> f (Proxy :: Proxy (Digit "4"))
  Digit '5' -> f (Proxy :: Proxy (Digit "5"))
  Digit '6' -> f (Proxy :: Proxy (Digit "6"))
  Digit '7' -> f (Proxy :: Proxy (Digit "7"))
  Digit '8' -> f (Proxy :: Proxy (Digit "8"))
  Digit '9' -> f (Proxy :: Proxy (Digit "9"))
  Digit char ->
    reifySymbol
      (String.fromCodePointArray [ String.codePointFromChar char ])
      (reifyCharTypeOther f)
  Other str -> reifySymbol str (reifyCharTypeOther f)

reifyCharTypeOther :: forall (r :: Type) (symbol :: Symbol). (IsSymbol symbol) => (forall (charType :: CharType). IsCharType charType => Proxy charType -> r) -> Proxy symbol -> r
reifyCharTypeOther f _ = f (Proxy :: Proxy (Other symbol))

foreign import data AlphabetUppercase :: Symbol -> CharType

foreign import data AlphabetLowercase :: Symbol -> CharType

foreign import data Digit :: Symbol -> CharType

foreign import data Other :: Symbol -> CharType

class CharSymbolToCharType (charSymbol :: Symbol) (charType :: CharType) | charSymbol -> charType, charType -> charSymbol

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

-- | Symbol を 扱いやすい symbol の文字のリストに変換する
class SymbolToCharTypeList (symbol :: Symbol) (charTypeList :: TList.List' CharType) | symbol -> charTypeList, charTypeList -> symbol

instance symbolToCharTypeListNil :: SymbolToCharTypeList "" TList.Nil'
else instance symbolToCharTypeListCons ::
  ( SymbolToCharTypeList tail tailCharTypeList
  , Symbol.Cons head tail symbol
  , CharSymbolToCharType head headChar
  ) =>
  SymbolToCharTypeList symbol (TList.Cons' headChar tailCharTypeList)

class LowercaseToUppercase (lower :: CharType) (upper :: CharType) | lower -> upper, upper -> lower

instance lowercaseToUppercaseA :: LowercaseToUppercase (AlphabetLowercase "a") (AlphabetUppercase "A")
else instance lowercaseToUppercaseB :: LowercaseToUppercase (AlphabetLowercase "b") (AlphabetUppercase "B")
else instance lowercaseToUppercaseC :: LowercaseToUppercase (AlphabetLowercase "c") (AlphabetUppercase "C")
else instance lowercaseToUppercaseD :: LowercaseToUppercase (AlphabetLowercase "d") (AlphabetUppercase "D")
else instance lowercaseToUppercaseE :: LowercaseToUppercase (AlphabetLowercase "e") (AlphabetUppercase "E")
else instance lowercaseToUppercaseF :: LowercaseToUppercase (AlphabetLowercase "f") (AlphabetUppercase "F")
else instance lowercaseToUppercaseG :: LowercaseToUppercase (AlphabetLowercase "g") (AlphabetUppercase "G")
else instance lowercaseToUppercaseH :: LowercaseToUppercase (AlphabetLowercase "h") (AlphabetUppercase "H")
else instance lowercaseToUppercaseI :: LowercaseToUppercase (AlphabetLowercase "i") (AlphabetUppercase "I")
else instance lowercaseToUppercaseJ :: LowercaseToUppercase (AlphabetLowercase "j") (AlphabetUppercase "J")
else instance lowercaseToUppercaseK :: LowercaseToUppercase (AlphabetLowercase "k") (AlphabetUppercase "K")
else instance lowercaseToUppercaseL :: LowercaseToUppercase (AlphabetLowercase "l") (AlphabetUppercase "L")
else instance lowercaseToUppercaseM :: LowercaseToUppercase (AlphabetLowercase "m") (AlphabetUppercase "M")
else instance lowercaseToUppercaseN :: LowercaseToUppercase (AlphabetLowercase "n") (AlphabetUppercase "N")
else instance lowercaseToUppercaseO :: LowercaseToUppercase (AlphabetLowercase "o") (AlphabetUppercase "O")
else instance lowercaseToUppercaseP :: LowercaseToUppercase (AlphabetLowercase "p") (AlphabetUppercase "P")
else instance lowercaseToUppercaseQ :: LowercaseToUppercase (AlphabetLowercase "q") (AlphabetUppercase "Q")
else instance lowercaseToUppercaseR :: LowercaseToUppercase (AlphabetLowercase "r") (AlphabetUppercase "R")
else instance lowercaseToUppercaseS :: LowercaseToUppercase (AlphabetLowercase "s") (AlphabetUppercase "S")
else instance lowercaseToUppercaseT :: LowercaseToUppercase (AlphabetLowercase "t") (AlphabetUppercase "T")
else instance lowercaseToUppercaseU :: LowercaseToUppercase (AlphabetLowercase "u") (AlphabetUppercase "U")
else instance lowercaseToUppercaseV :: LowercaseToUppercase (AlphabetLowercase "v") (AlphabetUppercase "V")
else instance lowercaseToUppercaseW :: LowercaseToUppercase (AlphabetLowercase "w") (AlphabetUppercase "W")
else instance lowercaseToUppercaseX :: LowercaseToUppercase (AlphabetLowercase "x") (AlphabetUppercase "X")
else instance lowercaseToUppercaseY :: LowercaseToUppercase (AlphabetLowercase "y") (AlphabetUppercase "Y")
else instance lowercaseToUppercaseZ :: LowercaseToUppercase (AlphabetLowercase "z") (AlphabetUppercase "Z")
else instance lowercaseToUppercaseOther :: LowercaseToUppercase charType charType

class CharTypeListLowercaseToUppercase (lower :: TList.List' CharType) (upper :: TList.List' CharType) | lower -> upper, upper -> lower

instance charTypeListLowercaseToUppercaseNil :: CharTypeListLowercaseToUppercase TList.Nil' TList.Nil'

instance charTypeListLowercaseToUppercaseCons ::
  ( LowercaseToUppercase lowerHead upperHead
  , CharTypeListLowercaseToUppercase lowerTail upperTail
  ) =>
  CharTypeListLowercaseToUppercase (TList.Cons' lowerHead lowerTail) (TList.Cons' upperHead upperTail)
