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
  , "foreign"
  , "foreign-object"
  , "functions"
  , "maybe"
  , "node-buffer"
  , "node-fs-aff"
  , "node-http"
  , "node-process"
  , "node-streams"
  , "nullable"
  , "ordered-collections"
  , "parallel"
  , "posix-types"
  , "prelude"
  , "psci-support"
  , "strings"
  , "tuples"
  , "uint"
  , "unsafe-coerce"
  , "web-dom"
  , "web-html"
  ]
, packages = ./packages.dhall
, sources = [ "src/**/*.purs" ]
}
