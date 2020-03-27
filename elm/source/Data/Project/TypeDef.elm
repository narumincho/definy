module Data.Project.TypeDef exposing
    ( TypeDef
    , from
    , getName
    , getTagNum
    , toString
    )

{-| 型の定義
-}

import Data
import Data.Label as L


{-| 型の定義
-}
type TypeDef
    = TypeDef
        { id : Data.TypeId
        , name : L.Label
        , content : TagOrKernel
        }


{-| 普通の列挙で定義するか、Kernelで定義するか
-}
type TagOrKernel
    = TagOrKernelTag (List Tag)
    | TagOrKernelKernel KernelType


{-| タグ、値構築子
-}
type Tag
    = Tag
        { name : L.Label
        , parameter : Parameter
        }


{-| 根底で定義された型
-}
type KernelType
    = I32


type Parameter
    = NoParameter
    | OneParameter Data.TypeId


from : { id : Data.TypeId, name : L.Label, content : TagOrKernel } -> TypeDef
from =
    TypeDef


{-| 型の名前を取得する
-}
getName : TypeDef -> L.Label
getName (TypeDef { name }) =
    name


{-| 型のタグの個数を取得する
Kernelだった場合は1を返す
-}
getTagNum : TypeDef -> Int
getTagNum (TypeDef { content }) =
    case content of
        TagOrKernelTag tagList ->
            List.length tagList

        TagOrKernelKernel _ ->
            1


{-| 文字列化。デバッグ用
-}
toString : TypeDef -> String
toString (TypeDef { name, content }) =
    L.toCapitalString name
        ++ "="
        ++ tagOrKernelToString content


tagOrKernelToString : TagOrKernel -> String
tagOrKernelToString tagOrKernel =
    case tagOrKernel of
        TagOrKernelTag list ->
            list |> List.map tagToString |> String.join "|"

        TagOrKernelKernel I32 ->
            "[Kernel::wasm::i32]"


tagToString : Tag -> String
tagToString (Tag { name, parameter }) =
    L.toCapitalString name
        ++ (case parameter of
                NoParameter ->
                    ""

                OneParameter _ ->
                    "パラメーター付き"
           )
