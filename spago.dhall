{ name = "my-project"
, dependencies =
  [ "arrays"
  , "colors"
  , "console"
  , "effect"
  , "maybe"
  , "node-buffer"
  , "node-http"
  , "node-streams"
  , "ordered-collections"
  , "prelude"
  , "psci-support"
  , "strings"
  , "tuples"
  ]
, packages = ./packages.dhall
, sources = [ "src/**/*.purs" ]
}
