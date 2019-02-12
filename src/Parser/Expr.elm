module Parser.Expr exposing
    ( ParseOpResult(..)
    , ParseTermResult(..)
    , parseStartOp
    , parseStartTerm
    )

import Parser.SimpleChar as SimpleChar exposing (SimpleChar(..), Symbol(..))
import Project.Label as Label exposing (Label)
import Project.Source.Module.Def as Def exposing (Def)
import Project.Source.Module.Def.Expr.Operator as Operator exposing (Operator)
import Project.Source.Module.Def.Expr.Term as Term exposing (Term)



-- 始まりがTermの公文解析結果


type ParseTermResult
    = TermLastTerm
        { head : Term
        , others : List ( Operator, Term )
        , textAreaValue : List ( Char, Bool )
        }
    | TermLastOp
        { head : Term
        , others : List ( Operator, Term )
        , last : Operator
        , textAreaValue : List ( Char, Bool )
        }


parseStartTerm : List SimpleChar -> ParseTermResult
parseStartTerm list =
    parseStartTermLoop
        []
        (list
            |> List.append [ ASpace ]
            |> SimpleChar.trimRight
        )


parseStartTermLoop : List TermOrOp -> List SimpleChar -> ParseTermResult
parseStartTermLoop intermediate list =
    case parseOne list of
        OneTerm (TermAndRest { term, rest }) ->
            parseStartTermLoop
                (intermediate ++ [ Term term ])
                rest

        OneTerm (TermEnd { term, textAreaValue }) ->
            batchTermResult (intermediate ++ [ Term term ]) textAreaValue

        OneOpAndRest { op, rest } ->
            parseStartTermLoop
                (intermediate ++ [ Op op ])
                rest

        OneOpEnd { op, textAreaValue } ->
            batchTermResult (intermediate ++ [ Op op ]) textAreaValue

        OneEnd ->
            batchTermResult (intermediate ++ [ Term Term.none ]) []


batchTermResult : List TermOrOp -> List ( Char, Bool ) -> ParseTermResult
batchTermResult list textAreaValue =
    case list of
        (Term term) :: others ->
            batchTermResultLoop
                (TermLastTerm
                    { head = term
                    , others = []
                    , textAreaValue = textAreaValue
                    }
                )
                others

        (Op op) :: others ->
            batchTermResultLoop
                (TermLastOp
                    { head = Term.none
                    , others = []
                    , last = op
                    , textAreaValue = textAreaValue
                    }
                )
                others

        [] ->
            TermLastTerm
                { head = Term.none
                , others = []
                , textAreaValue = []
                }


batchTermResultLoop : ParseTermResult -> List TermOrOp -> ParseTermResult
batchTermResultLoop intermediate list =
    case ( intermediate, list ) of
        ( TermLastTerm { head, others, textAreaValue }, (Term term) :: listOthers ) ->
            batchTermResultLoop
                (TermLastTerm
                    { head = head
                    , others = others ++ [ ( Operator.app, term ) ]
                    , textAreaValue = textAreaValue
                    }
                )
                listOthers

        ( TermLastTerm { head, others, textAreaValue }, (Op op) :: listOthers ) ->
            batchTermResultLoop
                (TermLastOp
                    { head = head
                    , others = others
                    , last = op
                    , textAreaValue = textAreaValue
                    }
                )
                listOthers

        ( TermLastOp { head, others, last, textAreaValue }, (Term term) :: listOthers ) ->
            batchTermResultLoop
                (TermLastTerm
                    { head = head
                    , others = others ++ [ ( last, term ) ]
                    , textAreaValue = textAreaValue
                    }
                )
                listOthers

        ( TermLastOp { head, others, last, textAreaValue }, (Op op) :: listOthers ) ->
            batchTermResultLoop
                (TermLastOp
                    { head = head
                    , others = others ++ [ ( last, Term.none ) ]
                    , last = op
                    , textAreaValue = textAreaValue
                    }
                )
                listOthers

        ( _, [] ) ->
            intermediate



-- 始まりがOpの公文解析結果


type ParseOpResult
    = OpLastOp
        { head : Operator
        , others : List ( Term, Operator )
        , textAreaValue : List ( Char, Bool )
        }
    | OpLastTerm
        { head : Operator
        , others : List ( Term, Operator )
        , last : Term
        , textAreaValue : List ( Char, Bool )
        }


parseStartOp : List SimpleChar -> ParseOpResult
parseStartOp list =
    parseStartOpLoop
        []
        (list
            |> SimpleChar.trimRight
        )


parseStartOpLoop : List TermOrOp -> List SimpleChar -> ParseOpResult
parseStartOpLoop intermediate list =
    case parseOne list of
        OneTerm (TermAndRest { term, rest }) ->
            parseStartOpLoop
                (intermediate ++ [ Term term ])
                rest

        OneTerm (TermEnd { term, textAreaValue }) ->
            batchOpResult (intermediate ++ [ Term term ]) textAreaValue

        OneOpAndRest { op, rest } ->
            parseStartOpLoop
                (intermediate ++ [ Op op ])
                rest

        OneOpEnd { op, textAreaValue } ->
            batchOpResult (intermediate ++ [ Op op ]) textAreaValue

        OneEnd ->
            batchOpResult (intermediate ++ [ Term Term.none ]) []


