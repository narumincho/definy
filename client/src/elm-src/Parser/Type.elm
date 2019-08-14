module Parser.Type exposing
    ( ParserResult(..)
    , parse
    )

import Data.Label as Label
import Parser.SimpleChar as SimpleChar exposing (SimpleChar(..))
import Project.ModuleDefinition.Module.PartDef.Type as Type exposing (Type)


type ParserResult
    = TypeEnd
        { type_ : Type
        , textAreaValue : List ( Char, Bool )
        }
    | TypeToExpr
        { type_ : Type
        , rest : List SimpleChar
        }


parse : List SimpleChar -> ParserResult
parse list =
    case list of
        ASpace :: others ->
            parse others

        (ASymbol SimpleChar.EqualsSign char) :: others ->
            TypeToExpr
                { type_ = Type.empty
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
                { type_ = Type.empty
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
                        { type_ = Type.fromLabel l
                        , rest = others
                        }

                Nothing ->
                    TypeToExpr
                        { type_ = Type.empty
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
                        { type_ = Type.fromLabel l
                        , textAreaValue = textAreaValue
                        }

                Nothing ->
                    TypeEnd
                        { type_ = Type.empty
                        , textAreaValue = textAreaValue
                        }
