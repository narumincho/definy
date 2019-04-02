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
import Project.Source.Module.PartDef.Expr as Expr
import Project.Source.Module.PartDef.Name as Name
import Project.Source.Module.PartDef.Type as Type


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
        , headTerm : Expr.Term
        , opAndTermList : List ( Expr.Operator, Expr.Term )
        , textAreaValue : List ( Char, Bool )
        }
    | BeginWithNameEndExprOp
        { name : Name.Name
        , type_ : Type.Type
        , headTerm : Expr.Term
        , opAndTermList : List ( Expr.Operator, Expr.Term )
        , lastOp : Expr.Operator
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
        , headTerm : Expr.Term
        , opAndTermList : List ( Expr.Operator, Expr.Term )
        , textAreaValue : List ( Char, Bool )
        }
    | BeginWithTypeEndExprOp
        { type_ : Type.Type
        , headTerm : Expr.Term
        , opAndTermList : List ( Expr.Operator, Expr.Term )
        , lastOp : Expr.Operator
        , textAreaValue : List ( Char, Bool )
        }


{-| 式始まりの解析の結果
-}
type BeginWithExprHeadResult
    = BeginWithExprHeadEndTerm
        { headTerm : Expr.Term
        , opAndTermList : List ( Expr.Operator, Expr.Term )
        , textAreaValue : List ( Char, Bool )
        }
    | BeginWithExprHeadEndOp
        { headTerm : Expr.Term
        , opAndTermList : List ( Expr.Operator, Expr.Term )
        , lastOp : Expr.Operator
        , textAreaValue : List ( Char, Bool )
        }


{-| 演算子始まりの解析結果
-}
type BeginWithOpResult
    = BeginWithOpEndTerm
        { headOp : Expr.Operator
        , termAndOpList : List ( Expr.Term, Expr.Operator )
        , lastTerm : Expr.Term
        , textAreaValue : List ( Char, Bool )
        }
    | BeginWithOpEndOp
        { headOp : Expr.Operator
        , termAndOpList : List ( Expr.Term, Expr.Operator )
        , textAreaValue : List ( Char, Bool )
        }


{-| 項始まりの解析結果
-}
type BeginWithTermResult
    = BeginWithTermEndTerm
        { headTerm : Expr.Term
        , opAndTermList : List ( Expr.Operator, Expr.Term )
        , textAreaValue : List ( Char, Bool )
        }
    | BeginWithTermEndOp
        { headTerm : Expr.Term
        , opAndTermList : List ( Expr.Operator, Expr.Term )
        , lastOp : Expr.Operator
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
                                , headTerm = ExprParser.takeTerm head
                                , opAndTermList = ExprParser.takeTermListOT others
                                , textAreaValue = textAreaValue
                                }

                        ExprParser.TermLastOp { head, others, last, textAreaValue } ->
                            BeginWithNameEndExprOp
                                { name = name
                                , type_ = type_
                                , headTerm = ExprParser.takeTerm head
                                , opAndTermList = ExprParser.takeTermListOT others
                                , lastOp = last
                                , textAreaValue = textAreaValue
                                }

        NameParser.NameToExpr name rest ->
            case ExprParser.parseStartTerm rest of
                ExprParser.TermLastTerm { head, others, textAreaValue } ->
                    BeginWithNameEndExprTerm
                        { name = name
                        , type_ = Type.empty
                        , headTerm = ExprParser.takeTerm head
                        , opAndTermList = ExprParser.takeTermListOT others
                        , textAreaValue = textAreaValue
                        }

                ExprParser.TermLastOp { head, others, last, textAreaValue } ->
                    BeginWithNameEndExprOp
                        { name = name
                        , type_ = Type.empty
                        , headTerm = ExprParser.takeTerm head
                        , opAndTermList = ExprParser.takeTermListOT others
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
                        , headTerm = ExprParser.takeTerm head
                        , opAndTermList = ExprParser.takeTermListOT others
                        , textAreaValue = textAreaValue
                        }

                ExprParser.TermLastOp { head, others, last, textAreaValue } ->
                    BeginWithTypeEndExprOp
                        { type_ = type_
                        , headTerm = ExprParser.takeTerm head
                        , opAndTermList = ExprParser.takeTermListOT others
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
                { headTerm = ExprParser.takeTerm head
                , opAndTermList = ExprParser.takeTermListOT others
                , textAreaValue = textAreaValue
                }

        ExprParser.TermLastOp { head, others, last, textAreaValue } ->
            BeginWithExprHeadEndOp
                { headTerm = ExprParser.takeTerm head
                , opAndTermList = ExprParser.takeTermListOT others
                , lastOp = last
                , textAreaValue = textAreaValue
                }


{-| 演算子始まりとして解析
-}
beginWithExprOp : Int -> List SimpleChar -> BeginWithOpResult
beginWithExprOp parenthesisLevel list =
    case ExprParser.parseStartOp list of
        ExprParser.OpLastTerm { head, others, last, textAreaValue } ->
            BeginWithOpEndTerm
                { headOp = head
                , termAndOpList = ExprParser.takeTermListTO others
                , lastTerm = ExprParser.takeTerm last
                , textAreaValue = textAreaValue
                }

        ExprParser.OpLastOp { head, others, textAreaValue } ->
            BeginWithOpEndOp
                { headOp = head
                , termAndOpList = ExprParser.takeTermListTO others
                , textAreaValue = textAreaValue
                }


{-| 項始まりとして解析
-}
beginWithExprTerm : Int -> List SimpleChar -> BeginWithTermResult
beginWithExprTerm parenthesisLevel list =
    case ExprParser.parseStartTerm list of
        ExprParser.TermLastTerm { head, others, textAreaValue } ->
            BeginWithTermEndTerm
                { headTerm = ExprParser.takeTerm head
                , opAndTermList = ExprParser.takeTermListOT others
                , textAreaValue = textAreaValue
                }

        ExprParser.TermLastOp { head, others, last, textAreaValue } ->
            BeginWithTermEndOp
                { headTerm = ExprParser.takeTerm head
                , opAndTermList = ExprParser.takeTermListOT others
                , lastOp = last
                , textAreaValue = textAreaValue
                }
