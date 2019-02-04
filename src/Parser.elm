module Parser exposing
    ( BeginWithExprHeadResult(..)
    , BeginWithNameResult(..)
    , BeginWithOpResult(..)
    , BeginWithTermResult(..)
    , BeginWithTypeResult(..)
    , beginWithExprHead
    , beginWithExprOp
    , beginWithExprTerm
    , beginWithName
    , beginWithType
    )

import Parser.Expr as ExprParser
import Parser.Name as NameParser
import Parser.SimpleChar as SimpleChar exposing (SimpleChar)
import Parser.Type as TypeParser
import Project.Source.Module.Def.Expr as Expr
import Project.Source.Module.Def.Expr.Operator as Operator
import Project.Source.Module.Def.Expr.Term as Term
import Project.Source.Module.Def.Name as Name
import Project.Source.Module.Def.Type as Type


{-| 名前始まりの解析の結果
-}
type BeginWithNameResult
    = BeginWithNameEndName
        { name : Name.Name
        , textAreaValue : List ( Char, Bool )
        }
    | BeginWithNameEndType
        { name : Name.Name
        , type_ : Type.Type
        , textAreaValue : List ( Char, Bool )
        }
    | BeginWithNameEndExprTerm
        { name : Name.Name
        , type_ : Type.Type
        , headTerm : Term.Term
        , termAndOpList : List ( Operator.Operator, Term.Term )
        , textAreaValue : List ( Char, Bool )
        }
    | BeginWithNameEndExprOp
        { name : Name.Name
        , type_ : Type.Type
        , headTerm : Term.Term
        , termAndOpList : List ( Operator.Operator, Term.Term )
        , lastOp : Operator.Operator
        , textAreaValue : List ( Char, Bool )
        }


{-| 型始まりの解析の結果
-}
type BeginWithTypeResult
    = BeginWithTypeEndType
        { type_ : Type.Type
        , textAreaValue : List ( Char, Bool )
        }
    | BeginWithTypeEndExprTerm
        { type_ : Type.Type
        , headTerm : Term.Term
        , termAndOpList : List ( Operator.Operator, Term.Term )
        , textAreaValue : List ( Char, Bool )
        }
    | BeginWithTypeEndExprOp
        { type_ : Type.Type
        , headTerm : Term.Term
        , termAndOpList : List ( Operator.Operator, Term.Term )
        , lastOp : Operator.Operator
        , textAreaValue : List ( Char, Bool )
        }


{-| 式始まりの解析の結果
-}
type BeginWithExprHeadResult
    = BeginWithExprHeadEndTerm
        { headTerm : Term.Term
        , opAndTermList : List ( Operator.Operator, Term.Term )
        , textAreaValue : List ( Char, Bool )
        }
    | BeginWithExprHeadEndOp
        { headTerm : Term.Term
        , opAndTermList : List ( Operator.Operator, Term.Term )
        , lastOp : Operator.Operator
        , textAreaValue : List ( Char, Bool )
        }


{-| 演算子始まりの解析結果
-}
type BeginWithOpResult
    = BeginWithOpEndTerm
        { headOp : Operator.Operator
        , termAndOpList : List ( Term.Term, Operator.Operator )
        , lastTerm : Term.Term
        , textAreaValue : List ( Char, Bool )
        }
    | BeginWithOpEndOp
        { headOp : Operator.Operator
        , termAndOpList : List ( Term.Term, Operator.Operator )
        , textAreaValue : List ( Char, Bool )
        }


{-| 項始まりの解析結果
-}
type BeginWithTermResult
    = BeginWithTermEndTerm
        { headTerm : Term.Term
        , opAndTermList : List ( Operator.Operator, Term.Term )
        , textAreaValue : List ( Char, Bool )
        }
    | BeginWithTermEndOp
        { headTerm : Term.Term
        , opAndTermList : List ( Operator.Operator, Term.Term )
        , lastOp : Operator.Operator
        , textAreaValue : List ( Char, Bool )
        }


