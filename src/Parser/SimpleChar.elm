module Parser.SimpleChar exposing
    ( AlphabetLetter
    , Number
    , SimpleChar(..)
    , Symbol(..)
    , alphabetToLabelHead
    , fromString
    , labelPushCapitalLetter
    , labelPushNumber
    , labelPushSmallLetter
    , letterCapitalToLabelOther
    , letterSmallToLabelOther
    , letterToLabel
    , listNumberToInt
    , numberToLabelOther
    , trimRight
    )

{-| 解析にUnicodeの文字を扱うと結構たいへんで、シンプルな文字を解析用に用意した
全角や半角の区別をなくし、空白も1つにした
-}

import Project.Label as L


type SimpleChar
    = ASpace -- スペースに近い文字
    | ASymbol Symbol Char -- 記号
    | ACapitalLetter AlphabetLetter Char -- アルファベット大文字
    | ASmallLetter AlphabetLetter Char -- アルファベット小文字
    | ANumber Number Char -- 数字 0123456789
    | AChar Char -- その他の文字


type Symbol
    = ExclamationMark -- !
    | QuotationMark -- "
    | NumberSign -- #
    | DollarSign -- $
    | Ampersand -- &
    | Apostrophe -- '
    | LeftParenthesis -- (
    | RightParenthesis -- )
    | Asterisk -- *
    | PlusSign -- +
    | Comma -- ,
    | HyphenMinus -- -
    | FullStop -- .
    | Solidus -- /
    | Colon -- :
    | LessThanSign -- <
    | EqualsSign -- =
    | GreaterThanSign -- >
    | QuestionMark -- ?
    | CommercialAt -- @
    | LeftSquareBracket -- [
    | ReverseSolidus -- \
    | RightSquareBracket -- ]
    | CircumflexAccent -- ^
    | LowLine -- _
    | GraveAccent -- `
    | LeftCurlyBracket -- {
    | VerticalLine -- |
    | RightCurlyBracket -- }


type AlphabetLetter
    = Aa
    | Ab
    | Ac
    | Ad
    | Ae
    | Af
    | Ag
    | Ah
    | Ai
    | Aj
    | Ak
    | Al
    | Am
    | An
    | Ao
    | Ap
    | Aq
    | Ar
    | As
    | At
    | Au
    | Av
    | Aw
    | Ax
    | Ay
    | Az


type Number
    = N0
    | N1
    | N2
    | N3
    | N4
    | N5
    | N6
    | N7
    | N8
    | N9



-- unicode から 扱いやすいデータにする


fromString : String -> List SimpleChar
fromString string =
    string
        |> String.toList
        |> List.filterMap fromChar


fromChar : Char -> Maybe SimpleChar
fromChar char =
    let
        f =
            String.contains (String.fromChar char)
    in
    if f meaningLessCharString then
        Nothing

    else if f spaceCharString then
        Just ASpace

    else if f "!！" then
        Just (ASymbol ExclamationMark char)

    else if f "\"”" then
        Just (ASymbol QuotationMark char)

    else if f "#＃" then
        Just (ASymbol NumberSign char)

    else if f "$＄" then
        Just (ASymbol DollarSign char)

    else if f "&＆" then
        Just (ASymbol Ampersand char)

    else if f "'’" then
        Just (ASymbol Apostrophe char)

    else if f "(（" then
        Just (ASymbol LeftParenthesis char)

    else if f ")）" then
        Just (ASymbol RightParenthesis char)

    else if f "*＊" then
        Just (ASymbol Asterisk char)

    else if f "+＋" then
        Just (ASymbol PlusSign char)

    else if f ",、，" then
        Just (ASymbol Comma char)

    else if f "-ー" then
        Just (ASymbol HyphenMinus char)

    else if f ".。．" then
        Just (ASymbol FullStop char)

    else if f "/・／" then
        Just (ASymbol Solidus char)

    else if f ":：;；" then
        Just (ASymbol Colon char)

    else if f "<＜" then
        Just (ASymbol LessThanSign char)

    else if f "=＝" then
        Just (ASymbol EqualsSign char)

    else if f ">＞" then
        Just (ASymbol GreaterThanSign char)

    else if f "?？" then
        Just (ASymbol QuestionMark char)

    else if f "@＠" then
        Just (ASymbol CommercialAt char)

    else if f "[「［" then
        Just (ASymbol LeftSquareBracket char)

    else if f "\\￥" then
        Just (ASymbol ReverseSolidus char)

    else if f "]」］" then
        Just (ASymbol RightSquareBracket char)

    else if f "^＾" then
        Just (ASymbol CircumflexAccent char)

    else if f "_＿" then
        Just (ASymbol LowLine char)

    else if f "`‘" then
        Just (ASymbol GraveAccent char)

    else if f "{｛" then
        Just (ASymbol LeftCurlyBracket char)

    else if f "|｜" then
        Just (ASymbol VerticalLine char)

    else if f "}｝" then
        Just (ASymbol RightCurlyBracket char)

    else if f "aａ" then
        Just (ASmallLetter Aa char)

    else if f "bｂ" then
        Just (ASmallLetter Ab char)

    else if f "cｃ" then
        Just (ASmallLetter Ac char)

    else if f "dｄ" then
        Just (ASmallLetter Ad char)

    else if f "eｅ" then
        Just (ASmallLetter Ae char)

    else if f "fｆ" then
        Just (ASmallLetter Af char)

    else if f "gｇ" then
        Just (ASmallLetter Ag char)

    else if f "hｈ" then
        Just (ASmallLetter Ah char)

    else if f "iｉ" then
        Just (ASmallLetter Ai char)

    else if f "jｊ" then
        Just (ASmallLetter Aj char)

    else if f "kｋ" then
        Just (ASmallLetter Ak char)

    else if f "lｌ" then
        Just (ASmallLetter Al char)

    else if f "mｍ" then
        Just (ASmallLetter Am char)

    else if f "nｎ" then
        Just (ASmallLetter An char)

    else if f "oｏ" then
        Just (ASmallLetter Ao char)

    else if f "pｐ" then
        Just (ASmallLetter Ap char)

    else if f "qｑ" then
        Just (ASmallLetter Aq char)

    else if f "rｒ" then
        Just (ASmallLetter Ar char)

    else if f "sｓ" then
        Just (ASmallLetter As char)

    else if f "tｔ" then
        Just (ASmallLetter At char)

    else if f "uｕ" then
        Just (ASmallLetter Au char)

    else if f "vｖ" then
        Just (ASmallLetter Av char)

    else if f "wｗ" then
        Just (ASmallLetter Aw char)

    else if f "xｘ" then
        Just (ASmallLetter Ax char)

    else if f "yｙ" then
        Just (ASmallLetter Ay char)

    else if f "zｚ" then
        Just (ASmallLetter Az char)

    else if f "AＡ" then
        Just (ACapitalLetter Aa char)

    else if f "BＢ" then
        Just (ACapitalLetter Ab char)

    else if f "CＣ" then
        Just (ACapitalLetter Ac char)

    else if f "DＤ" then
        Just (ACapitalLetter Ad char)

    else if f "EＥ" then
        Just (ACapitalLetter Ae char)

    else if f "FＦ" then
        Just (ACapitalLetter Af char)

    else if f "GＧ" then
        Just (ACapitalLetter Ag char)

    else if f "HＨ" then
        Just (ACapitalLetter Ah char)

    else if f "IＩ" then
        Just (ACapitalLetter Ai char)

    else if f "JＪ" then
        Just (ACapitalLetter Aj char)

    else if f "KＫ" then
        Just (ACapitalLetter Ak char)

    else if f "LＬ" then
        Just (ACapitalLetter Al char)

    else if f "MＭ" then
        Just (ACapitalLetter Am char)

    else if f "NＮ" then
        Just (ACapitalLetter An char)

    else if f "OＯ" then
        Just (ACapitalLetter Ao char)

    else if f "PＰ" then
        Just (ACapitalLetter Ap char)

    else if f "QＱ" then
        Just (ACapitalLetter Aq char)

    else if f "RＲ" then
        Just (ACapitalLetter Ar char)

    else if f "SＳ" then
        Just (ACapitalLetter As char)

    else if f "TＴ" then
        Just (ACapitalLetter At char)

    else if f "UＵ" then
        Just (ACapitalLetter Au char)

    else if f "VＶ" then
        Just (ACapitalLetter Av char)

    else if f "WＷ" then
        Just (ACapitalLetter Aw char)

    else if f "XＸ" then
        Just (ACapitalLetter Ax char)

    else if f "YＹ" then
        Just (ACapitalLetter Ay char)

    else if f "ZＺ" then
        Just (ACapitalLetter Az char)

    else if f "0０" then
        Just (ANumber N0 char)

    else if f "1１" then
        Just (ANumber N1 char)

    else if f "2２" then
        Just (ANumber N2 char)

    else if f "3３" then
        Just (ANumber N3 char)

    else if f "4４" then
        Just (ANumber N4 char)

    else if f "5５" then
        Just (ANumber N5 char)

    else if f "6６" then
        Just (ANumber N6 char)

    else if f "7７" then
        Just (ANumber N7 char)

    else if f "8８" then
        Just (ANumber N8 char)

    else if f "9９" then
        Just (ANumber N9 char)

    else
        Just (AChar char)



