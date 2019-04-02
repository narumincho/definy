module Project.Source.Module.TypeDef exposing (TypeDef, getName, typeDefInt)

{-| 型の定義
-}

import Project.Label as L
import Project.Source.ModuleIndex as ModuleIndex


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
    = Int


type Parameter
    = NoParameter
    | OneParameter ModuleIndex.TypeDefIndex


{-| 型の名前を取得する
-}
getName : TypeDef -> L.Label
getName (TypeDef { name }) =
    name


{-| デバッグ用。Intの型定義
-}
typeDefInt : TypeDef
typeDefInt =
    TypeDef
        { name = L.make L.hi [ L.on, L.ot, L.o3, L.o2 ]
        , content =
            TagOrKernelKernel Int
        }
