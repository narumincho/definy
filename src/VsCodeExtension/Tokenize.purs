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
import Data.String.NonEmpty as NonEmptyString
import Data.String.NonEmpty.CodeUnits as NonEmptyCodeUnits
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
  = Name String
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

    resultAndState ::
      { positionCharacter :: UInt.UInt
      , readState :: ReadState
      , result :: Array TokenWithRange
      }
    resultAndState =
      Array.foldl
        ( \{ positionCharacter, readState, result } char ->
            let
              (TokenLoopResult loopResult) =
                tokenizeLoop
                  { position:
                      Range.Position { line: positionLine, character: positionCharacter }
                  , readState
                  , targetRight: char
                  }
            in
              { positionCharacter: add positionCharacter (UInt.fromInt 1)
              , readState: loopResult.nextState
              , result: append result loopResult.newTokenList
              }
        )
        { positionCharacter: UInt.fromInt 0, readState: None, result: [] }
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
              , token:
                  Name
                    ( NonEmptyString.toString
                        (NonEmptyCodeUnits.fromNonEmptyCharArray charList)
                    )
              }
          )
      BeforeQuote { startPosition, charList } ->
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
              , token: Name (CodeUnits.fromCharArray charList)
              }
          )
      None -> resultAndState.result

data ReadState
  = BeforeName { startPosition :: Range.Position, charList :: NonEmptyArray Char }
  | BeforeQuote { startPosition :: Range.Position, charList :: Array Char }
  | None

newtype TokenLoopResult
  = TokenLoopResult
  { newTokenList :: Array TokenWithRange
  , nextState :: ReadState
  }

tokenizeLoop ::
  { readState :: ReadState
  , targetRight :: Char
  , position :: Range.Position
  } ->
  TokenLoopResult
tokenizeLoop { targetRight, readState, position } = case readState of
  BeforeName { startPosition, charList } ->
    tokenizeLoopInBeforeName
      { targetRight, position, startPosition, charList }
  BeforeQuote { startPosition, charList } ->
    tokenizeLoopInBeforeQuote
      { targetRight, position, startPosition, charList }
  None -> tokenizeLoopInNone { targetRight, position }

tokenizeLoopInBeforeName ::
  { targetRight :: Char
  , position :: Range.Position
  , startPosition :: Range.Position
  , charList :: NonEmptyArray Char
  } ->
  TokenLoopResult
tokenizeLoopInBeforeName rec = case charToCharTypeMaybe rec.targetRight of
  Just charType ->
    let
      nameTokenWithRange :: TokenWithRange
      nameTokenWithRange =
        TokenWithRange
          { range: Range.Range { start: rec.startPosition, end: rec.position }
          , token:
              Name
                ( NonEmptyString.toString
                    (NonEmptyCodeUnits.fromNonEmptyCharArray rec.charList)
                )
          }
    in
      case charType of
        CharTypeParenthesisStart ->
          TokenLoopResult
            { newTokenList:
                [ nameTokenWithRange
                , TokenWithRange
                    { range:
                        Range.Range
                          { start: rec.position
                          , end: Range.positionAdd1Character rec.position
                          }
                    , token: ParenthesisStart
                    }
                ]
            , nextState: None
            }
        CharTypeParenthesisEnd ->
          TokenLoopResult
            { newTokenList:
                [ nameTokenWithRange
                , TokenWithRange
                    { range:
                        Range.Range
                          { start: rec.position
                          , end: Range.positionAdd1Character rec.position
                          }
                    , token: ParenthesisEnd
                    }
                ]
            , nextState: None
            }
        CharTypeSpace ->
          TokenLoopResult
            { newTokenList: [ nameTokenWithRange ]
            , nextState: None
            }
        CharTypeComma ->
          TokenLoopResult
            { newTokenList:
                [ nameTokenWithRange
                , TokenWithRange
                    { range:
                        Range.Range
                          { start: rec.position
                          , end: Range.positionAdd1Character rec.position
                          }
                    , token: Comma
                    }
                ]
            , nextState: None
            }
        CharTypeQuote ->
          TokenLoopResult
            { newTokenList: [ nameTokenWithRange ]
            , nextState: BeforeQuote { startPosition: rec.position, charList: [] }
            }
  Nothing ->
    TokenLoopResult
      { newTokenList: []
      , nextState:
          BeforeName
            { startPosition: rec.startPosition
            , charList: NonEmptyArray.snoc rec.charList rec.targetRight
            }
      }

tokenizeLoopInBeforeQuote ::
  { targetRight :: Char
  , position :: Range.Position
  , startPosition :: Range.Position
  , charList :: Array Char
  } ->
  TokenLoopResult
