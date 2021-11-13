-- generated by definy. Do not edit!
module Definy.OriginAndVersion (nowMode, origin, version) where

import Data.String.NonEmpty as M0
import Definy.Version as M2
import ProductionOrDevelopment as M1
import Type.Proxy as M3

-- | 実行モード (ビルド時にコード生成される)
nowMode :: M1.ProductionOrDevelopment
nowMode = M1.Develpment

-- | オリジン (ビルド時にコード生成される)
origin :: M0.NonEmptyString
origin = (M0.nes) (M3.Proxy :: (M3.Proxy) ("http://localhost:2520"))

-- | バージョン名 (ビルド時にコード生成される)
version :: M2.Version
version = M2.Development
