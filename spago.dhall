{ name = "my-project"
, dependencies =
  [ "aff"
  , "argonaut-core"
  , "arrays"
  , "assert"
  , "colors"
  , "console"
  , "effect"
  , "foreign-object"
  , "maybe"
  , "node-buffer"
  , "node-child-process"
  , "node-fs"
  , "node-http"
  , "node-streams"
  , "ordered-collections"
  , "prelude"
  , "psci-support"
  , "strings"
  , "tuples"
  , "uint"
  ]
, packages = ./packages.dhall
, sources = [ "src/**/*.purs" ]
}