-- 実質意味のない空白っぽい文字


meaningLessCharString : String
meaningLessCharString =
    String.concat
        [ "\u{000B}" -- VERTICAL TABULATION
        , "\u{000C}" -- FORM FEED
        , "\u{000D}" -- CARRIAGE RETURN
        , "\u{001C}" -- FILE SEPARATOR
        , "\u{001D}" -- GROUP SEPARATOR
        , "\u{001E}" -- RECORD SEPARATOR
        , "\u{001F}" -- UNIT SEPARATOR
        , "\u{00A0}" -- NO-BREAK SPACE
        , "\u{1680}" -- OGHAM SPACE MARK
        , "\u{180E}" -- MONGOLIAN VOWEL SEPARATOR
        , "\u{2004}" -- THREE-PER-EM SPACE
        , "\u{2005}" -- FOUR-PER-EM SPACE
        , "\u{2006}" -- SIX-PER-EM SPACE
        , "\u{2007}" -- FIGURE SPACE
        , "\u{2008}" -- PUNCTUATION SPACE
        , "\u{2009}" -- THIN SPACE
        , "\u{200A}" -- HAIR SPACE
        , "\u{200B}" -- ZERO WIDTH SPACE
        , "\u{205F}" -- MEDIUM MATHEMATICAL SPACE
        , "\u{2060}" -- WORD JOINER
        , "ㅤ" -- HANGUL FILLER
        , "\u{FEFF}" -- ZERO WIDTH NO-BREAK SPACE
        ]


