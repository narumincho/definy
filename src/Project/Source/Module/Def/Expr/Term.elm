module Project.Source.Module.Def.Expr.Term exposing
    ( SafeTerm(..)
    , Term(..)
    , fromInt
    , fromMaybeLabel
    , integerToListCharBool
    , none
    , safeToString
    , toSafe
    , toString
    , toTextAreaValue
    )

import Project.Label as Label


type Term
    = IntLiteral Int
    | Ref Ref
    | None


type Ref
    = ValidRef Int
    | InvalidRef Label.Label


type SafeTerm
    = SIntLiteral Int
    | SRef Int


integerToListCharBool : Int -> List ( Char, Bool )
integerToListCharBool i =
    String.fromInt i
        |> String.toList
        |> List.map (\char -> ( char, True ))


none : Term
none =
    None


fromInt : Int -> Term
fromInt =
    IntLiteral


{-| ラベルから名前による参照の項をつくるが、 NothingならNoneという項を返す
-}
fromMaybeLabel : Maybe Label.Label -> Term
fromMaybeLabel mLabel =
    case mLabel of
        Just label ->
            Ref (InvalidRef label)

        Nothing ->
            None


toString : Term -> String
toString term =
    case term of
        IntLiteral i ->
            String.fromInt i

        Ref (ValidRef ref) ->
            "!(" ++ String.fromInt ref ++ ")"

        Ref (InvalidRef label) ->
            Label.toSmallString label

        None ->
            "✗"


safeToString : SafeTerm -> String
safeToString safeTerm =
    case safeTerm of
        SIntLiteral i ->
            String.fromInt i

        SRef ref ->
            "!(" ++ String.fromInt ref ++ ")"


toTextAreaValue : Term -> List ( Char, Bool )
toTextAreaValue term =
    case term of
        IntLiteral i ->
            String.fromInt i
                |> String.toList
                |> List.map (\c -> ( c, True ))

        _ ->
            []


toSafe : Term -> Maybe SafeTerm
toSafe term =
    case term of
        IntLiteral i ->
            Just (SIntLiteral i)

        Ref (ValidRef ref) ->
            Just (SRef ref)

        _ ->
            Nothing
