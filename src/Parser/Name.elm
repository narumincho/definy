module Parser.Name exposing
    ( ParserResult(..)
    , parse
    )

import Project.Source.Module.Def.Name as Name exposing (Name)
import Project.Label as Label
import Parser.SimpleChar as SimpleChar exposing (SimpleChar(..), Symbol(..))


type ParserResult
    = NameEnd Name (List ( Char, Bool ))
    | NameToType Name (List SimpleChar)
    | NameToExpr Name (List SimpleChar)



-- TODO いずれNameToNextDefをつくる


{-| List SimpleCharを名前として解析
-}
parse : List SimpleChar -> ParserResult
parse list =
    case list of
        [] ->
            NameEnd Name.noName []

        ASpace :: others ->
            parse others

        (ASymbol LowLine _) :: others ->
            parse others

        (ASymbol Colon _) :: others ->
            NameToType Name.noName others

        (ASymbol EqualsSign _) :: others ->
            NameToExpr Name.noName others

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
            NameToType (maybeLabelToName label) others

        (ASymbol EqualsSign _) :: others ->
            NameToExpr (maybeLabelToName label) others

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
            NameEnd (maybeLabelToName label) textAreaValue


maybeLabelToName : Maybe Label.Label -> Name
maybeLabelToName mLabel =
    case mLabel of
        Just label ->
            Name.fromLabel label

        Nothing ->
            Name.noName
