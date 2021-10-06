{ name = "my-project"
, dependencies =
  [ "arrays"
  , "assert"
  , "colors"
  , "console"
  , "effect"
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
