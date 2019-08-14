module Project.ModuleDefinition.Module.TypeDef exposing (TypeDef, getName, getTagNum, make, toString, typeDefInt)

{-| 型の定義
-}

import Data.Label as L
import Project.ModuleDefinition.ModuleIndex as ModuleIndex


{-| 型の定義
-}
type TypeDef
    = TypeDef
        { name : L.Label
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
    | OneParameter ModuleIndex.TypeDefIndex


{-| 指定した名前の型定義をつくる
-}
make : L.Label -> TypeDef
make nameLabel =
    TypeDef
        { name = nameLabel
        , content = TagOrKernelTag []
        }


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


{-| デバッグ用。Intの型定義
-}
typeDefInt : TypeDef
typeDefInt =
    TypeDef
        { name = L.make L.hi [ L.on, L.ot, L.o3, L.o2 ]
        , content =
            TagOrKernelKernel I32
        }


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