batchOpResult : List TermOrOp -> List ( Char, Bool ) -> ParseOpResult
batchOpResult list textAreaValue =
    case list of
        (Term term) :: others ->
            batchOpResultLoop
                (OpLastTerm
                    { head = Operator.blank
                    , others = []
                    , last = term
                    , textAreaValue = textAreaValue
                    }
                )
                others

        (Op op) :: others ->
            batchOpResultLoop
                (OpLastOp
                    { head = op
                    , others = []
                    , textAreaValue = textAreaValue
                    }
                )
                others

        [] ->
            OpLastOp
                { head = Operator.blank
                , others = []
                , textAreaValue = textAreaValue
                }


batchOpResultLoop : ParseOpResult -> List TermOrOp -> ParseOpResult
batchOpResultLoop intermediate list =
    case ( intermediate, list ) of
        ( OpLastTerm { head, others, last, textAreaValue }, (Term term) :: listOthers ) ->
            batchOpResultLoop
                (OpLastTerm
                    { head = head
                    , others = others ++ [ ( last, Operator.app ) ]
                    , last = term
                    , textAreaValue = textAreaValue
                    }
                )
                listOthers

        ( OpLastTerm { head, others, last, textAreaValue }, (Op op) :: listOthers ) ->
            batchOpResultLoop
                (OpLastOp
                    { head = head
                    , others = others ++ [ ( last, op ) ]
                    , textAreaValue = textAreaValue
                    }
                )
                listOthers

        ( OpLastOp { head, others, textAreaValue }, (Term term) :: listOthers ) ->
            batchOpResultLoop
                (OpLastTerm
                    { head = head
                    , others = others
                    , last = term
                    , textAreaValue = textAreaValue
                    }
                )
                listOthers

        ( OpLastOp { head, others, textAreaValue }, (Op op) :: listOthers ) ->
            batchOpResultLoop
                (OpLastOp
                    { head = head
                    , others = others ++ [ ( Term.none, op ) ]
                    , textAreaValue = textAreaValue
                    }
                )
                listOthers

        ( _, [] ) ->
            intermediate


type TermOrOp
    = Term Term
    | Op Operator


type OneResult
    = OneTerm TermResult
    | OneOpAndRest
        { op : Operator
        , rest : List SimpleChar
        }
    | OneOpEnd
        { op : Operator
        , textAreaValue : List ( Char, Bool )
        }
    | OneEnd -- やっぱ終わり


type TermResult
    = TermAndRest
        { term : Term
        , rest : List SimpleChar
        }
    | TermEnd
        { term : Term
        , textAreaValue : List ( Char, Bool )
        }