tokenizeLoopInBeforeQuote rec = case charToCharTypeMaybe rec.targetRight of
  Just CharTypeQuote ->
    TokenLoopResult
      { newTokenList:
          [ TokenWithRange
              { range:
                  Range.Range
                    { start: rec.startPosition
                    , end: Range.positionAdd1Character rec.position
                    }
              , token: Name (CodeUnits.fromCharArray rec.charList)
              }
          ]
      , nextState: None
      }
  _ ->
    TokenLoopResult
      { newTokenList: []
      , nextState:
          BeforeQuote
            { startPosition: rec.startPosition
            , charList: Array.snoc rec.charList rec.targetRight
            }
      }

tokenizeLoopInNone ::
  { targetRight :: Char
  , position :: Range.Position
  } ->
  TokenLoopResult
tokenizeLoopInNone rec = case charToCharTypeMaybe rec.targetRight of
  Just CharTypeParenthesisStart ->
    TokenLoopResult
      { newTokenList:
          [ TokenWithRange
              { range:
                  Range.Range
                    { start: rec.position
                    , end: Range.positionAdd1Character rec.position
                    }
              , token: ParenthesisStart
              }
          ]
      , nextState: None
      }
  Just CharTypeParenthesisEnd ->
    TokenLoopResult
      { newTokenList:
          [ TokenWithRange
              { range:
                  Range.Range
                    { start: rec.position
                    , end: Range.positionAdd1Character rec.position
                    }
              , token: ParenthesisEnd
              }
          ]
      , nextState: None
      }
  Just CharTypeSpace ->
    TokenLoopResult
      { newTokenList: [], nextState: None }
  Just CharTypeComma ->
    TokenLoopResult
      { newTokenList:
          [ TokenWithRange
              { range:
                  Range.Range
                    { start: rec.position
                    , end: Range.positionAdd1Character rec.position
                    }
              , token: Comma
              }
          ]
      , nextState: None
      }
  Just CharTypeQuote ->
    TokenLoopResult
      { newTokenList: []
      , nextState: BeforeQuote { startPosition: rec.position, charList: [] }
      }
  Nothing ->
    TokenLoopResult
      { newTokenList: []
      , nextState:
          BeforeName
            { startPosition: rec.position
            , charList: NonEmptyArray.singleton rec.targetRight
            }
      }

data CharIsEndResult
  = End
  | EndWithToken Token
  | NotEnd

data CharType
  = CharTypeParenthesisStart
  | CharTypeParenthesisEnd
  | CharTypeSpace
  | CharTypeComma
  | CharTypeQuote

charToCharTypeMaybe :: Char -> Maybe CharType
charToCharTypeMaybe = case _ of
  '(' -> Just CharTypeParenthesisStart
  '（' -> Just CharTypeParenthesisStart
  ')' -> Just CharTypeParenthesisEnd
  '）' -> Just CharTypeParenthesisEnd
  ',' -> Just CharTypeComma
  '\xFF0C' -> Just CharTypeComma
  '\x3001' -> Just CharTypeComma
  '\xFE50' -> Just CharTypeComma
  '\xFE51' -> Just CharTypeComma
  '\xFF64' -> Just CharTypeComma
  '\x0326' -> Just CharTypeComma
  ' ' -> Just CharTypeSpace
  '\x00A0' -> Just CharTypeSpace
  '\x1680' -> Just CharTypeSpace
  '\x2000' -> Just CharTypeSpace
  '\x2001' -> Just CharTypeSpace
  '\x2002' -> Just CharTypeSpace
  '\x2003' -> Just CharTypeSpace
  '\x2004' -> Just CharTypeSpace
  '\x2005' -> Just CharTypeSpace
  '\x2006' -> Just CharTypeSpace
  '\x2007' -> Just CharTypeSpace
  '\x2008' -> Just CharTypeSpace
  '\x2009' -> Just CharTypeSpace
  '\x200A' -> Just CharTypeSpace
  '\x202F' -> Just CharTypeSpace
  '\x205F' -> Just CharTypeSpace
  '\x3000' -> Just CharTypeSpace
  '\t' -> Just CharTypeSpace
  '"' -> Just CharTypeQuote
  '\'' -> Just CharTypeQuote
  '\x2018' -> Just CharTypeQuote
  '\x2019' -> Just CharTypeQuote
  '\x201C' -> Just CharTypeQuote
  '\x201D' -> Just CharTypeQuote
  '\xff02' -> Just CharTypeQuote
  '\xff07' -> Just CharTypeQuote
  _ -> Nothing
