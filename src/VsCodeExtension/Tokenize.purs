module VsCodeExtension.Tokenize
  ( Token(..)
  , TokenWithRange(..)
  , tokenize
  ) where

import Prelude
import Data.Array as Array
import Data.Array.NonEmpty (NonEmptyArray)
import Data.Array.NonEmpty as NonEmptyArray
import Data.Generic.Rep as GenericRep
import Data.Maybe (Maybe(..))
import Data.Show.Generic as ShowGeneric
import Data.String as String
import Data.String.CodeUnits as CodeUnits
import Data.String.NonEmpty (NonEmptyString)
import Data.String.NonEmpty.CodeUnits as NonEmptyCodeUnits
import Data.Tuple as Tuple
import Data.UInt as UInt
import VsCodeExtension.Range as Range

newtype TokenWithRange
  = TokenWithRange
  { range :: Range.Range
  , token :: Token
  }

derive instance tokenWithRangeEq :: Eq TokenWithRange

derive instance tokenWithRangeGeneric :: GenericRep.Generic TokenWithRange _

instance tokenWithRangeShow :: Show TokenWithRange where
  show = ShowGeneric.genericShow

data Token
  = Name NonEmptyString
  | ParenthesisStart
  | ParenthesisEnd
  | Comma

derive instance tokenEq :: Eq Token

derive instance tokenGeneric :: GenericRep.Generic Token _

instance tokenShow :: Show Token where
  show = ShowGeneric.genericShow

newtype State
  = State { target :: Char, rest :: Array Char, range :: Range.Range }

tokenize :: String -> Array TokenWithRange
tokenize str =
  ( Array.foldl
        ( \{ positionLine, resultList } line ->
            { positionLine: add positionLine (UInt.fromInt 1)
            , resultList: append resultList (tokenizeInLine { positionLine, line })
            }
        )
        { positionLine: UInt.fromInt 0, resultList: [] }
        (stringToLineList str)
    )
    .resultList

stringToLineList :: String -> Array String
stringToLineList str =
  String.split (String.Pattern "\n")
    ( String.replaceAll (String.Pattern "\r") (String.Replacement "\n")
        ( ( String.replaceAll (String.Pattern "\r\n") (String.Replacement "\n")
              str
          )
        )
    )

tokenizeInLine :: { line :: String, positionLine :: UInt.UInt } -> Array TokenWithRange
tokenizeInLine { line, positionLine } =
  let
    lineAsCharList :: Array Char
    lineAsCharList = CodeUnits.toCharArray line

    resultAndState =
      Array.foldl
        ( \{ positionCharacter, readState, result } char ->
            let
              newPositionCharacter = add positionCharacter (UInt.fromInt 1)
            in
              case tokenizeLoop
                  { position:
                      Range.Position { line: positionLine, character: positionCharacter }
                  , readState
                  , targetRight: char
                  } of
                Zero ->
                  { positionCharacter: newPositionCharacter
                  , readState: Ended
                  , result
                  }
                One tokenWithRange ->
                  { positionCharacter: newPositionCharacter
                  , readState: Ended
                  , result: Array.snoc result tokenWithRange
                  }
                Two (Tuple.Tuple a b) ->
                  { positionCharacter: newPositionCharacter
                  , readState: Ended
                  , result: append result [ a, b ]
                  }
                AddName ->
                  { positionCharacter: newPositionCharacter
                  , readState:
                      case readState of
                        BeforeName rec ->
                          BeforeName
                            ( rec
                                { charList =
                                  NonEmptyArray.snoc rec.charList char
                                }
                            )
                        Ended ->
                          BeforeName
                            { startPosition:
                                Range.Position
                                  { line: positionLine
                                  , character: positionCharacter
                                  }
                            , charList: NonEmptyArray.singleton char
                            }
                  , result: result
                  }
        )
        { positionCharacter: UInt.fromInt 0, readState: Ended, result: [] }
        lineAsCharList
  in
    case resultAndState.readState of
      BeforeName { startPosition, charList } ->
        Array.snoc resultAndState.result
          ( TokenWithRange
              { range:
                  Range.Range
                    { start: startPosition
                    , end:
                        Range.Position
                          { line: positionLine
                          , character: UInt.fromInt (Array.length lineAsCharList)
                          }
                    }
              , token: Name (NonEmptyCodeUnits.fromNonEmptyCharArray charList)
              }
          )
      Ended -> resultAndState.result

data ReadState
  = BeforeName { startPosition :: Range.Position, charList :: NonEmptyArray Char }
  | Ended

data TokenLoopResult
  = Zero
  | One TokenWithRange
  | Two (Tuple.Tuple TokenWithRange TokenWithRange)
  | AddName

tokenizeLoop ::
  { readState :: ReadState
  , targetRight :: Char
  , position :: Range.Position
  } ->
  TokenLoopResult
tokenizeLoop { targetRight, readState, position } = case charIsEnd targetRight of
  End -> case getLeftToken readState position of
    Just tokenWithRange -> One tokenWithRange
    Nothing -> Zero
  EndWithToken token -> case getLeftToken readState position of
    Just tokenWithRange ->
      Two
        ( Tuple.Tuple
            tokenWithRange
            ( TokenWithRange
                { range:
                    Range.Range
                      { start: position
                      , end: Range.positionAdd1Character position
                      }
                , token
                }
            )
        )
    Nothing ->
      One
        ( TokenWithRange
            { range:
                Range.Range
                  { start: position
                  , end: Range.positionAdd1Character position
                  }
            , token
            }
        )
  NotEnd -> AddName

-- | 右の文字が終了文字だと仮定して得られた, 左側の文字
getLeftToken :: ReadState -> Range.Position -> Maybe TokenWithRange
getLeftToken readState endPosition = case readState of
  BeforeName { charList, startPosition } ->
    Just
      ( TokenWithRange
          { range: Range.Range { start: startPosition, end: endPosition }
          , token: Name (NonEmptyCodeUnits.fromNonEmptyCharArray charList)
          }
      )
  Ended -> Nothing

data CharIsEndResult
  = End
  | EndWithToken Token
  | NotEnd

charIsEnd :: Char -> CharIsEndResult
charIsEnd = case _ of
  '(' -> EndWithToken ParenthesisStart
  '（' -> EndWithToken ParenthesisStart
  ')' -> EndWithToken ParenthesisEnd
  '）' -> EndWithToken ParenthesisEnd
  ',' -> EndWithToken Comma
  '\xFF0C' -> EndWithToken Comma
  '\x3001' -> EndWithToken Comma
  '\xFE50' -> EndWithToken Comma
  '\xFE51' -> EndWithToken Comma
  '\xFF64' -> EndWithToken Comma
  '\x0326' -> EndWithToken Comma
  ' ' -> End
  '\x00A0' -> End
  '\x1680' -> End
  '\x2000' -> End
  '\x2001' -> End
  '\x2002' -> End
  '\x2003' -> End
  '\x2004' -> End
  '\x2005' -> End
  '\x2006' -> End
  '\x2007' -> End
  '\x2008' -> End
  '\x2009' -> End
  '\x200A' -> End
  '\x202F' -> End
  '\x205F' -> End
  '\x3000' -> End
  '\t' -> End
  _ -> NotEnd