spaceCharString : String
spaceCharString =
    String.concat
        [ "\t" -- CHARACTER TABULATION
        , "\n" -- LINE FEED
        , " " -- SPACE
        , "\u{2000}" -- EN QUAD
        , "\u{2001}" -- EM QUAD
        , "\u{2002}" -- EN SPACE
        , "\u{2003}" -- EM SPACE
        , "\u{3000}" -- IDEOGRAPHIC SPACE
        ]

-- アルファベットをLabelHeadに変換する(大文字小文字は関係ない)


alphabetToLabelHead : AlphabetLetter -> L.Head
alphabetToLabelHead letter =
    case letter of
        Aa ->
            L.ha

        Ab ->
            L.hb

        Ac ->
            L.hc

        Ad ->
            L.hd

        Ae ->
            L.he

        Af ->
            L.hf

        Ag ->
            L.hg

        Ah ->
            L.hh

        Ai ->
            L.hi

        Aj ->
            L.hj

        Ak ->
            L.hk

        Al ->
            L.hl

        Am ->
            L.hm

        An ->
            L.hn

        Ao ->
            L.ho

        Ap ->
            L.hp

        Aq ->
            L.hq

        Ar ->
            L.hr

        As ->
            L.hs

        At ->
            L.ht

        Au ->
            L.hu

        Av ->
            L.hv

        Aw ->
            L.hw

        Ax ->
            L.hx

        Ay ->
            L.hy

        Az ->
            L.hz



-- アルファベットを大文字としてLabelOtherに変換する


