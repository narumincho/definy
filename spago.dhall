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
  , "maybe"
  , "node-buffer"
  , "node-fs-aff"
  , "node-process"
  , "node-streams"
  , "nullable"
  , "ordered-collections"
  , "parallel"
  , "prelude"
  , "psci-support"
  , "strings"
  , "tuples"
  , "uint"
  ]
, packages = ./packages.dhall
, sources = [ "src/**/*.purs" ]
}