parseOne : List SimpleChar -> OneResult
parseOne list =
    case list of
        ASpace :: (ASymbol SimpleChar.HyphenMinus charH) :: (ANumber num charN) :: others ->
            OneTerm
                (parseIntLiteral
                    (IntLiteralIntermediate
                        { minus = True, digits = [ num ] }
                    )
                    others
                    [ ( charH, True ), ( charN, True ) ]
                )

        ASpace :: others ->
            parseOne others

        (ASymbol Solidus _) :: (ASymbol EqualsSign _) :: others ->
            OneOpAndRest
                { op = Operator.notEqual
                , rest = others
                }

        (ASymbol LessThanSign _) :: (ASymbol EqualsSign _) :: others ->
            OneOpAndRest
                { op = Operator.lessThanOrEqual
                , rest = others
                }

        (ASymbol PlusSign _) :: (ASymbol PlusSign _) :: others ->
            OneOpAndRest
                { op = Operator.concat
                , rest = others
                }

        (ASymbol GreaterThanSign _) :: (ASymbol GreaterThanSign _) :: others ->
            OneOpAndRest
                { op = Operator.compose
                , rest = others
                }

        (ASymbol GreaterThanSign _) :: others ->
            OneOpAndRest
                { op = Operator.pipe
                , rest = others
                }

        (ASymbol VerticalLine _) :: others ->
            OneOpAndRest
                { op = Operator.or
                , rest = others
                }

        (ASymbol Ampersand _) :: others ->
            OneOpAndRest
                { op = Operator.and
                , rest = others
                }

        (ASymbol EqualsSign _) :: others ->
            OneOpAndRest
                { op = Operator.equal
                , rest = others
                }

        [ ASymbol LessThanSign char ] ->
            OneOpEnd
                { op = Operator.lessThan
                , textAreaValue = [ ( char, True ) ]
                }

        (ASymbol LessThanSign _) :: others ->
            OneOpAndRest
                { op = Operator.lessThan
                , rest = others
                }

        [ ASymbol PlusSign char ] ->
            OneOpEnd
                { op = Operator.add
                , textAreaValue = [ ( char, True ) ]
                }

        (ASymbol PlusSign _) :: others ->
            OneOpAndRest
                { op = Operator.add
                , rest = others
                }

        (ASymbol HyphenMinus _) :: others ->
            OneOpAndRest
                { op = Operator.sub
                , rest = others
                }

        (ASymbol Asterisk _) :: others ->
            OneOpAndRest
                { op = Operator.mul
                , rest = others
                }

        [ ASymbol Solidus char ] ->
            OneOpEnd
                { op = Operator.div
                , textAreaValue = [ ( char, True ) ]
                }

        (ASymbol Solidus _) :: others ->
            OneOpAndRest
                { op = Operator.div
                , rest = others
                }

        (ASymbol CircumflexAccent _) :: others ->
            OneOpAndRest
                { op = Operator.factorial
                , rest = others
                }

        (ASymbol _ char) :: others ->
            OneTerm
                (parseInRef
                    Nothing
                    others
                    [ ( char, False ) ]
                )

        (ACapitalLetter letter char) :: others ->
            OneTerm
                (parseInRef
                    (Just
                        (Label.fromHead
                            (SimpleChar.alphabetToLabelHead letter)
                        )
                    )
                    others
                    [ ( char, True ) ]
                )

        (ASmallLetter letter char) :: others ->
            OneTerm
                (parseInRef
                    (Just
                        (Label.fromHead
                            (SimpleChar.alphabetToLabelHead letter)
                        )
                    )
                    others
                    [ ( char, True ) ]
                )

        (ANumber num char) :: others ->
            OneTerm
                (parseIntLiteral
                    (IntLiteralIntermediate
                        { minus = False, digits = [ num ] }
                    )
                    others
                    [ ( char, True ) ]
                )

        (AChar char) :: others ->
            OneTerm (parseInRef Nothing others [ ( char, False ) ])

        [] ->
            OneEnd


type IntLiteralIntermediate
    = IntLiteralIntermediate
        { minus : Bool
        , digits : List SimpleChar.Number
        }


intLiteralIntermediatePush : SimpleChar.Number -> IntLiteralIntermediate -> IntLiteralIntermediate
intLiteralIntermediatePush num (IntLiteralIntermediate { minus, digits }) =
    IntLiteralIntermediate
        { minus = minus
        , digits = digits ++ [ num ]
        }


intLiteralIntermediateToInt : IntLiteralIntermediate -> Int
intLiteralIntermediateToInt (IntLiteralIntermediate { minus, digits }) =
    if minus then
        -(SimpleChar.listNumberToInt digits)

    else
        SimpleChar.listNumberToInt digits



-- 整数リテラルの解析


parseIntLiteral : IntLiteralIntermediate -> List SimpleChar -> List ( Char, Bool ) -> TermResult
parseIntLiteral intermediate rest textareaValue =
    case rest of
        ASpace :: others ->
            TermAndRest
                { term = Term.fromInt (intLiteralIntermediateToInt intermediate)
                , rest = others
                }

        (ANumber num char) :: others ->
            parseIntLiteral
                (intLiteralIntermediatePush num intermediate)
                others
                (textareaValue ++ [ ( char, True ) ])

        _ :: _ ->
            TermAndRest
                { term = Term.fromInt (intLiteralIntermediateToInt intermediate)
                , rest = rest
                }

        [] ->
            TermEnd
                { term = Term.fromInt (intLiteralIntermediateToInt intermediate)
                , textAreaValue = textareaValue
                }



-- 名前による参照


parseInRef : Maybe Label.Label -> List SimpleChar -> List ( Char, Bool ) -> TermResult
parseInRef label rest textAreaValue =
    case rest of
        ASpace :: others ->
            TermAndRest
                { term = Term.fromMaybeLabel label
                , rest = others
                }

        (ASymbol symbol char) :: _ ->
            TermAndRest
                { term = Term.fromMaybeLabel label
                , rest = rest
                }

        (ACapitalLetter letter char) :: others ->
            parseInRef
                (Just (SimpleChar.labelPushCapitalLetter letter label))
                others
                (textAreaValue ++ [ ( char, True ) ])

        (ASmallLetter letter char) :: others ->
            parseInRef
                (Just (SimpleChar.labelPushSmallLetter letter label))
                others
                (textAreaValue ++ [ ( char, True ) ])

        (ANumber num char) :: others ->
            let
                newLabel =
                    SimpleChar.labelPushNumber num label
            in
            parseInRef
                newLabel
                others
                (textAreaValue ++ [ ( char, newLabel /= Nothing ) ])

        (AChar char) :: others ->
            parseInRef
                label
                others
                (textAreaValue ++ [ ( char, False ) ])

        [] ->
            TermEnd
                { term = Term.fromMaybeLabel label
                , textAreaValue = textAreaValue
                }
