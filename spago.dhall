{ name = "my-project"
, dependencies =
  [ "aff"
  , "argonaut-core"
  , "arrays"
  , "assert"
  , "colors"
  , "console"
  , "effect"
  , "either"
  , "exceptions"
  , "foreign-object"
  , "functions"
  , "maybe"
  , "node-buffer"
  , "node-fs-aff"
  , "node-process"
  , "node-streams"
  , "nullable"
  , "option"
  , "ordered-collections"
  , "parallel"
  , "prelude"
  , "psci-support"
  , "record"
  , "strings"
  , "tuples"
  , "typelevel-lists"
  , "typelevel-prelude"
  , "uint"
  ]
, packages = ./packages.dhall
, sources = [ "src/**/*.purs" ]
}
