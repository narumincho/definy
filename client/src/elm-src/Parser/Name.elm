module Parser.Name exposing
    ( ParserResult(..)
    , parse
    )

import Data.Label as Label
import Parser.SimpleChar as SimpleChar exposing (SimpleChar(..), Symbol(..))


type ParserResult
    = NameEnd (Maybe Label.Label) (List ( Char, Bool ))
    | NameToType (Maybe Label.Label) (List SimpleChar)
    | NameToExpr (Maybe Label.Label) (List SimpleChar)



-- TODO いずれNameToNextDefをつくる


{-| List SimpleCharを名前として解析
-}
parse : List SimpleChar -> ParserResult
parse list =
    case list of
        [] ->
            NameEnd Nothing []

        ASpace :: others ->
            parse others

        (ASymbol LowLine _) :: others ->
            parse others

        (ASymbol Colon _) :: others ->
            NameToType Nothing others

        (ASymbol EqualsSign _) :: others ->
            NameToExpr Nothing others

        (ASymbol _ _) :: others ->
            parse others

        (ACapitalLetter letter char) :: others ->
            inName
                (Just (SimpleChar.letterToLabel letter))
                others
                False
                [ ( char, True ) ]

        (ASmallLetter letter char) :: others ->
            inName
                (Just (SimpleChar.letterToLabel letter))
                others
                False
                [ ( char, True ) ]

        (ANumber num char) :: others ->
            inName
                Nothing
                others
                False
                [ ( char, False ) ]

        (AChar char) :: others ->
            inName
                Nothing
                others
                False
                [ ( char, False ) ]



-- 名前の中 na|me


inName : Maybe Label.Label -> List SimpleChar -> Bool -> List ( Char, Bool ) -> ParserResult
inName label rest capital textAreaValue =
    case rest of
        ASpace :: others ->
            inName label others True textAreaValue

        (ASymbol LowLine _) :: others ->
            inName label others True textAreaValue

        (ASymbol Colon _) :: others ->
            NameToType label others

        (ASymbol EqualsSign _) :: others ->
            NameToExpr label others

        (ASymbol _ char) :: others ->
            inName
                label
                others
                False
                (textAreaValue ++ [ ( char, False ) ])

        (ACapitalLetter letter char) :: others ->
            inName
                (Just (SimpleChar.labelPushCapitalLetter letter label))
                others
                False
                (textAreaValue ++ [ ( char, True ) ])

        (ASmallLetter letter char) :: others ->
            let
                newLabel =
                    if capital then
                        SimpleChar.labelPushCapitalLetter letter label

                    else
                        SimpleChar.labelPushSmallLetter letter label

                newChar =
                    if capital then
                        Char.toUpper char

                    else
                        char
            in
            inName
                (Just newLabel)
                others
                False
                (textAreaValue
                    ++ [ ( newChar, True ) ]
                )

        (ANumber num char) :: others ->
            inName
                (SimpleChar.labelPushNumber num label)
                others
                False
                (textAreaValue
                    ++ [ ( char, label /= Nothing ) ]
                )

        (AChar char) :: others ->
            inName
                label
                others
                False
                (textAreaValue ++ [ ( char, False ) ])

        [] ->
            NameEnd label textAreaValue
