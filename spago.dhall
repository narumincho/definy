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
  , "foreign-object"
  , "maybe"
  , "node-buffer"
  , "node-child-process"
  , "node-fs-aff"
  , "node-http"
  , "node-path"
  , "node-streams"
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
