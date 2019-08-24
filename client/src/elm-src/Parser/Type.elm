module Parser.Type exposing
    ( ParserResult(..)
    , parse
    )

import Data.Label as Label
import Data.Project.PartDef as PartDef
import Parser.SimpleChar as SimpleChar exposing (SimpleChar(..))


type ParserResult
    = TypeEnd
        { type_ : PartDef.Type
        , textAreaValue : List ( Char, Bool )
        }
    | TypeToExpr
        { type_ : PartDef.Type
        , rest : List SimpleChar
        }


parse : List SimpleChar -> ParserResult
parse list =
    case list of
        ASpace :: others ->
            parse others

        (ASymbol SimpleChar.EqualsSign char) :: others ->
            TypeToExpr
                { type_ = PartDef.emptyType
                , rest = others
                }

        (ASymbol _ char) :: others ->
            inTypeParser
                Nothing
                others
                [ ( char, False ) ]

        (ACapitalLetter letter char) :: others ->
            inTypeParser
                (Just (Label.fromHead (SimpleChar.alphabetToLabelHead letter)))
                others
                [ ( char, True ) ]

        (ASmallLetter letter char) :: others ->
            inTypeParser
                (Just (Label.fromHead (SimpleChar.alphabetToLabelHead letter)))
                others
                [ ( char, True ) ]

        (ANumber num char) :: others ->
            inTypeParser
                Nothing
                others
                [ ( char, False ) ]

        (AChar char) :: others ->
            inTypeParser
                Nothing
                others
                [ ( char, False ) ]

        [] ->
            TypeEnd
                { type_ = PartDef.emptyType
                , textAreaValue = []
                }



-- 型の中 In|t


inTypeParser : Maybe Label.Label -> List SimpleChar -> List ( Char, Bool ) -> ParserResult
inTypeParser label rest textAreaValue =
    case rest of
        ASpace :: others ->
            inTypeParser label others textAreaValue

        (ASymbol SimpleChar.EqualsSign char) :: others ->
            case label of
                Just l ->
                    TypeToExpr
                        { type_ = PartDef.emptyType -- TODO l から検索をする
                        , rest = others
                        }

                Nothing ->
                    TypeToExpr
                        { type_ = PartDef.emptyType
                        , rest = others
                        }

        (ASymbol _ char) :: others ->
            inTypeParser
                label
                others
                (textAreaValue ++ [ ( char, False ) ])

        (ACapitalLetter letter char) :: others ->
            inTypeParser
                (Just (SimpleChar.labelPushCapitalLetter letter label))
                others
                (textAreaValue ++ [ ( char, True ) ])

        (ASmallLetter letter char) :: others ->
            inTypeParser
                (Just (SimpleChar.labelPushSmallLetter letter label))
                others
                (textAreaValue ++ [ ( char, True ) ])

        (ANumber num char) :: others ->
            inTypeParser
                (SimpleChar.labelPushNumber num label)
                others
                (textAreaValue ++ [ ( char, label /= Nothing ) ])

        (AChar char) :: others ->
            inTypeParser
                label
                others
                (textAreaValue ++ [ ( char, False ) ])

        [] ->
            case label of
                Just l ->
                    TypeEnd
                        { type_ = PartDef.emptyType -- TODO l から検索をする
                        , textAreaValue = textAreaValue
                        }

                Nothing ->
                    TypeEnd
                        { type_ = PartDef.emptyType
                        , textAreaValue = textAreaValue
                        }
