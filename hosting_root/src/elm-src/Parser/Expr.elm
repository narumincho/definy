module Parser.Expr exposing
    ( ParseOpResult(..)
    , ParseTermResult(..)
    , TermWithParenthesis(..)
    , parseStartOp
    , parseStartTerm
    , takeTerm
    , takeTermListOT
    , takeTermListTO
    )

import Label
import Parser.SimpleChar as SimpleChar exposing (SimpleChar(..), Symbol(..))
import Project.ModuleDefinition.Module.PartDef.Expr as Expr exposing (Operator, Term)


{-| 始まりがTermの構文解析結果
-}
type ParseTermResult
    = TermLastTerm
        { head : TermWithParenthesis
        , others : List ( Operator, TermWithParenthesis )
        , textAreaValue : List ( Char, Bool )
        }
    | TermLastOp
        { head : TermWithParenthesis
        , others : List ( Operator, TermWithParenthesis )
        , last : Operator
        , textAreaValue : List ( Char, Bool )
        }


{-| カッコつきの項 前後にどれだけカッコがあるかどうか
((3) → 2 (Int32 3) 1
-}
type TermWithParenthesis
    = TermWithParenthesis Int Term Int


{-| TODO デバッグ用 カッコを無視して項を取りだす
-}
takeTerm : TermWithParenthesis -> Term
takeTerm (TermWithParenthesis _ term _) =
    term


takeTermListTO : List ( TermWithParenthesis, Operator ) -> List ( Term, Operator )
takeTermListTO =
    List.map (Tuple.mapFirst takeTerm)


takeTermListOT : List ( Operator, TermWithParenthesis ) -> List ( Operator, Term )
takeTermListOT =
    List.map (Tuple.mapSecond takeTerm)


parseStartTerm : List SimpleChar -> ParseTermResult
parseStartTerm list =
    (list
        |> List.append [ ASpace ]
        |> SimpleChar.trimRight
    )
        |> parseToTermOrOpList
        |> termOrOpListToParseTermResult


termOrOpListToParseTermResult : ( List TermOrOp, List ( Char, Bool ) ) -> ParseTermResult
termOrOpListToParseTermResult ( list, textAreaValue ) =
    case list of
        (Term term) :: listOthers ->
            let
                { others, lastMaybe } =
                    termOrOpListToParseTermResultNeedOp listOthers
            in
            concatParseTermResult
                { head = term
                , others = others
                , lastMaybe = lastMaybe
                , textAreaValue = textAreaValue
                }

        (Op op) :: listOthers ->
            let
                { others, lastMaybe } =
                    termOrOpListToParseTermResultNeedTerm op listOthers
            in
            concatParseTermResult
                { head = TermWithParenthesis 0 Expr.None 0
                , others = others
                , lastMaybe = lastMaybe
                , textAreaValue = textAreaValue
                }

        [] ->
            TermLastTerm
                { head = TermWithParenthesis 0 Expr.None 0
                , others = []
                , textAreaValue = textAreaValue
                }


termOrOpListToParseTermResultNeedTerm : Operator -> List TermOrOp -> { others : List ( Operator, TermWithParenthesis ), lastMaybe : Maybe Operator }
termOrOpListToParseTermResultNeedTerm operator termOrOpList =
    case termOrOpList of
        (Term term) :: listOthers ->
            let
                { others, lastMaybe } =
                    termOrOpListToParseTermResultNeedOp listOthers
            in
            { others = [ ( operator, term ) ] ++ others
            , lastMaybe = lastMaybe
            }

        (Op op) :: listOthers ->
            let
                { others, lastMaybe } =
                    termOrOpListToParseTermResultNeedTerm op listOthers
            in
            { others = [ ( operator, TermWithParenthesis 0 Expr.None 0 ) ] ++ others
            , lastMaybe = lastMaybe
            }

        [] ->
            { others = []
            , lastMaybe = Just operator
            }


termOrOpListToParseTermResultNeedOp : List TermOrOp -> { others : List ( Operator, TermWithParenthesis ), lastMaybe : Maybe Operator }
termOrOpListToParseTermResultNeedOp termOrOpList =
    case termOrOpList of
        (Term term) :: listOthers ->
            let
                { others, lastMaybe } =
                    termOrOpListToParseTermResultNeedOp listOthers
            in
            { others = [ ( Expr.Blank, term ) ] ++ others
            , lastMaybe = lastMaybe
            }

        (Op op) :: others ->
            termOrOpListToParseTermResultNeedTerm op others

        [] ->
            { others = []
            , lastMaybe = Nothing
            }


concatParseTermResult : { head : TermWithParenthesis, others : List ( Operator, TermWithParenthesis ), lastMaybe : Maybe Operator, textAreaValue : List ( Char, Bool ) } -> ParseTermResult
concatParseTermResult { head, others, lastMaybe, textAreaValue } =
    case lastMaybe of
        Just last ->
            TermLastOp
                { head = head
                , others = others
                , last = last
                , textAreaValue = textAreaValue
                }

        Nothing ->
            TermLastTerm
                { head = head
                , others = others
                , textAreaValue = textAreaValue
                }


{-| 始まりがOpの公文解析結果
-}
type ParseOpResult
    = OpLastOp
        { head : Operator
        , others : List ( TermWithParenthesis, Operator )
        , textAreaValue : List ( Char, Bool )
        }
    | OpLastTerm
        { head : Operator
        , others : List ( TermWithParenthesis, Operator )
        , last : TermWithParenthesis
        , textAreaValue : List ( Char, Bool )
        }


parseStartOp : List SimpleChar -> ParseOpResult
parseStartOp list =
    (list |> SimpleChar.trimRight)
        |> parseToTermOrOpList
        |> termOrOpListToParseOpResult


termOrOpListToParseOpResult : ( List TermOrOp, List ( Char, Bool ) ) -> ParseOpResult
termOrOpListToParseOpResult ( list, textAreaValue ) =
    case list of
        (Term term) :: listOthers ->
            let
                { others, lastMaybe } =
                    termOrOpListToParseOpResultNeedOp term listOthers
            in
            concatParseOpResult
                { head = Expr.Blank
                , others = others
                , lastMaybe = lastMaybe
                , textAreaValue = textAreaValue
                }

        (Op op) :: listOthers ->
            let
                { others, lastMaybe } =
                    termOrOpListToParseOpResultNeedTerm listOthers
            in
            concatParseOpResult
                { head = op
                , others = others
                , lastMaybe = lastMaybe
                , textAreaValue = textAreaValue
                }

        [] ->
            OpLastOp
                { head = Expr.Blank
                , others = []
                , textAreaValue = textAreaValue
                }


termOrOpListToParseOpResultNeedOp : TermWithParenthesis -> List TermOrOp -> { others : List ( TermWithParenthesis, Operator ), lastMaybe : Maybe TermWithParenthesis }
termOrOpListToParseOpResultNeedOp prevTerm termOrOpList =
    case termOrOpList of
        (Term term) :: listOthers ->
            let
                { others, lastMaybe } =
                    termOrOpListToParseOpResultNeedOp term listOthers
            in
            { others = [ ( prevTerm, Expr.Blank ) ] ++ others
            , lastMaybe = lastMaybe
            }

        (Op op) :: listOthers ->
            let
                { others, lastMaybe } =
                    termOrOpListToParseOpResultNeedTerm listOthers
            in
            { others = [ ( prevTerm, op ) ] ++ others
            , lastMaybe = lastMaybe
            }

        [] ->
            { others = []
            , lastMaybe = Just prevTerm
            }


termOrOpListToParseOpResultNeedTerm : List TermOrOp -> { others : List ( TermWithParenthesis, Operator ), lastMaybe : Maybe TermWithParenthesis }
termOrOpListToParseOpResultNeedTerm termOrOpList =
    case termOrOpList of
        (Term term) :: listOthers ->
            termOrOpListToParseOpResultNeedOp term listOthers

        (Op op) :: listOthers ->
            let
                { others, lastMaybe } =
                    termOrOpListToParseOpResultNeedTerm listOthers
            in
            { others = [ ( TermWithParenthesis 0 Expr.None 0, op ) ] ++ others
            , lastMaybe = lastMaybe
            }

        [] ->
            { others = []
            , lastMaybe = Nothing
            }


concatParseOpResult : { head : Operator, others : List ( TermWithParenthesis, Operator ), lastMaybe : Maybe TermWithParenthesis, textAreaValue : List ( Char, Bool ) } -> ParseOpResult
concatParseOpResult { head, others, lastMaybe, textAreaValue } =
    case lastMaybe of
        Just last ->
            OpLastTerm
                { head = head
                , others = others
                , last = last
                , textAreaValue = textAreaValue
                }

        Nothing ->
            OpLastOp
                { head = head
                , others = others
                , textAreaValue = textAreaValue
                }


type TermOrOp
    = Term TermWithParenthesis
    | Op Operator


type ParseResult
    = Rest
        { termOrOpList : List TermOrOp
        , rest : List SimpleChar
        }
    | End
        { termOrOpList : List TermOrOp
        , textAreaValue : List ( Char, Bool )
        }


parseResultAddTermOrOpList : List TermOrOp -> ParseResult -> ParseResult
parseResultAddTermOrOpList list parseResult =
    case parseResult of
        Rest { termOrOpList, rest } ->
            Rest
                { termOrOpList = list ++ termOrOpList
                , rest = rest
                }

        End { termOrOpList, textAreaValue } ->
            End
                { termOrOpList = list ++ termOrOpList
                , textAreaValue = textAreaValue
                }


parseToTermOrOpList : List SimpleChar -> ( List TermOrOp, List ( Char, Bool ) )
parseToTermOrOpList list =
    case parse 0 list of
        Rest { termOrOpList, rest } ->
            let
                ( restTermOrOpList, textAreaValue ) =
                    parseToTermOrOpList rest
            in
            ( termOrOpList ++ restTermOrOpList
            , textAreaValue
            )

        End { termOrOpList, textAreaValue } ->
            ( termOrOpList
            , textAreaValue
            )


parse : Int -> List SimpleChar -> ParseResult
parse leftParenthesis list =
    case list of
        -- -から始まるInt32リテラル
        ASpace :: (ASymbol SimpleChar.HyphenMinus charH) :: (ANumber num charN) :: others ->
            parseIntLiteral
                leftParenthesis
                (IntLiteralIntermediate
                    { minus = True, digits = [ num ] }
                )
                others
                [ ( charH, True ), ( charN, True ) ]

        _ ->
            case parseOperator list of
                Just opResult ->
                    if leftParenthesis == 0 then
                        opResult

                    else
                        parseResultAddTermOrOpList
                            [ Term (TermWithParenthesis leftParenthesis Expr.None 0) ]
                            opResult

                Nothing ->
                    case list of
                        -- スペースは見送り
                        ASpace :: others ->
                            parse leftParenthesis others

                        (ASymbol LeftParenthesis _) :: others ->
                            parse (leftParenthesis + 1) others

                        (ASymbol _ char) :: others ->
                            parseInPart
                                leftParenthesis
                                Nothing
                                others
                                [ ( char, False ) ]

                        (ACapitalLetter letter char) :: others ->
                            parseInPart
                                leftParenthesis
                                (Just
                                    (Label.fromHead
                                        (SimpleChar.alphabetToLabelHead letter)
                                    )
                                )
                                others
                                [ ( char, True ) ]

                        (ASmallLetter letter char) :: others ->
                            parseInPart
                                leftParenthesis
                                (Just
                                    (Label.fromHead
                                        (SimpleChar.alphabetToLabelHead letter)
                                    )
                                )
                                others
                                [ ( char, True ) ]

                        (ANumber num char) :: others ->
                            parseIntLiteral
                                leftParenthesis
                                (IntLiteralIntermediate
                                    { minus = False, digits = [ num ] }
                                )
                                others
                                [ ( char, True ) ]

                        (AChar char) :: others ->
                            parseInPart leftParenthesis Nothing others [ ( char, False ) ]

                        [] ->
                            End
                                { termOrOpList =
                                    if leftParenthesis == 0 then
                                        []

                                    else
                                        [ Term (TermWithParenthesis leftParenthesis Expr.None 0) ]
                                , textAreaValue = []
                                }


parseOperator : List SimpleChar -> Maybe ParseResult
parseOperator list =
    case list of
        (ASymbol Solidus _) :: (ASymbol EqualsSign _) :: others ->
            Just
                (Rest
                    { termOrOpList = [ Op Expr.NotEqual ]
                    , rest = others
                    }
                )

        (ASymbol LessThanSign _) :: (ASymbol EqualsSign _) :: others ->
            Just
                (Rest
                    { termOrOpList = [ Op Expr.LessThanOrEqual ]
                    , rest = others
                    }
                )

        (ASymbol PlusSign _) :: (ASymbol PlusSign _) :: others ->
            Just
                (Rest
                    { termOrOpList = [ Op Expr.Concat ]
                    , rest = others
                    }
                )

        (ASymbol GreaterThanSign _) :: (ASymbol GreaterThanSign _) :: others ->
            Just
                (Rest
                    { termOrOpList = [ Op Expr.Compose ]
                    , rest = others
                    }
                )

        (ASymbol GreaterThanSign _) :: others ->
            Just
                (Rest
                    { termOrOpList = [ Op Expr.Pipe ]
                    , rest = others
                    }
                )

        (ASymbol VerticalLine _) :: others ->
            Just
                (Rest
                    { termOrOpList = [ Op Expr.Or ]
                    , rest = others
                    }
                )

        (ASymbol Ampersand _) :: others ->
            Just
                (Rest
                    { termOrOpList = [ Op Expr.And ]
                    , rest = others
                    }
                )

        (ASymbol EqualsSign _) :: others ->
            Just
                (Rest
                    { termOrOpList = [ Op Expr.Equal ]
                    , rest = others
                    }
                )

        [ ASymbol LessThanSign char ] ->
            Just
                (End
                    { termOrOpList = [ Op Expr.LessThan ]
                    , textAreaValue = [ ( char, True ) ]
                    }
                )

        (ASymbol LessThanSign _) :: others ->
            Just
                (Rest
                    { termOrOpList = [ Op Expr.LessThan ]
                    , rest = others
                    }
                )

        [ ASymbol PlusSign char ] ->
            Just
                (End
                    { termOrOpList = [ Op Expr.Add ]
                    , textAreaValue = [ ( char, True ) ]
                    }
                )

        (ASymbol PlusSign _) :: others ->
            Just
                (Rest
                    { termOrOpList = [ Op Expr.Add ]
                    , rest = others
                    }
                )

        (ASymbol HyphenMinus _) :: others ->
            Just
                (Rest
                    { termOrOpList = [ Op Expr.Sub ]
                    , rest = others
                    }
                )

        (ASymbol Asterisk _) :: others ->
            Just
                (Rest
                    { termOrOpList = [ Op Expr.Mul ]
                    , rest = others
                    }
                )

        [ ASymbol Solidus char ] ->
            Just
                (End
                    { termOrOpList = [ Op Expr.Div ]
                    , textAreaValue = [ ( char, True ) ]
                    }
                )

        (ASymbol Solidus _) :: others ->
            Just
                (Rest
                    { termOrOpList = [ Op Expr.Div ]
                    , rest = others
                    }
                )

        (ASymbol CircumflexAccent _) :: others ->
            Just
                (Rest
                    { termOrOpList = [ Op Expr.Factorial ]
                    , rest = others
                    }
                )

        _ ->
            Nothing


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


{-| 整数リテラルの解析
-}
parseIntLiteral : Int -> IntLiteralIntermediate -> List SimpleChar -> List ( Char, Bool ) -> ParseResult
parseIntLiteral leftParenthesis intermediate rest textAreaValue =
    case rest of
        ASpace :: others ->
            Rest
                { termOrOpList =
                    [ Term
                        (TermWithParenthesis
                            leftParenthesis
                            (Expr.Int32Literal (intLiteralIntermediateToInt intermediate))
                            0
                        )
                    ]
                , rest = others
                }

        (ANumber num char) :: others ->
            parseIntLiteral
                leftParenthesis
                (intLiteralIntermediatePush num intermediate)
                others
                (textAreaValue ++ [ ( char, True ) ])

        _ :: _ ->
            Rest
                { termOrOpList =
                    [ Term
                        (TermWithParenthesis
                            leftParenthesis
                            (Expr.Int32Literal (intLiteralIntermediateToInt intermediate))
                            0
                        )
                    ]
                , rest = rest
                }

        [] ->
            End
                { termOrOpList =
                    [ Term
                        (TermWithParenthesis
                            leftParenthesis
                            (Expr.Int32Literal (intLiteralIntermediateToInt intermediate))
                            0
                        )
                    ]
                , textAreaValue = textAreaValue
                }


{-| 名前による参照
-}
parseInPart : Int -> Maybe Label.Label -> List SimpleChar -> List ( Char, Bool ) -> ParseResult
parseInPart leftParenthesis label rest textAreaValue =
    case rest of
        ASpace :: others ->
            Rest
                { termOrOpList =
                    [ Term (TermWithParenthesis leftParenthesis Expr.None 0) ]
                , rest = others
                }

        (ASymbol symbol char) :: _ ->
            Rest
                { termOrOpList =
                    [ Term (TermWithParenthesis leftParenthesis Expr.None 0) ]
                , rest = rest
                }

        (ACapitalLetter letter char) :: others ->
            parseInPart
                leftParenthesis
                (Just (SimpleChar.labelPushCapitalLetter letter label))
                others
                (textAreaValue ++ [ ( char, True ) ])

        (ASmallLetter letter char) :: others ->
            parseInPart
                leftParenthesis
                (Just (SimpleChar.labelPushSmallLetter letter label))
                others
                (textAreaValue ++ [ ( char, True ) ])

        (ANumber num char) :: others ->
            let
                newLabel =
                    SimpleChar.labelPushNumber num label
            in
            parseInPart
                leftParenthesis
                newLabel
                others
                (textAreaValue ++ [ ( char, newLabel /= Nothing ) ])

        (AChar char) :: others ->
            parseInPart
                leftParenthesis
                label
                others
                (textAreaValue ++ [ ( char, False ) ])

        [] ->
            End
                { termOrOpList =
                    [ Term (TermWithParenthesis leftParenthesis Expr.None 0) ]
                , textAreaValue = textAreaValue
                }