{-| 名前始まりとして解析
-}
beginWithName : List SimpleChar -> BeginWithNameResult
beginWithName list =
    case NameParser.parse list of
        NameParser.NameEnd name textAreaValue ->
            BeginWithNameEndName
                { name = name
                , textAreaValue = textAreaValue
                }

        NameParser.NameToType name restN ->
            case TypeParser.parse restN of
                TypeParser.TypeEnd { type_, textAreaValue } ->
                    BeginWithNameEndType
                        { name = name
                        , type_ = type_
                        , textAreaValue = textAreaValue
                        }

                TypeParser.TypeToExpr { type_, rest } ->
                    case ExprParser.parseStartTerm rest of
                        ExprParser.TermLastTerm { head, others, textAreaValue } ->
                            BeginWithNameEndExprTerm
                                { name = name
                                , type_ = type_
                                , headTerm = head
                                , termAndOpList = others
                                , textAreaValue = textAreaValue
                                }

                        ExprParser.TermLastOp { head, others, last, textAreaValue } ->
                            BeginWithNameEndExprOp
                                { name = name
                                , type_ = type_
                                , headTerm = head
                                , termAndOpList = others
                                , lastOp = last
                                , textAreaValue = textAreaValue
                                }

        NameParser.NameToExpr name rest ->
            case ExprParser.parseStartTerm rest of
                ExprParser.TermLastTerm { head, others, textAreaValue } ->
                    BeginWithNameEndExprTerm
                        { name = name
                        , type_ = Type.empty
                        , headTerm = head
                        , termAndOpList = others
                        , textAreaValue = textAreaValue
                        }

                ExprParser.TermLastOp { head, others, last, textAreaValue } ->
                    BeginWithNameEndExprOp
                        { name = name
                        , type_ = Type.empty
                        , headTerm = head
                        , termAndOpList = others
                        , lastOp = last
                        , textAreaValue = textAreaValue
                        }


{-| 型始まりとして解析
-}
beginWithType : List SimpleChar -> BeginWithTypeResult
beginWithType list =
    case TypeParser.parse list of
        TypeParser.TypeEnd { type_, textAreaValue } ->
            BeginWithTypeEndType
                { type_ = type_
                , textAreaValue = textAreaValue
                }

        TypeParser.TypeToExpr { type_, rest } ->
            case ExprParser.parseStartTerm rest of
                ExprParser.TermLastTerm { head, others, textAreaValue } ->
                    BeginWithTypeEndExprTerm
                        { type_ = type_
                        , headTerm = head
                        , termAndOpList = others
                        , textAreaValue = textAreaValue
                        }

                ExprParser.TermLastOp { head, others, last, textAreaValue } ->
                    BeginWithTypeEndExprOp
                        { type_ = type_
                        , headTerm = head
                        , termAndOpList = others
                        , lastOp = last
                        , textAreaValue = textAreaValue
                        }


{-| 式始まりとして解析
-}
beginWithExprHead : List SimpleChar -> BeginWithExprHeadResult
beginWithExprHead list =
    case ExprParser.parseStartTerm list of
        ExprParser.TermLastTerm { head, others, textAreaValue } ->
            BeginWithExprHeadEndTerm
                { headTerm = head
                , opAndTermList = others
                , textAreaValue = textAreaValue
                }

        ExprParser.TermLastOp { head, others, last, textAreaValue } ->
            BeginWithExprHeadEndOp
                { headTerm = head
                , opAndTermList = others
                , lastOp = last
                , textAreaValue = textAreaValue
                }


{-| 演算子始まりとして解析
-}
beginWithExprOp : List SimpleChar -> BeginWithOpResult
beginWithExprOp list =
    case ExprParser.parseStartOp list of
        ExprParser.OpLastTerm { head, others, last, textAreaValue } ->
            BeginWithOpEndTerm
                { headOp = head
                , termAndOpList = others
                , lastTerm = last
                , textAreaValue = textAreaValue
                }

        ExprParser.OpLastOp { head, others, textAreaValue } ->
            BeginWithOpEndOp
                { headOp = head
                , termAndOpList = others
                , textAreaValue = textAreaValue
                }


{-| 項始まりとして解析
-}
beginWithExprTerm : List SimpleChar -> BeginWithTermResult
beginWithExprTerm list =
    case ExprParser.parseStartTerm list of
        ExprParser.TermLastTerm { head, others, textAreaValue } ->
            BeginWithTermEndTerm
                { headTerm = head
                , opAndTermList = others
                , textAreaValue = textAreaValue
                }

        ExprParser.TermLastOp { head, others, last, textAreaValue } ->
            BeginWithTermEndOp
                { headTerm = head
                , opAndTermList = others
                , lastOp = last
                , textAreaValue = textAreaValue
                }