letterCapitalToLabelOther : AlphabetLetter -> L.Others
letterCapitalToLabelOther letter =
    case letter of
        Aa ->
            L.oA

        Ab ->
            L.oB

        Ac ->
            L.oC

        Ad ->
            L.oD

        Ae ->
            L.oE

        Af ->
            L.oF

        Ag ->
            L.oG

        Ah ->
            L.oH

        Ai ->
            L.oI

        Aj ->
            L.oJ

        Ak ->
            L.oK

        Al ->
            L.oL

        Am ->
            L.oM

        An ->
            L.oN

        Ao ->
            L.oO

        Ap ->
            L.oP

        Aq ->
            L.oQ

        Ar ->
            L.oR

        As ->
            L.oS

        At ->
            L.oT

        Au ->
            L.oU

        Av ->
            L.oV

        Aw ->
            L.oW

        Ax ->
            L.oX

        Ay ->
            L.oY

        Az ->
            L.oZ



-- アルファベットを小文字としてLabelOtherに変換する


letterSmallToLabelOther : AlphabetLetter -> L.Others
letterSmallToLabelOther letter =
    case letter of
        Aa ->
            L.oa

        Ab ->
            L.ob

        Ac ->
            L.oc

        Ad ->
            L.od

        Ae ->
            L.oe

        Af ->
            L.of_

        Ag ->
            L.og

        Ah ->
            L.oh

        Ai ->
            L.oi

        Aj ->
            L.oj

        Ak ->
            L.ok

        Al ->
            L.ol

        Am ->
            L.om

        An ->
            L.on

        Ao ->
            L.oo

        Ap ->
            L.op

        Aq ->
            L.oq

        Ar ->
            L.or

        As ->
            L.os

        At ->
            L.ot

        Au ->
            L.ou

        Av ->
            L.ov

        Aw ->
            L.ow

        Ax ->
            L.ox

        Ay ->
            L.oy

        Az ->
            L.oz



-- 数をLabelOtherに変換する


numberToLabelOther : Number -> L.Others
numberToLabelOther num =
    case num of
        N0 ->
            L.o0

        N1 ->
            L.o1

        N2 ->
            L.o2

        N3 ->
            L.o3

        N4 ->
            L.o4

        N5 ->
            L.o5

        N6 ->
            L.o6

        N7 ->
            L.o7

        N8 ->
            L.o8

        N9 ->
            L.o9


numberToInt : Number -> Int
numberToInt number =
    case number of
        N0 ->
            0

        N1 ->
            1

        N2 ->
            2

        N3 ->
            3

        N4 ->
            4

        N5 ->
            5

        N6 ->
            6

        N7 ->
            7

        N8 ->
            8

        N9 ->
            9


listNumberToInt : List Number -> Int
listNumberToInt =
    List.reverse >> listNumberToIntLoop


listNumberToIntLoop : List Number -> Int
listNumberToIntLoop list =
    case list of
        head :: others ->
            numberToInt head + 10 * listNumberToIntLoop others

        [] ->
            0


letterToLabel : AlphabetLetter -> L.Label
letterToLabel letter =
    L.fromHead (alphabetToLabelHead letter)


{-| ラベルに大文字を追加する
-}
labelPushCapitalLetter : AlphabetLetter -> Maybe L.Label -> L.Label
labelPushCapitalLetter letter mLabel =
    case mLabel of
        Just label ->
            L.push (letterCapitalToLabelOther letter) label

        Nothing ->
            letterToLabel letter


{-| ラベルに小文字を追加する
-}
labelPushSmallLetter : AlphabetLetter -> Maybe L.Label -> L.Label
labelPushSmallLetter letter mLabel =
    case mLabel of
        Just label ->
            L.push (letterSmallToLabelOther letter) label

        Nothing ->
            letterToLabel letter


{-| ラベルに数字を追加する
-}
labelPushNumber : Number -> Maybe L.Label -> Maybe L.Label
labelPushNumber number mLabel =
    case mLabel of
        Just label ->
            Just (L.push (numberToLabelOther number) label)

        Nothing ->
            Nothing


trimRight : List SimpleChar -> List SimpleChar
trimRight =
    List.reverse >> trimLeft >> List.reverse


trimLeft : List SimpleChar -> List SimpleChar
trimLeft list =
    case list of
        ASpace :: rest ->
            trimLeft rest

        noSpaceHeadList ->
            noSpaceHeadList
