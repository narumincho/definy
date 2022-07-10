module VsCodeExtension.NoPositionTree
  ( NoPositionTree(..)
  , noPositionTreeEmptyChildren
  ) where

-- | 位置情報が含まれていないシンプルな木構造
newtype NoPositionTree
  = NoPositionTree
  { name :: String, children :: Array NoPositionTree }

noPositionTreeEmptyChildren :: String -> NoPositionTree
noPositionTreeEmptyChildren name = NoPositionTree { name, children: [] }
